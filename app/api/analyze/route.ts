import { NextRequest, NextResponse } from 'next/server';
import { runAnalysisPipeline } from '@/lib/analysis';
import { ExerciseType } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { del } from '@vercel/blob';

// Vercel serverless: only /tmp is writable
const UPLOAD_DIR =
  process.env.VERCEL ? '/tmp/temp_uploads' : (process.env.UPLOAD_DIR || './temp_uploads');
const MAX_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || '104857600', 10);
const VALID_EXERCISES: ExerciseType[] = ['auto', 'bouncing_ball', 'walk_cycle', 'jump', 'acting'];

export async function POST(request: NextRequest) {
  const jobId = uuidv4();
  const workDir = path.join(UPLOAD_DIR, jobId);
  let blobUrlToDelete: string | null = null;

  try {
    const contentType = request.headers.get('content-type') ?? '';
    let videoPath: string;
    let clipId: string;
    let exerciseType: ExerciseType;

    if (contentType.includes('application/json')) {
      // Blob flow: client uploaded to Vercel Blob, passed URL
      const body = await request.json();
      const { videoUrl, exercise_type: exerciseRaw } = body as {
        videoUrl?: string;
        exercise_type?: string;
      };
      if (!videoUrl) {
        return NextResponse.json({ error: 'No video URL provided' }, { status: 400 });
      }
      blobUrlToDelete = videoUrl;
      clipId = path.basename(new URL(videoUrl).pathname) || 'video';
      exerciseType = VALID_EXERCISES.includes((exerciseRaw || 'auto') as ExerciseType)
        ? (exerciseRaw as ExerciseType)
        : 'auto';

      const res = await fetch(videoUrl);
      if (!res.ok) {
        return NextResponse.json({ error: 'Failed to fetch video from blob' }, { status: 400 });
      }
      const arrayBuffer = await res.arrayBuffer();
      await fs.mkdir(workDir, { recursive: true });
      videoPath = path.join(workDir, clipId);
      await fs.writeFile(videoPath, Buffer.from(arrayBuffer));
    } else {
      // FormData flow: direct file upload (for small files or local dev)
      const formData = await request.formData();
      const file = formData.get('video') as File | null;
      const exerciseRaw = (formData.get('exercise_type') as string) || 'auto';

      if (!file) {
        return NextResponse.json({ error: 'No video file provided' }, { status: 400 });
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: `File too large. Max size: ${MAX_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        );
      }
      exerciseType = VALID_EXERCISES.includes(exerciseRaw as ExerciseType)
        ? (exerciseRaw as ExerciseType)
        : 'auto';
      clipId = file.name;
      await fs.mkdir(workDir, { recursive: true });
      videoPath = path.join(workDir, file.name);
      const arrayBuffer = await file.arrayBuffer();
      await fs.writeFile(videoPath, Buffer.from(arrayBuffer));
    }

    // Run analysis pipeline with a 28-second hard timeout.
    // If it hasn't finished in time, return a clear error explaining the last step reached.
    const PIPELINE_TIMEOUT_MS = 28_000;
    const sampleCount = parseInt(
      process.env.SAMPLE_FRAME_COUNT || (process.env.VERCEL ? '16' : '48'),
      10
    );

    let lastStep = 'initializing';
    const timeoutError = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Analysis timed out after 28 s. Last completed step: "${lastStep}". ` +
            `This usually means the video is too long, too high-resolution, or the server is under load. ` +
            `Try a shorter clip (under 5 s), reduce the resolution, or use a video with fewer frames.`
          )
        );
      }, PIPELINE_TIMEOUT_MS);
    });

    const result = await Promise.race([
      runAnalysisPipeline({
        videoPath,
        clipId,
        exerciseType,
        workDir,
        sampleCount,
        onStep: (step: string) => { lastStep = step; },
      }),
      timeoutError,
    ]);

    // Read keyframe images as base64 for client preview
    let keyframePreviews: string[] = [];
    if (result.keyframe_paths && result.keyframe_paths.length > 0) {
      keyframePreviews = await Promise.all(
        result.keyframe_paths.map(async (relPath) => {
          try {
            const absPath = path.join(workDir, relPath);
            const buf = await fs.readFile(absPath);
            return `data:image/png;base64,${buf.toString('base64')}`;
          } catch {
            return '';
          }
        })
      );
      keyframePreviews = keyframePreviews.filter((p) => p.length > 0);
    }

    return NextResponse.json({
      ...result,
      keyframe_previews: keyframePreviews,
      motion_profile_detail: result.motion_profile_detail ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Analysis failed:', message);
    return NextResponse.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  } finally {
    // Delete blob from Vercel Blob storage after analysis (when using blob flow)
    if (blobUrlToDelete) {
      try {
        await del(blobUrlToDelete);
      } catch (e) {
        console.warn('Blob delete failed (best-effort):', e);
      }
    }
    setTimeout(async () => {
      try {
        await fs.rm(workDir, { recursive: true, force: true });
      } catch {
        // Cleanup is best-effort
      }
    }, 60000);
  }
}
