import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { validateAnalyzeForm } from '@/lib/analyzeForm';
import {
  runVideoAnalysisAndBuildResponse,
  ensureWorkDir,
  defaultWorkDir,
} from '@/lib/analysis/runVideoAnalysis';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { insertAnalysisJob, updateJobCompleted, updateJobFailed } from '@/lib/analysisJobs';
import { sendAnalysisReadyEmail } from '@/lib/email';

const MAX_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || '104857600', 10);

function scheduleWorkDirCleanup(workDir: string) {
  setTimeout(async () => {
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch {
      // Cleanup is best-effort
    }
  }, 60000);
}

export async function POST(request: NextRequest) {
  const jobId = uuidv4();
  const workDir = defaultWorkDir(jobId);

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
    let jobRowPersisted = false;
    if (supabase) {
      try {
        await insertAnalysisJob(supabase, {
          id: jobId,
          recipient_email: email,
          exercise_type: exerciseType,
          video_filename: file.name,
          video_storage_path: null,
          status: 'pending',
        });
        jobRowPersisted = true;
      } catch (e) {
        console.error('analysis_jobs insert failed:', e);
      }
    }

    await ensureWorkDir(workDir);
    const videoPath = path.join(workDir, file.name);
    await fs.writeFile(videoPath, Buffer.from(await file.arrayBuffer()));

    const sampleCount = parseInt(process.env.SAMPLE_FRAME_COUNT || '48', 10);

    let payload;
    try {
      payload = await runVideoAnalysisAndBuildResponse({
        videoPath,
        clipId: file.name,
        exerciseType,
        workDir,
        sampleCount,
      });
    } catch (pipelineErr) {
      const msg = pipelineErr instanceof Error ? pipelineErr.message : 'Unknown error';
      console.error('Analysis failed:', msg);
      if (supabase) {
        try {
          await updateJobFailed(supabase, jobId, msg);
        } catch (e) {
          console.error('updateJobFailed:', e);
        }
      }
      return NextResponse.json({ error: `Analysis failed: ${msg}` }, { status: 500 });
    }

    const analyzedAt = new Date();
    const emailResult = await sendAnalysisReadyEmail(email, payload, {
      analyzedAt,
    });

    if (supabase) {
      try {
        await updateJobCompleted(supabase, jobId, {
          resend_message_id: emailResult.id,
          email_error: emailResult.error ?? null,
          result_json: payload,
        });
      } catch (e) {
        console.error('updateJobCompleted:', e);
      }
    }

    return NextResponse.json({
      ...payload,
      job_id: jobId,
      completed_at: analyzedAt.toISOString(),
      email_sent: Boolean(emailResult.id && !emailResult.error),
      email_error: emailResult.error ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Analysis failed:', message);
    return NextResponse.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  } finally {
    scheduleWorkDirCleanup(workDir);
  }
}
