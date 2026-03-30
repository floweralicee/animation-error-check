import path from 'path';
import fs from 'fs/promises';
import { NonRetriableError } from 'inngest';
import { inngest } from '@/inngest/client';
import {
  runVideoAnalysisAndBuildResponse,
  ensureWorkDir,
  defaultWorkDir,
} from '@/lib/analysis/runVideoAnalysis';
import { updateJobCompleted, updateJobFailed, updateJobStatus } from '@/lib/analysisJobs';
import { sendAnalysisReadyEmail } from '@/lib/email';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  downloadAnalysisVideo,
  removeAnalysisVideo,
} from '@/lib/storage/analysisVideos';
import type { ExerciseType } from '@/lib/types';

export type AnalysisRequestedEvent = {
  name: 'hana/analysis.requested';
  data: {
    jobId: string;
    storagePath: string;
    email: string;
    exerciseType: ExerciseType;
    originalFilename: string;
  };
};

export const analyzeVideoJob = inngest.createFunction(
  {
    id: 'analyze-video-job',
    name: 'Analyze video (async)',
    triggers: [{ event: 'hana/analysis.requested' }],
  },
  async ({ event, step }) => {
    const { jobId, storagePath, email, exerciseType, originalFilename } = event.data;

    await step.run('mark-processing', async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new NonRetriableError('Supabase not configured');
      await updateJobStatus(supabase, jobId, 'processing');
    });

    const payload = await step.run('run-analysis', async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new NonRetriableError('Supabase not configured');

      const workDir = defaultWorkDir(jobId);
      await ensureWorkDir(workDir);

      let buf: Buffer;
      try {
        buf = await downloadAnalysisVideo(supabase, storagePath);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Storage download failed';
        await updateJobFailed(supabase, jobId, msg);
        throw new NonRetriableError(msg);
      }

      const videoPath = path.join(workDir, originalFilename);
      await fs.writeFile(videoPath, buf);

      const sampleCount = parseInt(process.env.SAMPLE_FRAME_COUNT || '48', 10);

      try {
        return await runVideoAnalysisAndBuildResponse({
          videoPath,
          clipId: originalFilename,
          exerciseType,
          workDir,
          sampleCount,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Analysis failed';
        await updateJobFailed(supabase, jobId, msg);
        throw new NonRetriableError(msg);
      } finally {
        setTimeout(async () => {
          try {
            await fs.rm(workDir, { recursive: true, force: true });
          } catch {
            // best-effort
          }
        }, 5000);
      }
    });

    await step.run('email-and-persist', async () => {
      const supabase = getSupabaseAdmin();
      if (!supabase) throw new NonRetriableError('Supabase not configured');

      const analyzedAt = new Date();
      const emailResult = await sendAnalysisReadyEmail(email, payload, {
        analyzedAt,
      });

      await updateJobCompleted(supabase, jobId, {
        resend_message_id: emailResult.id,
        email_error: emailResult.error ?? null,
        result_json: payload,
      });

      try {
        await removeAnalysisVideo(supabase, storagePath);
      } catch (e) {
        console.warn('Could not remove storage object:', storagePath, e);
      }
    });

    return { jobId, ok: true };
  }
);
