import hashlib
import json
import os
import subprocess
import tempfile
from pathlib import Path
from contextlib import suppress
from typing import Optional

from obs import ObsClient


def get_env(name: str, required: bool = True, default: Optional[str] = None) -> str:
    value = os.getenv(name, default)
    if required and not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value or ""


def download_object(client: ObsClient, bucket: str, key: str, path: str) -> None:
    resp = client.getObject(bucket, key, downloadPath=path)
    if resp.status >= 300:
        raise RuntimeError(f"Failed to download object {key}: {resp.errorMessage}")


def upload_object(client: ObsClient, bucket: str, key: str, path: str) -> None:
    resp = client.putFile(bucket, key, file_path=path)
    if resp.status >= 300:
        raise RuntimeError(f"Failed to upload object {key}: {resp.errorMessage}")


def create_signed_url(client: ObsClient, bucket: str, key: str, expires: int = 3600) -> str:
    resp = client.createSignedUrl("GET", bucket, key, expires=expires)
    return resp.signedUrl


def compute_sha256(path: str) -> str:
    sha256 = hashlib.sha256()
    with open(path, "rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            if not chunk:
                break
            sha256.update(chunk)
    return sha256.hexdigest()


def convert_to_gif(source: str, target: str) -> None:
    """Convert the video located at *source* into an animated GIF stored at *target*."""

    source_path = Path(source).resolve()
    target_path = Path(target).resolve()
    target_path.parent.mkdir(parents=True, exist_ok=True)

    gif_process = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(source_path),
            "-filter_complex",
            (
                "[0:v] fps=10,scale=480:-1:flags=lanczos,format=rgba,split [a][b];"
                "[a] palettegen=stats_mode=full [p];"
                "[b][p] paletteuse=dither=bayer:bayer_scale=5"
            ),
            "-loop",
            "0",
            str(target_path),
        ],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    if gif_process.returncode != 0:
        raise RuntimeError(
            f"ffmpeg gif conversion failed with code {gif_process.returncode}: {gif_process.stdout}"
        )


def notify_frontend(callback_url: Optional[str], payload: dict) -> None:
    if not callback_url:
        return

    import requests

    response = requests.post(callback_url, json=payload, timeout=10)
    if response.status_code >= 300:
        raise RuntimeError(f"Callback failed with status {response.status_code}: {response.text}")


def main() -> None:
    access_key = get_env("OBS_ACCESS_KEY_ID")
    secret_key = get_env("OBS_SECRET_ACCESS_KEY")
    endpoint = get_env("OBS_ENDPOINT")
    bucket = get_env("OBS_BUCKET_NAME")
    source_key = get_env("SOURCE_OBJECT_KEY")
    target_key = get_env("TARGET_OBJECT_KEY")
    job_id = get_env("JOB_ID")
    callback_url = os.getenv("CALLBACK_URL")

    client = ObsClient(access_key_id=access_key, secret_access_key=secret_key, server=endpoint)

    download_url: Optional[str] = None
    failure_notified = False

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            source_path = os.path.join(tmpdir, "source")
            target_path = os.path.join(tmpdir, "target.gif")

            download_object(client, bucket, source_key, source_path)

            download_size = Path(source_path).stat().st_size
            source_sha256_env = os.getenv("SOURCE_OBJECT_SHA256")

            if source_sha256_env:
                downloaded_sha256 = compute_sha256(source_path)
                if downloaded_sha256 != source_sha256_env:
                    raise RuntimeError(
                        "Downloaded object checksum mismatch. "
                        f"Expected {source_sha256_env}, got {downloaded_sha256}."
                    )

                print(
                    json.dumps(
                        {
                            "event": "source_checksum_verified",
                            "jobId": job_id,
                            "sourceKey": source_key,
                            "sha256": downloaded_sha256,
                            "size": download_size,
                        }
                    )
                )
            else:
                print(
                    json.dumps(
                        {
                            "event": "source_checksum_unavailable",
                            "jobId": job_id,
                            "sourceKey": source_key,
                            "size": download_size,
                        }
                    )
                )

            convert_to_gif(source_path, target_path)
            upload_object(client, bucket, target_key, target_path)

            download_url = create_signed_url(client, bucket, target_key)

        payload = {
            "jobId": job_id,
            "status": "completed",
            "downloadUrl": download_url,
            "targetKey": target_key,
        }

        try:
            notify_frontend(callback_url, payload)
        except Exception as error:  # noqa: BLE001
            error_payload = {
                "jobId": job_id,
                "status": "failed",
                "errorMessage": str(error),
            }
            if callback_url:
                with suppress(Exception):
                    notify_frontend(callback_url, error_payload)
                    failure_notified = True
            raise

        print(json.dumps(payload))
    except Exception as error:
        error_payload = {
            "jobId": job_id,
            "status": "failed",
            "errorMessage": str(error),
        }
        if callback_url and not failure_notified:
            with suppress(Exception):
                notify_frontend(callback_url, error_payload)
                failure_notified = True
        raise
    finally:
        with suppress(Exception):
            client.close()


if __name__ == "__main__":
    main()
