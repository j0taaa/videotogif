import { FormEvent, useState } from 'react';
import useSWR from 'swr';

interface ConversionJob {
  id: string;
  status: 'pending' | 'running' | 'failed' | 'completed';
  sourceKey: string;
  targetKey?: string;
  downloadUrl?: string;
  errorMessage?: string;
  createdAt: number;
}

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch job state');
  }
  return response.json() as Promise<ConversionJob[]>;
};

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: jobs, mutate } = useSWR<ConversionJob[]>('/api/jobs', fetcher, {
    refreshInterval: 3000,
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Unable to create conversion job');
      }

      await mutate();
      setSelectedFile(null);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Unable to create job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container">
      <main>
        <h1>Video to GIF</h1>
        <p>Upload a video and we will convert it into a shareable GIF.</p>

        <form onSubmit={handleSubmit}>
          <label className="file-input">
            <input
              type="file"
              accept="video/*"
              onChange={(event) => {
                const file = event.target.files?.item(0) ?? null;
                setSelectedFile(file);
              }}
              required
            />
          </label>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Uploading…' : 'Create conversion job'}
          </button>
        </form>

        <section className="jobs">
          <h2>Recent jobs</h2>
          {!jobs?.length && <p>No jobs yet. Upload a video to get started!</p>}
          <ul>
            {jobs?.map((job) => (
              <li key={job.id}>
                <div>
                  <strong>{job.sourceKey}</strong>
                  <p>Submitted: {new Date(job.createdAt).toLocaleString()}</p>
                  <p>Status: {job.status}</p>
                  {job.errorMessage && <p className="error">Error: {job.errorMessage}</p>}
                  {job.downloadUrl && (
                    <p>
                      <a href={job.downloadUrl} target="_blank" rel="noreferrer">
                        Download GIF
                      </a>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <style jsx>{`
        .container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 2rem;
          background: linear-gradient(180deg, #111827 0%, #1f2937 100%);
          color: #f9fafb;
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        main {
          width: 100%;
          max-width: 720px;
        }

        h1 {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }

        p {
          font-size: 1.1rem;
          line-height: 1.6;
        }

        form {
          margin: 2rem 0;
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .file-input {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          border: 2px dashed rgba(255, 255, 255, 0.2);
          border-radius: 0.75rem;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease;
        }

        .file-input:hover {
          border-color: rgba(255, 255, 255, 0.4);
          background: rgba(255, 255, 255, 0.04);
        }

        .file-input input {
          width: 100%;
        }

        button {
          padding: 0.75rem 1.5rem;
          background: #2563eb;
          border: none;
          border-radius: 0.75rem;
          color: #f9fafb;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        button:not(:disabled):hover {
          background: #1d4ed8;
        }

        .jobs ul {
          list-style: none;
          padding: 0;
          display: grid;
          gap: 1rem;
        }

        .jobs li {
          padding: 1rem;
          background: rgba(17, 24, 39, 0.8);
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .error {
          color: #f87171;
        }
      `}</style>
    </div>
  );
}
