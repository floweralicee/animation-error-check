import { defaultLocale, type Locale } from '@/lib/i18n';

/**
 * Public site origin for links (email, redirects). No trailing slash.
 */
export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  // Render sets this automatically — avoids emails pointing at localhost when NEXT_PUBLIC_* was missing at build.
  const render = process.env.RENDER_EXTERNAL_URL;
  if (render) {
    return render.replace(/\/$/, '');
  }
  const vercel = process.env.VERCEL_URL;
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${host}`;
  }
  return 'http://localhost:3000';
}

export function buildAnalysisResultUrl(jobId: string, locale: Locale = defaultLocale): string {
  const base = getAppBaseUrl();
  return `${base}/${locale}?job=${encodeURIComponent(jobId)}`;
}
