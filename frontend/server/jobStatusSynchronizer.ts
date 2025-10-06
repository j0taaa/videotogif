import { fetchCciJobStatus, type ClusterJobStatus } from './cciClient';
import { createSignedUrl } from './obsClient';
import type { JobRecord } from './jobStore';
import { updateJob } from './jobStore';

const TERMINAL_STATUSES = new Set<JobRecord['status']>(['failed', 'completed']);

function buildFailureMessage(status: ClusterJobStatus): string | undefined {
  const parts = [status.reason, status.message].filter((part) => typeof part === 'string' && part.trim()) as string[];
  if (parts.length === 0) {
    return undefined;
  }

  const combined = parts.join(': ');
  return combined.length > 500 ? `${combined.slice(0, 497)}…` : combined;
}

export async function reconcileJobsWithCluster(jobs: JobRecord[]): Promise<void> {
  const candidates = jobs.filter((job) => job.cciJobName && !TERMINAL_STATUSES.has(job.status));
  if (candidates.length === 0) {
    return;
  }

  await Promise.all(
    candidates.map(async (job) => {
      const jobName = job.cciJobName!;
      try {
        const status = await fetchCciJobStatus(jobName);
        if (!status || status.phase === 'pending' || status.phase === 'running') {
          return;
        }

        const updates: Partial<JobRecord> = { status: status.phase };

        if (status.phase === 'failed') {
          const failureMessage = buildFailureMessage(status);
          if (failureMessage) {
            updates.errorMessage = failureMessage;
          }
        } else if (status.phase === 'completed' && !job.downloadUrl) {
          try {
            updates.downloadUrl = createSignedUrl(job.targetKey);
          } catch (error) {
            console.error('[jobStatusSynchronizer] Unable to generate signed OBS URL', {
              jobId: job.id,
              jobName,
              targetKey: job.targetKey,
              error,
            });
          }
        }

        updateJob(job.id, updates);
        console.log('[jobStatusSynchronizer] Job state reconciled with cluster', {
          jobId: job.id,
          jobName,
          resolvedPhase: status.phase,
          appliedErrorMessage: Boolean(updates.errorMessage),
          appliedDownloadUrl: Boolean(updates.downloadUrl),
        });
      } catch (error) {
        console.error('[jobStatusSynchronizer] Failed to synchronize job with cluster', {
          jobId: job.id,
          jobName,
          error,
        });
      }
    })
  );
}

