import type { SupabaseClient } from '@supabase/supabase-js';
import type { AnalysisApiResponse } from '@/lib/analysis/apiResponse';

export type JobStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'failed';

export async function insertAnalysisJob(
  supabase: SupabaseClient,
  row: {
    id: string;
    recipient_email: string;
    exercise_type: string;
    video_filename: string | null;
    video_storage_path: string | null;
    status: JobStatus;
  }
) {
  const { error } = await supabase.from('analysis_jobs').insert({
    id: row.id,
    recipient_email: row.recipient_email,
    exercise_type: row.exercise_type,
    video_filename: row.video_filename,
    video_storage_path: row.video_storage_path,
    status: row.status,
  });
  if (error) throw error;
}

export async function updateJobCompleted(
  supabase: SupabaseClient,
  id: string,
  fields: {
    resend_message_id?: string | null;
    email_error?: string | null;
    result_json?: AnalysisApiResponse | null;
  }
) {
  const { error } = await supabase
    .from('analysis_jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      resend_message_id: fields.resend_message_id ?? null,
      email_error: fields.email_error ?? null,
      result_json: fields.result_json ?? null,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function updateJobFailed(
  supabase: SupabaseClient,
  id: string,
  errorMessage: string
) {
  const { error } = await supabase
    .from('analysis_jobs')
    .update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq('id', id);
  if (error) throw error;
}

export async function updateJobStatus(
  supabase: SupabaseClient,
  id: string,
  status: JobStatus
) {
  const { error } = await supabase.from('analysis_jobs').update({ status }).eq('id', id);
  if (error) throw error;
}
