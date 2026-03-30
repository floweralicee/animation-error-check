import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { validateAnalyzeForm } from '@/lib/analyzeForm';
import { insertAnalysisJob, updateJobFailed } from '@/lib/analysisJobs';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  uploadAnalysisVideo,
  removeAnalysisVideo,
} from '@/lib/storage/analysisVideos';
import { inngest } from '@/inngest/client';

const MAX_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || '104857600', 10);

function isInngestConfigured(): boolean {
  return Boolean(process.env.INNGEST_EVENT_KEY);
}

export async function POST(request: NextRequest) {
  const jobId = uuidv4();

  try {
    const formData = await request.formData();
    const parsed = validateAnalyzeForm(formData);
    if (!parsed.ok) return parsed.response;

    const { file, email, exerciseType } = parsed;

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Max size: ${MAX_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        {
          error:
            'Async analysis requires Supabase. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
          code: 'async_not_configured',
        },
        { status: 503 }
      );
    }

    if (!isInngestConfigured()) {
      return NextResponse.json(
        {
          error: 'Async analysis requires INNGEST_EVENT_KEY.',
          code: 'async_not_configured',
        },
        { status: 503 }
      );
    }

    let storagePath: string;
    try {
      const up = await uploadAnalysisVideo(supabase, jobId, file);
      storagePath = up.path;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    try {
      await insertAnalysisJob(supabase, {
        id: jobId,
        recipient_email: email,
        exercise_type: exerciseType,
        video_filename: file.name,
        video_storage_path: storagePath,
        status: 'queued',
      });
    } catch (e) {
      console.error('insertAnalysisJob failed:', e);
      await removeAnalysisVideo(supabase, storagePath).catch(() => {});
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    try {
      await inngest.send({
        name: 'hana/analysis.requested',
        data: {
          jobId,
          storagePath,
          email,
          exerciseType,
          originalFilename: file.name,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Enqueue failed';
      try {
        await updateJobFailed(supabase, jobId, msg);
      } catch {
        // ignore
      }
      await removeAnalysisVideo(supabase, storagePath).catch(() => {});
      return NextResponse.json({ error: 'Failed to enqueue analysis' }, { status: 500 });
    }

    return NextResponse.json(
      {
        jobId,
        async: true,
        statusUrl: `/api/analyze/status/${jobId}`,
      },
      { status: 202 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Async analyze enqueue failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
