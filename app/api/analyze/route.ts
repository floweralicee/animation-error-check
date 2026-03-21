import { NextRequest, NextResponse } from 'next/server';
import { runAnalysisPipeline } from '@/lib/analysis';
import { ExerciseType, ZoneMotionPath } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { buildMotionProfile } from '@/lib/analysis/motionProfile';
import { computeAllMotionVectors } from '@/lib/analysis/motionVectors';
import { analyzeAllSegments } from '@/lib/analysis/velocityCurve';
import { extractZoneMotionProfiles, ZONE_DEFINITIONS, BodyZone } from '@/lib/analysis/bodyZones';

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
    let motionProfileDetail: { frame: number; displacement: number; acceleration: number; isHold: boolean }[] = [];
    let velocityCurveSegments: {
      segmentStart: number;
      segmentEnd: number;
      bestFitEasing: string;
      fitQuality: number;
      normalizedVelocity: number[];
    }[] = [];
    let zoneMotionPaths: ZoneMotionPath[] = [];

    // Analysis resolution (must match motionVectors.ts constants)
    const ANALYSIS_WIDTH = 320;
    const ANALYSIS_HEIGHT = 240;

    // One distinct color per body zone
    const ZONE_COLORS: Record<string, string> = {
      head:       '#FF6B6B',
      chest:      '#FFD93D',
      left_arm:   '#6BCB77',
      right_arm:  '#4D96FF',
      core:       '#C77DFF',
      left_leg:   '#FF9F43',
      right_leg:  '#00D2FF',
    };

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
          acceleration: f.acceleration,
          isHold: f.isHold,
        }));

        // Compute velocity curve segment analysis for the motion curve visualization
        const segments = analyzeAllSegments(profile.perFrame, result.metadata.fps);
        velocityCurveSegments = segments.map((s) => ({
          segmentStart: s.segmentStart,
          segmentEnd: s.segmentEnd,
          bestFitEasing: s.analysis.bestFitEasing,
          fitQuality: s.analysis.fitQuality,
          normalizedVelocity: s.analysis.normalizedVelocity,
        }));

        // Compute per-zone motion paths for the video canvas trail overlay
        if (profile.primaryRegion) {
          const primaryRegion = profile.primaryRegion;
          const zoneProfiles = extractZoneMotionProfiles(mvs, primaryRegion);

          const rawPaths = zoneProfiles
            .filter((zp) => zp.motionPath.length > 0)
            .map((zp) => {
              const zoneDef = ZONE_DEFINITIONS[zp.zone as Exclude<BodyZone, 'whole_body'>];
              if (!zoneDef) return null;

              // Convert zone-local (0-1 within zone) → absolute analysis coords → normalized video space (0-1)
              const zonePath = zp.motionPath.map((pt) => {
                const absX = primaryRegion.x + (zoneDef.x + pt.x * zoneDef.w) * primaryRegion.w;
                const absY = primaryRegion.y + (zoneDef.y + pt.y * zoneDef.h) * primaryRegion.h;
                return {
                  frame: pt.frame,
                  x: Math.min(1, Math.max(0, absX / ANALYSIS_WIDTH)),
                  y: Math.min(1, Math.max(0, absY / ANALYSIS_HEIGHT)),
                };
              });

              const entry: ZoneMotionPath = {
                zone: String(zp.zone),
                color: ZONE_COLORS[zp.zone] ?? '#FFFFFF',
                path: zonePath,
              };
              return entry;
            });

          zoneMotionPaths = rawPaths.filter((zp): zp is ZoneMotionPath => zp !== null);
        }
      }
    } catch {
      // Motion profile detail is optional for the UI chart
    }

    return NextResponse.json({
      ...result,
      keyframe_previews: keyframePreviews,
      motion_profile_detail: motionProfileDetail,
      velocity_curve_segments: velocityCurveSegments,
      zone_motion_paths: zoneMotionPaths,
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
