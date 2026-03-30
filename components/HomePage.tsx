'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
import {
  parseSyncAnalyzeResponse,
  deriveEmailDeliveryFromStatus,
  type EmailDelivery,
} from '@/lib/analyzeClient';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 180;

function isAsyncAnalysisEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_ASYNC_ANALYSIS === 'true';
}

export default function HomePage() {
  const { t, locale } = useLocale();
  const searchParams = useSearchParams();
  const jobFromUrl = searchParams.get('job')?.trim() || null;

  const [analyzedAt, setAnalyzedAt] = useState<Date | null>(null);
  const [emailDelivery, setEmailDelivery] = useState<EmailDelivery | null>(null);

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

  useEffect(() => {
    if (!jobFromUrl) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setResult(null);
        setVideoUrl(null);
        setAnalyzedAt(null);
        setEmailDelivery(null);

        let finished = false;

        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
          if (cancelled) return;

          const statusRes = await fetch(
            `/api/analyze/status/${encodeURIComponent(jobFromUrl)}`
          );
          let statusJson: unknown;
          try {
            statusJson = await statusRes.json();
          } catch {
            if (!cancelled) setError(t('jobLoadFailed'));
            finished = true;
            break;
          }

          const s = statusJson as {
            status?: string;
            result?: AnalysisResponse;
            error?: string;
            completed_at?: string | null;
            resend_message_id?: string | null;
            email_error?: string | null;
          };

          if (!statusRes.ok) {
            if (!cancelled) {
              if (statusRes.status === 404) setError(t('jobNotFound'));
              else if (statusRes.status === 503) setError(t('jobDeepLinkUnavailable'));
              else setError(t('jobLoadFailed'));
            }
            finished = true;
            break;
          }

          if (s.status === 'completed') {
            if (cancelled) return;
            if (!s.result) {
              if (!cancelled) setError(t('jobResultUnavailable'));
              finished = true;
              break;
            }
            setResult(s.result);
            setVideoUrl(null);
            setAnalyzedAt(s.completed_at ? new Date(s.completed_at) : null);
            setEmailDelivery(deriveEmailDeliveryFromStatus(s));
            captureAnalysisCompleted({ exercise_type: 'auto', http_status: 200 });
            finished = true;
            break;
          }

          if (s.status === 'failed') {
            if (!cancelled) setError(s.error || t('somethingWentWrong'));
            finished = true;
            break;
          }

          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }

        if (cancelled) return;
        if (!finished) {
          setError(t('analysisPollingTimeout'));
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // jobFromUrl + t only — useRouter/locale/unstable deps were re-running this effect and cancelling the fetch mid-flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- useAnalysis setters are stable
  }, [jobFromUrl, t]);

  async function handleAnalyze(file: File, exerciseType: string, email: string) {
    setLoading(true);
    setError(null);
    setResult(null);
    setAnalyzedAt(null);
    setEmailDelivery(null);

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
      formData.append('email', email);

      const endpoint = isAsyncAnalysisEnabled() ? '/api/analyze/jobs' : '/api/analyze';

      const response = await fetch(endpoint, {
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
        const errBody = data as { error?: string; code?: string };
        if (errBody.code === 'email_required') {
          setError(t('emailRequired'));
          return;
        }
        if (errBody.code === 'email_invalid') {
          setError(t('emailInvalid'));
          return;
        }
        if (errBody.code === 'async_not_configured') {
          setError(t('asyncAnalysisUnavailable'));
          return;
        }
        setError(errBody.error || `${t('serverError')}: ${response.status}`);
        return;
      }

      if (response.status === 202) {
        const body = data as { jobId?: string };
        if (!body.jobId) {
          captureAnalysisFailed({
            exercise_type: exerciseType,
            error_type: 'client',
          });
          setError(t('somethingWentWrong'));
          return;
        }

        let analysisResult: AnalysisResponse | null = null;
        let completedAt: Date | null = null;
        let delivery: EmailDelivery | null = null;

        for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
          const statusRes = await fetch(`/api/analyze/status/${body.jobId}`);
          let statusJson: unknown;
          try {
            statusJson = await statusRes.json();
          } catch {
            captureAnalysisFailed({
              exercise_type: exerciseType,
              error_type: 'client',
            });
            setError(t('somethingWentWrong'));
            return;
          }

          const s = statusJson as {
            status?: string;
            result?: AnalysisResponse;
            error?: string;
            completed_at?: string | null;
            resend_message_id?: string | null;
            email_error?: string | null;
          };

          if (s.status === 'completed' && s.result) {
            analysisResult = s.result;
            completedAt = s.completed_at ? new Date(s.completed_at) : null;
            delivery = deriveEmailDeliveryFromStatus(s);
            break;
          }
          if (s.status === 'failed') {
            captureAnalysisFailed({
              exercise_type: exerciseType,
              error_type: 'server',
              http_status: 500,
            });
            setError(s.error || t('somethingWentWrong'));
            return;
          }

          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }

        if (!analysisResult) {
          captureAnalysisFailed({
            exercise_type: exerciseType,
            error_type: 'server',
          });
          setError(t('analysisPollingTimeout'));
          return;
        }

        captureAnalysisCompleted({
          exercise_type: exerciseType,
          http_status: 200,
        });
        setResult(analysisResult);
        setAnalyzedAt(completedAt);
        setEmailDelivery(delivery);
        return;
      }

      captureAnalysisCompleted({
        exercise_type: exerciseType,
        http_status: response.status,
      });
      const parsed = parseSyncAnalyzeResponse(data);
      setResult(parsed.result);
      setAnalyzedAt(parsed.completedAt);
      setEmailDelivery(parsed.emailDelivery);
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

        <UploadForm
          onAnalyze={handleAnalyze}
          loading={loading}
          emailDelivery={emailDelivery}
        />

        {loading && (
          <div className="loading animate-fade-in">
            <img
              src="/logo.png"
              alt=""
              aria-hidden
              className="hana-loading-logo"
            />
            <span>{jobFromUrl ? t('jobStillProcessing') : t('loadingMessage')}</span>
          </div>
        )}

        {error && (
          <div className="error-box animate-slide-down">
            <strong>{t('errorLabel')}</strong> {error}
          </div>
        )}

        {result && (
          <ResultsView
            result={result}
            keyframePreviews={result.keyframe_previews || []}
            videoUrl={videoUrl}
            analyzedAt={analyzedAt}
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
