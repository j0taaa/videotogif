const fs = require('fs');
const ObsClient = require('esdk-obs-nodejs');

async function main() {
  const accessKeyId = process.env.OBS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.OBS_SECRET_ACCESS_KEY;
  const server = process.env.OBS_ENDPOINT;
  const bucket = process.env.OBS_BUCKET_NAME;

  if (!accessKeyId || !secretAccessKey || !server || !bucket) {
    throw new Error('OBS credentials are not fully configured');
  }

  const client = new ObsClient({
    access_key_id: accessKeyId,
    secret_access_key: secretAccessKey,
    server,
  });

  const buffer = fs.readFileSync('/home/videotogif/test.mp4');

  await new Promise((resolve, reject) => {
    client.putObject({
      Bucket: bucket,
      Key: 'uploads/test.mp4',
      Body: buffer,
    }, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });

  console.log('Uploaded test.mp4 to OBS');
  client.close();
}

main().catch(console.error);