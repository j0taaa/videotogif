# Video to GIF demo

This repository contains a sample application to demonstrate how Huawei Cloud's **Cloud Container Engine (CCE)** and **Cloud Container Instance (CCI)** can work together. Two container images are provided:

1. **Frontend (CCE)** – a Next.js application that receives video uploads, stores them in Object Storage (OBS), and dispatches conversion jobs to CCI.
2. **Converter job (CCI)** – a Python worker that downloads the uploaded video from OBS, converts it to GIF with `ffmpeg`, uploads the result back to OBS, and notifies the frontend once the conversion finishes.

## Repository structure

```text
frontend/   # Next.js application packaged for CCE
converter/  # Python + ffmpeg job image to run on CCI
```

## Frontend overview

The frontend exposes two API routes:

- `POST /api/jobs` accepts a video file upload, stores the video in OBS, records the request locally, and creates a one-off conversion Job in Huawei Cloud CCI using your AK/SK credentials.
- `POST /api/job-status` is used by the converter job to update the status of a conversion. On success it stores the generated download URL so it can be surfaced to the UI.

An in-memory store (`frontend/server/jobStore.ts`) keeps a short-lived history of jobs for demo purposes. For production deployments you should replace this with a persistent database.

### Environment variables

Configure the following variables when deploying the frontend image:

| Variable | Description |
| --- | --- |
| `OBS_ENDPOINT` | OBS endpoint (e.g. `https://obs.eu-west-101.myhuaweicloud.com`). |
| `OBS_ACCESS_KEY_ID` | Access key ID for OBS (can be the same AK used for other Huawei Cloud services). |
| `OBS_SECRET_ACCESS_KEY` | Secret access key for OBS (can be the same SK used for other Huawei Cloud services). |
| `OBS_BUCKET_NAME` | OBS bucket that stores uploads and generated GIFs. |
| `OBS_UPLOAD_PREFIX` | (Optional) Object key prefix for uploaded videos, defaults to `uploads/`. |
| `OBS_OUTPUT_PREFIX` | (Optional) Object key prefix for generated GIFs, defaults to `gifs/`. |
| `PUBLIC_BASE_URL` | Public URL of the frontend (used to build job callbacks). |
| `HUAWEI_CLOUD_AK` | Access key ID used to sign Huawei Cloud API requests. Falls back to `OBS_ACCESS_KEY_ID` when unset. |
| `HUAWEI_CLOUD_SK` | Secret access key used to sign Huawei Cloud API requests. Falls back to `OBS_SECRET_ACCESS_KEY` when unset. |
| `HUAWEI_CLOUD_PROJECT_ID` | Project ID where the CCI namespace resides. |
| `CCI_REGION` | Region of the CCI endpoint (for example `eu-west-101`). Set `CCI_API_ENDPOINT` instead if you use a custom domain. |
| `CCI_API_ENDPOINT` | (Optional) Override for the CCI API endpoint, e.g. `https://cci.eu-west-101.myhuaweicloud.com`. |
| `CCI_NAMESPACE` | CCI namespace that hosts the converter job. Defaults to `default`. |
| `CCI_JOB_IMAGE` | Full SWR image reference of the converter container. |
| `CCI_JOB_CPU` | (Optional) CPU request/limit for the job container. Defaults to `1`. |
| `CCI_JOB_MEMORY` | (Optional) Memory request/limit for the job container. Defaults to `2Gi`. |
| `CCI_JOB_BACKOFF_LIMIT` | (Optional) Number of retries before the Job is marked failed. Defaults to `0`. |
| `CCI_JOB_TTL_SECONDS` | (Optional) Seconds to keep the Job after completion. If unset, Jobs persist until cleaned up. |
| `CCI_JOB_IMAGE_PULL_POLICY` | (Optional) Image pull policy for the converter container. Defaults to `Always`. |
| `CCI_IMAGE_PULL_SECRET` | (Optional) Name of an imagePullSecret to attach to the Job template when pulling from a private SWR repo. |
| `CCI_SERVICE_ACCOUNT_NAME` | (Optional) Service account name to run the Job with. |
| `CCI_ADDITIONAL_ENV_VARS` | (Optional) Comma-separated list of additional environment variable names to forward into the job container. |

## Converter job overview

The converter image is a minimal Python application that runs the following steps:

1. Download the original video from OBS using the provided key.
2. Run `ffmpeg` to convert the video into an animated GIF.
3. Upload the GIF to OBS and create a time-limited signed URL.
4. POST the job result to the callback URL supplied by the frontend.

### Required environment variables

| Variable | Description |
| --- | --- |
| `OBS_ENDPOINT` | OBS endpoint used by the job container. |
| `OBS_ACCESS_KEY_ID` | Access key ID for OBS. |
| `OBS_SECRET_ACCESS_KEY` | Secret access key for OBS. |
| `OBS_BUCKET_NAME` | OBS bucket containing inputs and outputs. |
| `SOURCE_OBJECT_KEY` | Object key of the uploaded source video. |
| `TARGET_OBJECT_KEY` | Object key where the GIF should be stored. |
| `JOB_ID` | Identifier of the job (passed back to the frontend). |
| `CALLBACK_URL` | URL in the frontend that will receive job status updates. |

## Building the images

```bash
# Frontend (Next.js)
cd frontend
npm install
npm run build
docker build -t videotogif-frontend:latest .

# Converter job (Python + ffmpeg)
cd ../converter
pip install -r requirements.txt
python main.py  # Runs locally with the required environment variables set
docker build -t videotogif-converter:latest .
```

When running locally, export the necessary OBS credentials and object keys before invoking the scripts.

## Local development

- Run `npm install` followed by `npm run dev` inside the `frontend/` directory to start the Next.js development server.
- The frontend uses an in-memory job store. Restarting the server clears all recorded jobs.
- The converter job can be executed locally by setting the required environment variables (for example using a `.env` file) and running `python main.py`.

## Deployment notes

- Deploy the `frontend` image on Huawei Cloud CCE and expose it through an ingress controller.
- Use the `converter` image as the container template for Huawei Cloud CCI jobs. The Next.js backend now calls the CCI API directly, so ensure the configured AK/SK has permissions to create Jobs in the selected namespace.
- For observability, ensure logs from both containers are collected. The converter prints a JSON summary of the conversion result to stdout.

This demo intentionally keeps the architecture simple so it can be adapted to different pipelines or integrated with additional Huawei Cloud services.
