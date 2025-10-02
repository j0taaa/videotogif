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

const WRAPPER_KEYS = new Set([
  'body',
  'data',
  'detail',
  'event',
  'message',
  'payload',
  'record',
  'records',
  'request',
  'response',
  'result',
]);

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z]/g, '');
}

type TraversalContext = {
  normalizedKey: string;
  rawKey: string;
  value: unknown;
  path: string[];
  parentPath: string[];
};

type TraversalResult = {
  match?: boolean;
  recurse?: boolean;
};

function traverseMatches(
  source: unknown,
  predicate: (context: TraversalContext) => TraversalResult | void
): unknown[] {
  const matches: unknown[] = [];
  const queue: Array<{ value: unknown; path: string[] }> = [{ value: source, path: [] }];
  const seen = new Set<unknown>();

  while (queue.length) {
    const node = queue.shift();
    if (!node) {
      continue;
    }

    const { value, path } = node;
    if (!value || typeof value !== 'object') {
      continue;
    }

    if (seen.has(value)) {
      continue;
    }

    seen.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        queue.push({ value: item, path });
      }
      continue;
    }

    for (const [rawKey, child] of Object.entries(value as Record<string, unknown>)) {
      const normalizedKey = normalizeKey(rawKey);
      const context: TraversalContext = {
        normalizedKey,
        rawKey,
        value: child,
        path: [...path, normalizedKey],
        parentPath: path,
      };
      const result = predicate(context) ?? {};
      if (result.match) {
        matches.push(child);
      }

      const shouldRecurse = result.recurse ?? true;
      if (shouldRecurse && child && typeof child === 'object') {
        queue.push({ value: child, path: context.path });
      }
    }
  }

  return matches;
}

function extractJobId(body: Record<string, unknown>): string | null {
  const jobIdKeys = new Set(['jobid', 'jobidentifier', 'jobkey', 'jobguid']);
  const jobContextKeys = new Set([
    'job',
    'jobdata',
    'jobdetails',
    'jobinfo',
    'jobpayload',
    'jobrequest',
    'jobresponse',
  ]);

  const candidates = traverseMatches(body, ({ normalizedKey, value, parentPath }) => {
    if (jobIdKeys.has(normalizedKey)) {
      return { match: true };
    }

    if (normalizedKey === 'id') {
      if (parentPath.length === 0 || parentPath.some((segment) => jobContextKeys.has(segment) || segment.includes('job'))) {
        return { match: true };
      }
    }

    if (WRAPPER_KEYS.has(normalizedKey) || jobContextKeys.has(normalizedKey)) {
      return { recurse: true };
    }

    return {};
  });

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
    successful: 'completed',
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
  const jobId = extractJobId(body);

  const statusKeys = new Set([
    'status',
    'state',
    'phase',
    'jobstatus',
    'jobstate',
    'jobphase',
    'statuscode',
    'statusname',
    'jobresult',
    'resultstatus',
    'resultstate',
    'joboutcome',
    'outcome',
  ]);

  const statusCandidates = traverseMatches(body, ({ normalizedKey }) => {
    if (statusKeys.has(normalizedKey)) {
      return { match: true };
    }

    if (WRAPPER_KEYS.has(normalizedKey) || normalizedKey.includes('job')) {
      return { recurse: true };
    }

    return {};
  });

  const status = statusCandidates.reduce<JobStatus | null>((resolved, candidate) => {
    if (resolved) {
      return resolved;
    }

    return normalizeStatus(candidate);
  }, null);
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
