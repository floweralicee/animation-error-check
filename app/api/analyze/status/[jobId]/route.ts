import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  _request: NextRequest,
  context: { params: { jobId: string } }
) {
  const { jobId } = context.params;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('analysis_jobs')
    .select(
      'id, status, error_message, created_at, completed_at, result_json, email_error, resend_message_id'
    )
    .eq('id', jobId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (data.status === 'completed') {
    return NextResponse.json({
      status: 'completed',
      result: data.result_json ?? null,
      completed_at: data.completed_at ?? null,
      resend_message_id: data.resend_message_id,
      email_error: data.email_error,
    });
  }

  if (data.status === 'failed') {
    return NextResponse.json({
      status: 'failed',
      error: data.error_message ?? 'Analysis failed',
    });
  }

  return NextResponse.json({
    status: data.status,
    created_at: data.created_at,
  });
}
