'use client';

import { useState } from 'react';
import UploadForm from '@/components/UploadForm';
import ResultsView from '@/components/ResultsView';
import { AnalysisOutput } from '@/lib/types';

interface AnalysisResponse extends AnalysisOutput {
  keyframe_previews?: string[];
  motion_profile_detail?: { frame: number; displacement: number; isHold: boolean }[];
}

export default function Home() {
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  async function handleAnalyze(file: File, exerciseType: string) {
    setLoading(true);
    setError(null);
    setResult(null);

    const blobUrl = URL.createObjectURL(file);
    setVideoUrl(blobUrl);

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('exercise_type', exerciseType);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }

      setResult(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      const isConnectionError =
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('Network request failed') ||
        msg.toLowerCase().includes('connection') ||
        msg.includes('ERR_CONNECTION');
      setError(
        isConnectionError
          ? 'Connection failed. Make sure the dev server is running (npm run dev) and try again.'
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="container flex-1">
      <div className="hero hero-with-grain">
        <a
          href="https://www.floweralice.me/"
          target="_blank"
          rel="noopener noreferrer"
          className="hero-logo-link"
          aria-label="Visit Flower Alice"
        >
          <img src="/logo.png" alt="Hana" className="hero-logo hero-animate" />
        </a>
        <h1 className="hero-animate hero-animate-delay-1">Hana.</h1>
        <p className="hero-subhead hero-animate hero-animate-delay-2">
          Your trusted animation helper.
        </p>
        <p className="hero-tagline hero-animate hero-animate-delay-3">
          Upload a clip, get frame-by-frame feedback on the 12 principles — so you know exactly what to fix next.
        </p>
      </div>

      <div className="hero-features">
        <span className="feature-pill hero-animate hero-animate-delay-4">
          <span className="feature-pill-check" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.5 4L5.5 10L2.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          Check your shot
        </span>
        <span className="feature-pill hero-animate hero-animate-delay-5">
          <span className="feature-pill-check" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.5 4L5.5 10L2.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          Spot possible issues
        </span>
        <span className="feature-pill hero-animate hero-animate-delay-6">
          <span className="feature-pill-check" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.5 4L5.5 10L2.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          Understand what to fix first
        </span>
        <span className="feature-pill hero-animate hero-animate-delay-7">
          <span className="feature-pill-check" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.5 4L5.5 10L2.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          Prepare before critique
        </span>
        <span className="feature-pill hero-animate hero-animate-delay-8">
          <span className="feature-pill-check" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.5 4L5.5 10L2.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          Build better animation habits
        </span>
      </div>

      <UploadForm onAnalyze={handleAnalyze} loading={loading} />

      {loading && (
        <div className="loading animate-fade-in">
          <div className="spinner" />
          <span>Analyzing — extracting frames, computing motion vectors, evaluating 12 principles...</span>
        </div>
      )}

      {error && (
        <div className="error-box animate-slide-down">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && videoUrl && (
        <ResultsView
          result={result}
          keyframePreviews={result.keyframe_previews || []}
          videoUrl={videoUrl}
        />
      )}
      </main>

      <footer
        className="mt-auto pt-12 pb-8 border-t border-[var(--border)]"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
        }}
      >
        <p style={{ margin: 0 }}>Made by Alice Chen</p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '1.5rem',
          }}
        >
          <a
            href="https://www.linkedin.com/in/floweralice/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-secondary)' }}
          >
            LinkedIn
          </a>
          <a
            href="https://x.com/flower_alicee"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-secondary)' }}
          >
            X
          </a>
          <a
            href="https://www.rednote.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-secondary)' }}
          >
            Rednote (动画人咕噜咕噜)
          </a>
        </div>
      </footer>
    </div>
  );
}
