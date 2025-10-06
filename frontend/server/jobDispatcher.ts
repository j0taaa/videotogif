import { createCciJob, isMissingConfiguration } from './cciClient';
import { updateJob } from './jobStore';

type DispatchOptions = {
  jobId: string;
  sourceKey: string;
  targetKey: string;
  sourceSha256?: string;
};

const CALLBACK_PATH = '/api/job-status';

export async function dispatchConversionJob(options: DispatchOptions) {
  const callbackUrl = new URL(CALLBACK_PATH, process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000').toString();

  console.log('[jobDispatcher] Preparing to dispatch job', {
    jobId: options.jobId,
    sourceKey: options.sourceKey,
    targetKey: options.targetKey,
    callbackUrl,
    hasSourceSha256: Boolean(options.sourceSha256),
    publicBaseUrlConfigured: Boolean(process.env.PUBLIC_BASE_URL),
  });

  try {
    const result = await createCciJob({
      jobId: options.jobId,
      sourceKey: options.sourceKey,
      targetKey: options.targetKey,
      sourceSha256: options.sourceSha256,
      callbackUrl,
    });

    console.log('[jobDispatcher] CCI job creation succeeded', {
      jobId: options.jobId,
      cciJobName: result.jobName,
    });

    updateJob(options.jobId, { status: 'running', cciJobName: result.jobName });
    console.log('[jobDispatcher] Job status updated to running', {
      jobId: options.jobId,
      cciJobName: result.jobName,
    });
  } catch (error) {
    if (isMissingConfiguration(error)) {
      console.error('[jobDispatcher] Missing configuration detected while creating CCI job', {
        jobId: options.jobId,
        message: error.message,
      });
      throw new Error(`CCI job creation failed due to missing configuration: ${error.message}`);
    }

    console.error('[jobDispatcher] Unexpected error while creating CCI job', {
      jobId: options.jobId,
      error,
    });
    throw error instanceof Error ? error : new Error('Failed to create CCI job');
  }
}
