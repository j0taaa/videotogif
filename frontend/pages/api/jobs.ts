import { randomUUID } from 'crypto';
import { readFile, unlink } from 'fs/promises';
import formidable from 'formidable';
import type { NextApiRequest, NextApiResponse } from 'next';
import { persistJob, retrieveJobs, updateJob } from '../../server/jobStore';
import { dispatchConversionJob } from '../../server/jobDispatcher';
import { uploadBufferToObs } from '../../server/obsClient';

export const config = {
  api: {
    bodyParser: false,
  },
};

type JobsResponse = ReturnType<typeof retrieveJobs>;

async function parseForm(req: NextApiRequest) {
  const form = formidable({ multiples: false });

  return new Promise<{ filename: string; buffer: Buffer }>((resolve, reject) => {
    form.parse(req, (err, _fields, files) => {
      if (err) {
        reject(err);
        return;
      }

      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!file || !file.filepath || !file.originalFilename) {
        reject(new Error('File upload is required'));
        return;
      }

      if (!file.mimetype?.startsWith('video/')) {
        reject(new Error('Only video files are supported'));
        return;
      }

      readFile(file.filepath)
        .then(async (data) => {
          await unlink(file.filepath).catch(() => undefined);
          resolve({ filename: file.originalFilename!, buffer: data });
        })
        .catch(reject);
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JobsResponse | { message: string }>
) {
  if (req.method === 'GET') {
    const jobs = retrieveJobs();
    res.status(200).json(jobs);
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  let jobId: string | undefined;

  try {
    const { buffer, filename } = await parseForm(req);

    const timestamp = Date.now();
    const sourceKey = `${process.env.OBS_UPLOAD_PREFIX ?? 'uploads/'}${timestamp}-${filename}`;
    const targetKey = `${process.env.OBS_OUTPUT_PREFIX ?? 'gifs/'}${timestamp}-${filename.replace(/\.[^.]+$/, '')}.gif`;

    await uploadBufferToObs(buffer, sourceKey);

    jobId = randomUUID();

    persistJob({
      id: jobId,
      status: 'pending',
      sourceKey,
      targetKey,
      createdAt: timestamp,
    });

    await dispatchConversionJob({
      jobId,
      sourceKey,
      targetKey,
    });

    res.status(201).json(retrieveJobs());
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Unable to create conversion job';

    if (jobId) {
      try {
        updateJob(jobId, { status: 'failed', errorMessage: message });
      } catch (storeError) {
        console.error(storeError);
      }
    }

    res.status(500).json({ message });
  }
}
