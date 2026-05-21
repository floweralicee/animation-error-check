import { defaultLocale, type Locale } from '@/lib/i18n';

export const CANONICAL_APP_URL = 'https://floweralice.me/hana';
export const LEGACY_RENDER_HOST = 'animation-error-check.onrender.com';

/**
 * Public site origin for links (email, redirects). No trailing slash.
 */
export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  // Legacy Render deploy redirects to the canonical URL; keep outbound links aligned.
  if (process.env.RENDER_EXTERNAL_URL) {
    return CANONICAL_APP_URL;
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
