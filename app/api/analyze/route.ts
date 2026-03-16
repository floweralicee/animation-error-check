import { NextRequest, NextResponse } from 'next/server';
import { runAnalysisPipeline } from '@/lib/analysis';
import { ExerciseType } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { buildMotionProfile } from '@/lib/analysis/motionProfile';
import { computeAllMotionVectors } from '@/lib/analysis/motionVectors';

// Vercel serverless / Render: only /tmp is writable
const UPLOAD_DIR =
  process.env.VERCEL || process.env.RENDER
    ? '/tmp/temp_uploads'
    : (process.env.UPLOAD_DIR || './temp_uploads');
const MAX_SIZE = parseInt(process.env.MAX_UPLOAD_SIZE || '104857600', 10);
const VALID_EXERCISES: ExerciseType[] = ['auto', 'bouncing_ball', 'walk_cycle', 'jump', 'acting'];

export async function POST(request: NextRequest) {
  const jobId = uuidv4();
  const workDir = path.join(UPLOAD_DIR, jobId);

  try {
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

    const exerciseType: ExerciseType = VALID_EXERCISES.includes(exerciseRaw as ExerciseType)
      ? (exerciseRaw as ExerciseType)
      : 'auto';

    // Save uploaded file
    await fs.mkdir(workDir, { recursive: true });
    const videoPath = path.join(workDir, file.name);
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(videoPath, Buffer.from(arrayBuffer));

    // Run analysis pipeline
    const sampleCount = parseInt(process.env.SAMPLE_FRAME_COUNT || '48', 10);
    const result = await runAnalysisPipeline({
      videoPath,
      clipId: file.name,
      exerciseType,
      workDir,
      sampleCount,
    });

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

    // Include per-frame motion data for the motion profile chart
    // We need to recompute this from the pipeline internals — grab it from the framesDir
    const framesDir = path.join(workDir, 'frames');
    let motionProfileDetail: { frame: number; displacement: number; isHold: boolean }[] = [];
    try {
      const frameFiles = await fs.readdir(framesDir);
      const framePaths = frameFiles
        .filter((f) => f.startsWith('frame_') && f.endsWith('.png'))
        .sort()
        .map((f) => path.join(framesDir, f));

      if (framePaths.length >= 2) {
        // Estimate frame numbers from metadata
        const totalFrames = result.metadata.frame_count;
        const interval = Math.max(1, Math.floor(totalFrames / framePaths.length));
        const frameNumbers = framePaths.map((_, i) => i * interval);

        const mvs = await computeAllMotionVectors(framePaths, frameNumbers);
        const profile = buildMotionProfile(mvs, result.metadata);
        motionProfileDetail = profile.perFrame.map((f) => ({
          frame: f.frame,
          displacement: f.displacement,
          isHold: f.isHold,
        }));
      }
    } catch {
      // Motion profile detail is optional for the UI chart
    }

    return NextResponse.json({
      ...result,
      keyframe_previews: keyframePreviews,
      motion_profile_detail: motionProfileDetail,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Analysis failed:', message);
    return NextResponse.json({ error: `Analysis failed: ${message}` }, { status: 500 });
  } finally {
    setTimeout(async () => {
      try {
        await fs.rm(workDir, { recursive: true, force: true });
      } catch {
        // Cleanup is best-effort
      }
    }, 60000);
  }
}
