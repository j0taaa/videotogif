import { createHash } from 'crypto';
import { Readable } from 'stream';
import ObsClient from 'esdk-obs-nodejs';

let cachedClient: ObsClient | null = null;

function getObsClient() {
  if (cachedClient) {
    console.log('[obsClient] Reusing cached OBS client instance');
    return cachedClient;
  }

  const accessKeyId = process.env.OBS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.OBS_SECRET_ACCESS_KEY;
  const server = process.env.OBS_ENDPOINT;
  const bucket = process.env.OBS_BUCKET_NAME;

  if (!accessKeyId || !secretAccessKey || !server || !bucket) {
    throw new Error('OBS credentials are not fully configured');
  }

  console.log('[obsClient] Initializing new OBS client', {
    hasAccessKey: Boolean(accessKeyId),
    hasSecretAccessKey: Boolean(secretAccessKey),
    server,
    bucket,
  });

  cachedClient = new ObsClient({
    access_key_id: accessKeyId,
    secret_access_key: secretAccessKey,
    server,
  });

  return cachedClient;
}

export async function uploadBufferToObs(buffer: Buffer, key: string) {
  const client = getObsClient();
  const bucket = process.env.OBS_BUCKET_NAME!;

  const md5Digest = createHash('md5').update(buffer).digest();
  const contentMd5Base64 = md5Digest.toString('base64');
  const contentMd5Hex = md5Digest.toString('hex');

  console.log('[obsClient] Uploading buffer to OBS', {
    bucket,
    key,
    size: buffer.length,
    contentMd5Base64,
  });

  await new Promise<void>((resolve, reject) => {
    const bodyStream = Readable.from(buffer);
    client.putObject({
      Bucket: bucket,
      Key: key,
      Body: bodyStream,
      ContentMD5: contentMd5Base64,
    }, (error, result) => {
      if (error) {
        console.error('[obsClient] OBS upload failed', { key, error });
        reject(error);
        return;
      }

      const status = (result as any)?.CommonMsg?.Status;
      if (typeof status === 'number' && status >= 300) {
        console.error('[obsClient] OBS upload returned error status', { key, status });
        reject(new Error(`OBS upload failed with status ${status}`));
        return;
      }

      const headers = (result as any)?.CommonMsg?.Headers ?? {};
      const etagHeader =
        (headers.etag ?? headers.ETag ?? headers.Etag ?? headers['x-obs-meta-etag']) ?? undefined;
      const etag = Array.isArray(etagHeader) ? etagHeader[0] : etagHeader;
      const normalizedEtag = typeof etag === 'string' ? etag.replace(/^"|"$/g, '').toLowerCase() : undefined;

      if (normalizedEtag && normalizedEtag !== contentMd5Hex) {
        console.error('[obsClient] OBS upload reported unexpected ETag checksum', {
          key,
          normalizedEtag,
          expectedMd5Hex: contentMd5Hex,
        });
        reject(new Error('OBS reported a checksum mismatch for uploaded object.'));
        return;
      }

      console.log('[obsClient] OBS upload completed', { key, status, etag: normalizedEtag });
      resolve();
    });
  });
}

export function createSignedUrl(key: string, expiresInSeconds = 3600) {
  const client = getObsClient();
  const bucket = process.env.OBS_BUCKET_NAME!;

  console.log('[obsClient] Creating signed URL for object', {
    bucket,
    key,
    expiresInSeconds,
  });

  return client.createSignedUrlSync({
    Method: 'GET',
    Bucket: bucket,
    Key: key,
    Expires: expiresInSeconds,
  }).SignedUrl;
}
