process.env.PAAS_APP_NAME = 'frontend-deploy';
process.env.PAAS_NAMESPACE = 'default';
process.env.PAAS_PROJECT_ID = '9803447aabf141f495dfa6939e308f6e';
process.env.OBS_ENDPOINT = 'https://obs.sa-brazil-1.myhuaweicloud.com';
process.env.OBS_ACCESS_KEY_ID = 'HPUAN9Q5XBMYMCBIYJOB';
process.env.OBS_SECRET_ACCESS_KEY = 'zOPTPPsAT9DAMZaiJvlXJaZRv0FJUb4ZQuRrGFPz';
process.env.OBS_BUCKET_NAME = 'videotogif';
process.env.OBS_UPLOAD_PREFIX = 'uploads/';
process.env.OBS_OUTPUT_PREFIX = 'gifs/';
process.env.PUBLIC_BASE_URL = 'http://101.44.201.177/';
process.env.HUAWEI_CLOUD_AK = 'HPUAN9Q5XBMYMCBIYJOB';
process.env.HUAWEI_CLOUD_SK = 'zOPTPPsAT9DAMZaiJvlXJaZRv0FJUb4ZQuRrGFPz';
process.env.HUAWEI_CLOUD_PROJECT_ID = '9803447aabf141f495dfa6939e308f6e';
process.env.CCI_REGION = 'sa-brazil-1';
process.env.CCI_NAMESPACE = 'v2g';
process.env.CCI_JOB_IMAGE = 'swr.sa-brazil-1.myhuaweicloud.com/videotogif/videotogif-converter:latest';

const ObsClient = require('esdk-obs-nodejs');

async function testObs() {
  const client = new ObsClient({
    access_key_id: process.env.OBS_ACCESS_KEY_ID,
    secret_access_key: process.env.OBS_SECRET_ACCESS_KEY,
    server: process.env.OBS_ENDPOINT,
  });

  try {
    const result = await new Promise((resolve, reject) => {
      client.listObjects({
        Bucket: process.env.OBS_BUCKET_NAME,
        MaxKeys: 10,
      }, (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
    console.log('OBS test successful:', result.CommonMsg.Status);
    console.log('Objects:', result.InterfaceResult.Contents?.length || 0);
  } catch (error) {
    console.error('OBS test failed:', error.message);
  } finally {
    client.close();
  }
}

testObs();