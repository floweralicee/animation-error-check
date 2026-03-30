import { Resend } from 'resend';
import type { AnalysisApiResponse } from '@/lib/analysis/apiResponse';
import { buildAnalysisEmailBody } from '@/lib/analysis/apiResponse';

/** Fallback From when RESEND_FROM is unset; override via RESEND_FROM in env if needed. */
const DEFAULT_RESEND_FROM = 'Hana <alice@animclaw.com>';

let resendClient: Resend | null | undefined;

function getResend(): Resend | null {
  if (resendClient !== undefined) return resendClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    resendClient = null;
    return null;
  }
  resendClient = new Resend(key);
  return resendClient;
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export type SendAnalysisEmailOptions = {
  analyzedAt?: Date;
};

/**
 * Sends a short summary email after analysis. Returns Resend message id or null if skipped/failed.
 */
export async function sendAnalysisReadyEmail(
  to: string,
  payload: AnalysisApiResponse,
  options?: SendAnalysisEmailOptions
): Promise<{ id: string | null; error?: string }> {
  const resend = getResend();
  if (!resend) {
    return { id: null, error: 'Resend not configured' };
  }
  const from =
    process.env.RESEND_FROM?.trim() || DEFAULT_RESEND_FROM;

  const analyzedAt = options?.analyzedAt ?? new Date();

  const { text, html } = buildAnalysisEmailBody(payload, {
    analyzedAt,
  });

  const subject = `Your Hana animation analysis — ${Math.round((payload.overall_score ?? 0) * 100)}/100`;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      text,
      html,
    });
    if (error) {
      const msg =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Email send failed';
      return { id: null, error: msg };
    }
    return { id: data?.id ?? null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown email error';
    return { id: null, error: msg };
  }
}
