import posthog from 'posthog-js';

const enabled = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

export function fileSizeBucket(bytes: number): string {
  const mb10 = 10 * 1024 * 1024;
  const mb50 = 50 * 1024 * 1024;
  if (bytes < mb10) return '0-10mb';
  if (bytes < mb50) return '10-50mb';
  return '50mb+';
}

export function captureAnalysisStarted(props: {
  exercise_type: string;
  file_size_bucket: string;
  locale: string;
}): void {
  if (!enabled) return;
  posthog.capture('analysis_started', props);
}

export function captureAnalysisCompleted(props: {
  exercise_type: string;
  http_status: number;
}): void {
  if (!enabled) return;
  posthog.capture('analysis_completed', props);
}

export function captureAnalysisFailed(props: {
  exercise_type: string;
  error_type: 'network' | 'server' | 'client';
  http_status?: number;
}): void {
  if (!enabled) return;
  posthog.capture('analysis_failed', props);
}

export function registerLocale(locale: string): void {
  if (!enabled) return;
  posthog.register({ locale });
}
