export type JobRecord = {
  id: string;
  status: 'pending' | 'running' | 'failed' | 'completed';
  sourceKey: string;
  targetKey: string;
  downloadUrl?: string;
  errorMessage?: string;
  createdAt: number;
};

const jobs = new Map<string, JobRecord>();

export function persistJob(job: Omit<JobRecord, 'createdAt'> & { createdAt?: number }) {
  const record: JobRecord = {
    ...job,
    createdAt: job.createdAt ?? Date.now(),
  };

  jobs.set(record.id, record);
}

export function updateJob(jobId: string, updates: Partial<JobRecord>) {
  const current = jobs.get(jobId);
  if (!current) {
    throw new Error(`Job ${jobId} not found`);
  }

  const next: JobRecord = {
    ...current,
    ...updates,
  };

  jobs.set(jobId, next);
}

export function retrieveJobs(): JobRecord[] {
  return Array.from(jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
}
