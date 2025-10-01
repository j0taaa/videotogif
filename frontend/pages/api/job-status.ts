import type { NextApiRequest, NextApiResponse } from 'next';
import { updateJob } from '../../server/jobStore';
import { createSignedUrl } from '../../server/obsClient';

type JobStatus = 'pending' | 'running' | 'failed' | 'completed';

function coerceBody(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === 'object') {
    return payload as Record<string, unknown>;
  }

  if (typeof payload === 'string') {
    try {
      const parsed = JSON.parse(payload);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch (error) {
      console.error('Unable to parse job status payload', error);
    }
  }

  return {};
}

function extractJobId(body: Record<string, unknown>): string | null {
  const candidates = [
    body['jobId'],
    body['jobID'],
    body['job_id'],
    body['id'],
    (body['job'] as Record<string, unknown> | undefined)?.id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }

  return null;
}

function normalizeStatus(value: unknown): JobStatus | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  const mapping: Record<string, JobStatus> = {
    pending: 'pending',
    queued: 'pending',
    queue: 'pending',
    running: 'running',
    processing: 'running',
    in_progress: 'running',
    'in-progress': 'running',
    failed: 'failed',
    failure: 'failed',
    error: 'failed',
    completed: 'completed',
    complete: 'completed',
    succeeded: 'completed',
    success: 'completed',
  };

  return mapping[normalized] ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<{ message: string }>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const body = coerceBody(req.body);
  const jobId = extractJobId(body);
  const status = normalizeStatus(
    body['status'] ?? body['state'] ?? body['jobStatus'] ?? (body['job'] as Record<string, unknown> | undefined)?.status
  );
  let { downloadUrl, errorMessage, targetKey } = body as {
    downloadUrl?: unknown;
    errorMessage?: unknown;
    targetKey?: unknown;
  };

  if (!jobId || !status) {
    res.status(400).json({ message: 'jobId and a valid status are required' });
    return;
  }

  const downloadUrlString = typeof downloadUrl === 'string' ? downloadUrl : undefined;
  const errorMessageString = typeof errorMessage === 'string' ? errorMessage : undefined;
  const targetKeyString = typeof targetKey === 'string' ? targetKey : undefined;

  let resolvedDownloadUrl = downloadUrlString;

  if (status === 'completed' && !resolvedDownloadUrl && targetKeyString) {
    try {
      resolvedDownloadUrl = createSignedUrl(targetKeyString);
    } catch (error) {
      console.error(error);
    }
  }

  try {
    updateJob(jobId, {
      status,
      downloadUrl: resolvedDownloadUrl,
      errorMessage: errorMessageString,
    });

    res.status(200).json({ message: 'Job updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to update job' });
  }
}
