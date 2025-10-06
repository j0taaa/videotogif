export type JobRecord = {
  id: string;
  status: 'pending' | 'running' | 'failed' | 'completed';
  sourceKey: string;
  targetKey: string;
  sourceSha256?: string;
  downloadUrl?: string;
  errorMessage?: string;
  cciJobName?: string;
  createdAt: number;
};

const jobs = new Map<string, JobRecord>();

export function persistJob(job: Omit<JobRecord, 'createdAt'> & { createdAt?: number }) {
  const record: JobRecord = {
    ...job,
    createdAt: job.createdAt ?? Date.now(),
  };

  jobs.set(record.id, record);
  console.log('[jobStore] Persisted job', {
    jobId: record.id,
    status: record.status,
    sourceKey: record.sourceKey,
    targetKey: record.targetKey,
    hasSourceSha256: Boolean(record.sourceSha256),
    createdAt: record.createdAt,
  });
}

export function updateJob(jobId: string, updates: Partial<JobRecord>) {
  const current = jobs.get(jobId);
  if (!current) {
    console.warn('[jobStore] Attempted to update unknown job', { jobId, updates });
    throw new Error(`Job ${jobId} not found`);
  }

  const next: JobRecord = {
    ...current,
    ...updates,
  };

  jobs.set(jobId, next);
  console.log('[jobStore] Updated job', {
    jobId: next.id,
    previousStatus: current.status,
    nextStatus: next.status,
    hasDownloadUrl: Boolean(next.downloadUrl),
    hasErrorMessage: Boolean(next.errorMessage),
  });
}

export function retrieveJobs(): JobRecord[] {
  const sorted = Array.from(jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
  console.log('[jobStore] Retrieved job collection', { count: sorted.length });
  return sorted;
}
