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
  console.log('[api/jobs] Starting multipart form parsing');
  const form = formidable({ multiples: false });

  return new Promise<{ filename: string; buffer: Buffer }>((resolve, reject) => {
    form.parse(req, (err, _fields, files) => {
      if (err) {
        console.error('[api/jobs] Form parsing failed', err);
        reject(err);
        return;
      }

      const file = Array.isArray(files.file) ? files.file[0] : files.file;
      if (!file || !file.filepath || !file.originalFilename) {
        console.warn('[api/jobs] Form parsing finished without a usable file payload', {
          receivedFile: file ? { filepath: Boolean(file.filepath), originalFilename: file.originalFilename } : null,
        });
        reject(new Error('File upload is required'));
        return;
      }

      if (!file.mimetype?.startsWith('video/')) {
        console.warn('[api/jobs] Uploaded file rejected due to unsupported mimetype', {
          originalFilename: file.originalFilename,
          mimetype: file.mimetype,
        });
        reject(new Error('Only video files are supported'));
        return;
      }

      console.log('[api/jobs] Upload accepted, reading file from disk', {
        originalFilename: file.originalFilename,
        filepath: file.filepath,
        mimetype: file.mimetype,
        size: file.size,
      });

      readFile(file.filepath)
        .then(async (data) => {
          await unlink(file.filepath).catch(() => undefined);
          console.log('[api/jobs] File read completed, temporary file removed', {
            originalFilename: file.originalFilename,
            bytesRead: data.length,
          });
          resolve({ filename: file.originalFilename!, buffer: data });
        })
        .catch((readError) => {
          console.error('[api/jobs] Failed to read uploaded file', readError);
          reject(readError);
        });
    });
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<JobsResponse | { message: string }>
) {
  console.log('[api/jobs] Incoming request', {
    method: req.method,
    contentType: req.headers['content-type'],
  });
  if (req.method === 'GET') {
    const jobs = retrieveJobs();
    console.log('[api/jobs] Returning job list', { count: jobs.length });
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

    console.log('[api/jobs] Upload parsed successfully', {
      filename,
      timestamp,
      sourceKey,
      targetKey,
      bufferSize: buffer.length,
    });

    await uploadBufferToObs(buffer, sourceKey);

    console.log('[api/jobs] Upload stored in OBS', { sourceKey });

    jobId = randomUUID();

    persistJob({
      id: jobId,
      status: 'pending',
      sourceKey,
      targetKey,
      createdAt: timestamp,
    });

    console.log('[api/jobs] Job persisted locally', { jobId, status: 'pending' });

    await dispatchConversionJob({
      jobId,
      sourceKey,
      targetKey,
    });

    console.log('[api/jobs] Conversion job dispatched', { jobId, sourceKey, targetKey });

    res.status(201).json(retrieveJobs());
    console.log('[api/jobs] Response sent for job creation request', { jobId });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Unable to create conversion job';

    if (jobId) {
      try {
        updateJob(jobId, { status: 'failed', errorMessage: message });
        console.warn('[api/jobs] Job marked as failed after error', { jobId, message });
      } catch (storeError) {
        console.error(storeError);
      }
    }

    res.status(500).json({ message });
    console.error('[api/jobs] Job creation request failed', { jobId, message });
  }
}
