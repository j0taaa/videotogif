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

  console.log('[obsClient] Uploading buffer to OBS', {
    bucket,
    key,
    size: buffer.length,
  });

  await new Promise<void>((resolve, reject) => {
    client.putObject({
      Bucket: bucket,
      Key: key,
      Body: buffer,
    }, (error) => {
      if (error) {
        console.error('[obsClient] OBS upload failed', { key, error });
        reject(error);
      } else {
        console.log('[obsClient] OBS upload completed', { key });
        resolve();
      }
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
