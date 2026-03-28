'use client';

import { useEffect } from 'react';
import UploadForm from '@/components/UploadForm';
import ResultsView from '@/components/ResultsView';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLocale } from '@/components/LocaleProvider';
import { useAnalysis, type AnalysisResponse } from '@/components/AnalysisProvider';
import {
  captureAnalysisCompleted,
  captureAnalysisFailed,
  captureAnalysisStarted,
  fileSizeBucket,
  registerLocale,
} from '@/lib/analytics';

export default function Home() {
  const { t, locale } = useLocale();

  useEffect(() => {
    registerLocale(locale);
  }, [locale]);
  const {
    result,
    videoUrl,
    loading,
    error,
    setResult,
    setVideoUrl,
    setLoading,
    setError,
  } = useAnalysis();

  async function handleAnalyze(file: File, exerciseType: string) {
    setLoading(true);
    setError(null);
    setResult(null);

    const blobUrl = URL.createObjectURL(file);
    setVideoUrl(blobUrl);

    captureAnalysisStarted({
      exercise_type: exerciseType,
      file_size_bucket: fileSizeBucket(file.size),
      locale,
    });

    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('exercise_type', exerciseType);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      let data: unknown;
      try {
        data = await response.json();
      } catch {
        captureAnalysisFailed({
          exercise_type: exerciseType,
          error_type: 'client',
        });
        setError(t('somethingWentWrong'));
        return;
      }

      if (!response.ok) {
        captureAnalysisFailed({
          exercise_type: exerciseType,
          error_type: 'server',
          http_status: response.status,
        });
        const errBody = data as { error?: string };
        setError(errBody.error || `${t('serverError')}: ${response.status}`);
        return;
      }

      captureAnalysisCompleted({
        exercise_type: exerciseType,
        http_status: response.status,
      });
      setResult(data as AnalysisResponse);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('somethingWentWrong');
      const isConnectionError =
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('Network request failed') ||
        msg.toLowerCase().includes('connection') ||
        msg.includes('ERR_CONNECTION');
      captureAnalysisFailed({
        exercise_type: exerciseType,
        error_type: isConnectionError ? 'network' : 'client',
      });
      setError(isConnectionError ? t('connectionError') : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="container flex-1">
        <div className="hero hero-with-grain">
          <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
            <LanguageSwitcher />
          </div>
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
            {t('heroSubhead')}
          </p>
          <p className="hero-tagline hero-animate hero-animate-delay-3">
            {t('heroTagline')}
          </p>
        </div>

        <div className="hero-features">
          <span className="feature-pill hero-animate hero-animate-delay-4">
            <span className="feature-pill-check" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.5 4L5.5 10L2.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            {t('featureCheckShot')}
          </span>
          <span className="feature-pill hero-animate hero-animate-delay-5">
            <span className="feature-pill-check" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.5 4L5.5 10L2.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            {t('featureSpotIssues')}
          </span>
          <span className="feature-pill hero-animate hero-animate-delay-6">
            <span className="feature-pill-check" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.5 4L5.5 10L2.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            {t('featureUnderstandFix')}
          </span>
          <span className="feature-pill hero-animate hero-animate-delay-7">
            <span className="feature-pill-check" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.5 4L5.5 10L2.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            {t('featurePrepareCritique')}
          </span>
          <span className="feature-pill hero-animate hero-animate-delay-8">
            <span className="feature-pill-check" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.5 4L5.5 10L2.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            {t('featureBuildHabits')}
          </span>
        </div>

        <UploadForm onAnalyze={handleAnalyze} loading={loading} />

        {loading && (
          <div className="loading animate-fade-in">
            <div className="spinner" />
            <span>{t('loadingMessage')}</span>
          </div>
        )}

        {error && (
          <div className="error-box animate-slide-down">
            <strong>{t('errorLabel')}</strong> {error}
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
        <p style={{ margin: 0 }}>{t('madeBy')}</p>
        <p
          style={{
            margin: 0,
            maxWidth: '36rem',
            lineHeight: 1.5,
          }}
        >
          {t('footerQuestions')}
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '1.5rem',
          }}
        >
          <a
            href="https://discord.gg/hSg98xxH"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text-secondary)' }}
          >
            Discord
          </a>
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
