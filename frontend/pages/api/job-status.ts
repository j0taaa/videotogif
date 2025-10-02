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

    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return candidate.toString();
    }
  }

  return null;
}

function normalizeStatus(value: unknown): JobStatus | null {
  if (value && typeof value === 'object') {
    const nested = value as Record<string, unknown>;
    const nestedCandidates = [nested['status'], nested['state'], nested['phase']];

    for (const candidate of nestedCandidates) {
      const resolved = normalizeStatus(candidate);
      if (resolved) {
        return resolved;
      }
    }

    return null;
  }

  if (typeof value !== 'string') {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return normalizeStatus(value.toString());
    }
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const collapsed = normalized.replace(/[^a-z]/g, '');

  const mapping: Record<string, JobStatus> = {
    pending: 'pending',
    queue: 'pending',
    queued: 'pending',
    waiting: 'pending',
    accepted: 'pending',
    scheduling: 'pending',
    initializing: 'running',
    starting: 'running',
    started: 'running',
    running: 'running',
    processing: 'running',
    inprogress: 'running',
    executing: 'running',
    active: 'running',
    jobrunning: 'running',
    jobstarted: 'running',
    failed: 'failed',
    failure: 'failed',
    error: 'failed',
    errored: 'failed',
    jobfailed: 'failed',
    joberror: 'failed',
    timeout: 'failed',
    timedout: 'failed',
    cancelled: 'failed',
    canceled: 'failed',
    aborted: 'failed',
    completed: 'completed',
    complete: 'completed',
    succeeded: 'completed',
    success: 'completed',
    done: 'completed',
    finished: 'completed',
    jobsucceeded: 'completed',
    jobsuccess: 'completed',
    jobcompleted: 'completed',
    jobfinished: 'completed',
  };

  return mapping[collapsed] ?? mapping[normalized] ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<{ message: string }>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const body = coerceBody(req.body);
  console.log('[api/job-status] Received callback payload', {
    method: req.method,
    hasBody: Boolean(req.body),
    rawBodyType: typeof req.body,
    normalizedKeys: Object.keys(body),
  });
  const jobId = extractJobId(body);

  const statusCandidates: unknown[] = [
    body['status'],
    body['state'],
    body['jobStatus'],
    body['job_status'],
    body['jobState'],
    body['job_state'],
    body['phase'],
  ];

  const jobPayload = body['job'];
  if (jobPayload && typeof jobPayload === 'object') {
    const jobBody = jobPayload as Record<string, unknown>;
    statusCandidates.push(
      jobBody['status'],
      jobBody['state'],
      jobBody['jobStatus'],
      jobBody['job_status'],
      jobBody['phase']
    );
  }

  const status = statusCandidates.reduce<JobStatus | null>((resolved, candidate) => {
    if (resolved) {
      return resolved;
    }

    return normalizeStatus(candidate);
  }, null);
  console.log('[api/job-status] Derived job identifiers', {
    jobId,
    statusCandidatesCount: statusCandidates.length,
    resolvedStatus: status,
  });
  let { downloadUrl, errorMessage, targetKey } = body as {
    downloadUrl?: unknown;
    errorMessage?: unknown;
    targetKey?: unknown;
  };

  if (!jobId || !status) {
    console.warn('[api/job-status] Rejecting callback due to missing identifiers', {
      jobIdPresent: Boolean(jobId),
      statusResolved: Boolean(status),
      receivedKeys: Object.keys(body),
    });
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
      console.log('[api/job-status] Generated signed download URL for completed job', {
        jobId,
        targetKey: targetKeyString,
      });
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

    console.log('[api/job-status] Job updated successfully', {
      jobId,
      status,
      hasDownloadUrl: Boolean(resolvedDownloadUrl),
      hasErrorMessage: Boolean(errorMessageString),
    });

    res.status(200).json({ message: 'Job updated' });
  } catch (error) {
    console.error(error);
    console.error('[api/job-status] Failed to update job store', {
      jobId,
      status,
      error,
    });
    res.status(500).json({ message: 'Unable to update job' });
  }
}
