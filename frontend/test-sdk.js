const { createCciJob } = require('./server/cciClient');

async function main() {
  try {
    const result = await createCciJob({
      jobId: 'test-job-' + Date.now(),
      sourceKey: 'uploads/test.mp4',
      targetKey: 'gifs/test.gif',
      callbackUrl: 'http://localhost:3000/api/job-status',
    });
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();