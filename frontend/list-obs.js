const ObsClient = require('esdk-obs-nodejs');

async function main() {
  const accessKeyId = process.env.OBS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.OBS_SECRET_ACCESS_KEY;
  const server = process.env.OBS_ENDPOINT;
  const bucket = process.env.OBS_BUCKET_NAME;

  const client = new ObsClient({
    access_key_id: accessKeyId,
    secret_access_key: secretAccessKey,
    server,
  });

  const resp = await new Promise((resolve, reject) => {
    client.listObjects({
      Bucket: bucket,
    }, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });

  if (resp.Status >= 300) {
    console.error('Failed to list:', resp.Message);
    return;
  }

  console.log('Objects in bucket:');
  resp.Contents.forEach(obj => console.log(obj.Key, obj.Size));

  client.close();
}

main().catch(console.error);