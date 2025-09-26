import { updateJob } from './jobStore';

type DispatchOptions = {
  jobId: string;
  sourceKey: string;
  targetKey: string;
};

const CALLBACK_PATH = '/api/job-status';

export async function dispatchConversionJob(options: DispatchOptions) {
  const endpoint = process.env.CCI_JOB_WEBHOOK;
  if (!endpoint) {
    throw new Error('CCI_JOB_WEBHOOK environment variable is not configured');
  }

  const payload = {
    jobId: options.jobId,
    sourceKey: options.sourceKey,
    targetKey: options.targetKey,
    callbackUrl: new URL(CALLBACK_PATH, process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000').toString(),
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const authToken = process.env.CCI_JOB_WEBHOOK_TOKEN;
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to dispatch job: ${message}`);
  }

  updateJob(options.jobId, { status: 'running' });
}
