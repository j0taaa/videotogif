import type { NextApiRequest, NextApiResponse } from 'next';
import { updateJob } from '../../server/jobStore';
import { createSignedUrl } from '../../server/obsClient';

type JobStatus = 'pending' | 'running' | 'failed' | 'completed';

function isValidStatus(status: unknown): status is JobStatus {
  return status === 'pending' || status === 'running' || status === 'failed' || status === 'completed';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<{ message: string }>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  let { jobId, status, downloadUrl, errorMessage, targetKey } = req.body ?? {};

  if (typeof jobId !== 'string' || !isValidStatus(status)) {
    res.status(400).json({ message: 'jobId and a valid status are required' });
    return;
  }

  if (status === 'completed' && !downloadUrl && typeof targetKey === 'string') {
    try {
      downloadUrl = createSignedUrl(targetKey);
    } catch (error) {
      console.error(error);
    }
  }

  try {
    updateJob(jobId, {
      status,
      downloadUrl,
      errorMessage,
    });

    res.status(200).json({ message: 'Job updated' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Unable to update job' });
  }
}
