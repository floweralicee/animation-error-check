import type { AnalysisApiResponse } from '@/lib/analysis/apiResponse';

export type EmailDelivery = 'sent' | 'failed' | 'skipped';

export function parseSyncAnalyzeResponse(data: unknown): {
  result: AnalysisApiResponse;
  completedAt: Date | null;
  emailDelivery: EmailDelivery;
} {
  const o = data as Record<string, unknown>;
  const copy = { ...o };
  const completed_at = copy.completed_at;
  const email_sent = copy.email_sent;
  const email_error = copy.email_error;
  delete copy.job_id;
  delete copy.completed_at;
  delete copy.email_sent;
  delete copy.email_error;
  return {
    result: copy as unknown as AnalysisApiResponse,
    completedAt: typeof completed_at === 'string' ? new Date(completed_at) : null,
    emailDelivery: email_error
      ? 'failed'
      : email_sent === true
        ? 'sent'
        : 'skipped',
  };
}

export function deriveEmailDeliveryFromStatus(s: {
  resend_message_id?: string | null;
  email_error?: string | null;
}): EmailDelivery {
  if (s.email_error) return 'failed';
  if (s.resend_message_id) return 'sent';
  return 'skipped';
}
