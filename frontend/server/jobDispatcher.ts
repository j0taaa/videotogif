import { createCciJob, isMissingConfiguration } from './cciClient';
import { updateJob } from './jobStore';

type DispatchOptions = {
  jobId: string;
  sourceKey: string;
  targetKey: string;
};

const CALLBACK_PATH = '/api/job-status';

export async function dispatchConversionJob(options: DispatchOptions) {
  const callbackUrl = new URL(CALLBACK_PATH, process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000').toString();

  try {
    const result = await createCciJob({
      jobId: options.jobId,
      sourceKey: options.sourceKey,
      targetKey: options.targetKey,
      callbackUrl,
    });

    updateJob(options.jobId, { status: 'running', cciJobName: result.jobName });
  } catch (error) {
    if (isMissingConfiguration(error)) {
      throw new Error(`CCI job creation failed due to missing configuration: ${error.message}`);
    }

    throw error instanceof Error ? error : new Error('Failed to create CCI job');
  }
}
