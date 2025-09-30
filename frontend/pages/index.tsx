import { FormEvent, useEffect, useMemo, useState } from 'react';


interface ConversionJob {
  id: string;
  status: 'pending' | 'running' | 'failed' | 'completed';
  sourceKey: string;
  targetKey?: string;
  downloadUrl?: string;
  errorMessage?: string;
  cciJobName?: string;
  createdAt: number;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown';

  useEffect(() => {
    let isActive = true;

    const loadJobs = async () => {
      try {
        const response = await fetch('/api/jobs');
        if (!response.ok) {
          throw new Error('Unable to load jobs');
        }

        const payload = (await response.json()) as ConversionJob[];
        if (isActive) {
          setJobs(payload);
          setIsLoadingJobs(false);
        }
      } catch (error) {
        if (isActive) {
          console.error(error);
          setIsLoadingJobs(false);
        }
      }
    };

    loadJobs();
    const interval = setInterval(loadJobs, 3000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, []);

  const statusLabels = useMemo(
    () => ({
      pending: 'Queued',
      running: 'Processing',
      failed: 'Failed',
      completed: 'Completed',
    }),
    []
  );


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFile) {
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Unable to create conversion job');
      }

      const refreshedJobs = (await response.json()) as ConversionJob[];
      setJobs(refreshedJobs);
      setSelectedFile(null);
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create job');

    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page">
      <span className="version-badge">v{appVersion}</span>
      <div className="backdrop" aria-hidden />
      <main className="layout">
        <section className="hero">
          <span className="badge">Huawei Cloud Demo</span>
          <h1>
            Transform your videos
            <br />
            into vibrant GIFs
          </h1>
          <p>
            Drag in a clip, send it through our Huawei Cloud powered pipeline, and get a shareable
            looping GIF in moments.
          </p>
        </section>

        <section className="panel">
          <form onSubmit={handleSubmit} className="upload">
            <label className={`dropzone ${selectedFile ? 'has-file' : ''}`}>
              <input
                type="file"
                accept="video/*"
                onChange={(event) => {
                  const file = event.target.files?.item(0) ?? null;
                  setSelectedFile(file);
                }}
                required
              />
              <div className="dropzone-content">
                <strong>{selectedFile ? selectedFile.name : 'Choose or drop a video file'}</strong>
                <span>MP4, MOV, or WebM – max 100MB recommended</span>
              </div>
            </label>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Uploading…' : 'Start conversion'}
            </button>
          </form>
          {errorMessage && <p className="feedback error">{errorMessage}</p>}
          {!errorMessage && selectedFile && !isSubmitting && (
            <p className="feedback hint">Ready when you are – hit start to convert.</p>
          )}
        </section>

        <section className="panel jobs">
          <header>
            <h2>Recent activity</h2>
            <span>{isLoadingJobs ? 'Loading…' : `${jobs.length} job${jobs.length === 1 ? '' : 's'}`}</span>
          </header>
          {jobs.length === 0 && !isLoadingJobs ? (
            <div className="empty">
              <h3>No conversions yet</h3>
              <p>Upload your first video to see the pipeline in action.</p>
            </div>
          ) : (
            <ul>
              {jobs.map((job) => (
                <li key={job.id}>
                  <div className="job-header">
                    <strong title={job.sourceKey}>{job.sourceKey.split('/').pop()}</strong>
                    <span className={`status status-${job.status}`}>{statusLabels[job.status]}</span>
                  </div>
                  <p className="timestamp">
                    Submitted {new Date(job.createdAt).toLocaleString(undefined, { hour12: false })}
                  </p>
                  {job.errorMessage && <p className="error-message">{job.errorMessage}</p>}
                  {job.downloadUrl && (
                    <a className="download" href={job.downloadUrl} target="_blank" rel="noreferrer">
                      Download GIF
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <style jsx>{`
        .page {
          position: relative;
          min-height: 100vh;
          padding: 4rem 1.5rem 6rem;
          display: flex;
          justify-content: center;
          background-color: #050816;
          color: #f8fafc;
          font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          overflow: hidden;
        }

        .version-badge {
          position: absolute;
          top: 1.5rem;
          right: 1.5rem;
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(148, 163, 184, 0.3);
          font-size: 0.8rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .backdrop {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(120% 120% at 0% 0%, rgba(59, 130, 246, 0.35) 0%, transparent 55%),
            radial-gradient(100% 120% at 100% 0%, rgba(236, 72, 153, 0.3) 0%, transparent 55%),
            radial-gradient(100% 120% at 50% 100%, rgba(16, 185, 129, 0.25) 0%, transparent 60%),
            linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.7) 100%);
          filter: blur(0px);
        }

        .layout {
          position: relative;
          width: 100%;
          max-width: 960px;
          display: grid;
          gap: 2rem;
          z-index: 1;
        }

        .hero {
          text-align: left;
          display: grid;
          gap: 1rem;
          max-width: 640px;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          width: fit-content;
          padding: 0.4rem 0.85rem;
          border-radius: 999px;
          font-size: 0.85rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: linear-gradient(90deg, rgba(59, 130, 246, 0.35), rgba(236, 72, 153, 0.35));
          border: 1px solid rgba(148, 163, 184, 0.4);
          color: #cbd5f5;
        }

        h1 {
          font-size: clamp(2.8rem, 5vw, 3.6rem);
          line-height: 1.1;
          background: linear-gradient(135deg, #38bdf8 0%, #a855f7 50%, #f97316 100%);
          -webkit-background-clip: text;
          color: transparent;
          margin: 0;
        }

        .hero p {
          font-size: 1.1rem;
          color: rgba(226, 232, 240, 0.82);
          margin: 0;
        }

        .panel {
          position: relative;
          padding: 2rem;
          border-radius: 1.5rem;
          background: linear-gradient(135deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.75));
          border: 1px solid rgba(148, 163, 184, 0.2);
          box-shadow: 0 25px 70px rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(12px);
        }

        .upload {
          display: grid;
          gap: 1rem;
        }

        .dropzone {
          position: relative;
          display: grid;
          justify-items: center;
          gap: 0.35rem;
          padding: 2.5rem 1.5rem;
          border-radius: 1.25rem;
          border: 1.5px dashed rgba(148, 163, 184, 0.45);
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.6), rgba(30, 41, 59, 0.4));
          cursor: pointer;
          transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
        }

        .dropzone.has-file {
          border-color: rgba(96, 165, 250, 0.8);
          box-shadow: 0 10px 40px rgba(59, 130, 246, 0.25);
        }

        .dropzone:hover {
          border-color: rgba(148, 163, 184, 0.8);
          transform: translateY(-2px);
        }

        .dropzone input {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
        }

        .dropzone-content {
          text-align: center;
          display: grid;
          gap: 0.25rem;
        }

        .dropzone-content strong {
          font-size: 1.05rem;
        }

        .dropzone-content span {
          font-size: 0.9rem;
          color: rgba(148, 163, 184, 0.85);
        }

        button {
          justify-self: flex-start;
          padding: 0.85rem 1.75rem;
          border-radius: 999px;
          border: none;
          font-weight: 600;
          font-size: 1rem;
          color: #0f172a;
          background: linear-gradient(135deg, #60a5fa, #a855f7);
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.65;
          transform: none;
          box-shadow: none;
        }

        button:not(:disabled):hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 30px rgba(96, 165, 250, 0.35);
        }

        .feedback {
          margin: 0;
          font-size: 0.95rem;
        }

        .feedback.error {
          color: #fda4af;
        }

        .feedback.hint {
          color: rgba(148, 163, 184, 0.9);
        }

        .jobs header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 1.5rem;
        }

        .jobs header span {
          font-size: 0.95rem;
          color: rgba(148, 163, 184, 0.85);

        }

        .jobs ul {
          list-style: none;
          display: grid;
          gap: 1rem;
          padding: 0;
          margin: 0;
        }

        .jobs li {
          padding: 1.25rem;
          border-radius: 1rem;
          background: linear-gradient(120deg, rgba(30, 41, 59, 0.75), rgba(15, 23, 42, 0.85));
          border: 1px solid rgba(148, 163, 184, 0.18);
          display: grid;
          gap: 0.75rem;
        }

        .job-header {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
          flex-wrap: wrap;
        }

        .job-header strong {
          font-size: 1.05rem;
          color: #f8fafc;
        }

        .timestamp {
          margin: 0;
          font-size: 0.9rem;
          color: rgba(148, 163, 184, 0.85);
        }

        .status {
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-pending {
          color: #fcd34d;
          background: rgba(251, 191, 36, 0.1);
          border: 1px solid rgba(252, 211, 77, 0.4);
        }

        .status-running {
          color: #93c5fd;
          background: rgba(96, 165, 250, 0.1);
          border: 1px solid rgba(96, 165, 250, 0.4);
        }

        .status-completed {
          color: #6ee7b7;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(45, 212, 191, 0.45);
        }

        .status-failed {
          color: #fda4af;
          background: rgba(248, 113, 113, 0.12);
          border: 1px solid rgba(252, 165, 165, 0.4);
        }

        .error-message {
          margin: 0;
          font-size: 0.95rem;
          color: #fca5a5;
        }

        .download {
          justify-self: flex-start;
          font-weight: 600;
          color: #93c5fd;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
        }

        .download:hover {
          color: #bfdbfe;
        }

        .empty {
          display: grid;
          gap: 0.5rem;
          text-align: center;
          padding: 2rem;
          border-radius: 1rem;
          background: rgba(15, 23, 42, 0.55);
          border: 1px dashed rgba(148, 163, 184, 0.3);
        }

        .empty h3 {
          margin: 0;
          font-size: 1.2rem;
        }

        .empty p {
          margin: 0;
          color: rgba(148, 163, 184, 0.85);
        }

        @media (max-width: 640px) {
          .page {
            padding: 3rem 1rem 4rem;
          }

          .panel {
            padding: 1.5rem;
          }

          button {
            width: 100%;
            justify-self: stretch;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
