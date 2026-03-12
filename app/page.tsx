'use client';

import { useState, useCallback } from 'react';
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

    // Create blob URL for video playback
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
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <div className="hero">
        <img src="/logo.png" alt="Hana" className="hero-logo" />
        <h1>Hana</h1>
        <p className="hero-tagline">Your trusted animation helper that helps you see what to fix next.</p>
      </div>

      <div className="hero-features">
        <div className="feature-item">✓ Check your shot</div>
        <div className="feature-item">✓ Spot possible issues</div>
        <div className="feature-item">✓ Understand what to fix first</div>
        <div className="feature-item">✓ Prepare before critique</div>
        <div className="feature-item">✓ Build better animation habits</div>
      </div>

      <UploadForm onAnalyze={handleAnalyze} loading={loading} />

      {loading && (
        <div className="loading">
          <div className="spinner" />
          <span>Analyzing — extracting frames, computing motion vectors, evaluating 12 principles...</span>
        </div>
      )}

      {error && (
        <div className="error-box">
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
  );
}
