import path from 'path';
import fs from 'fs/promises';
import { runAnalysisPipeline } from '@/lib/analysis';
import { buildAnalysisApiResponse, type AnalysisApiResponse } from '@/lib/analysis/apiResponse';
import type { ExerciseType } from '@/lib/types';

const UPLOAD_DIR =
  process.env.VERCEL || process.env.RENDER
    ? '/tmp/temp_uploads'
    : process.env.UPLOAD_DIR || './temp_uploads';

export interface RunVideoAnalysisParams {
  /** Absolute path to video file on disk */
  videoPath: string;
  clipId: string;
  exerciseType: ExerciseType;
  workDir: string;
  sampleCount: number;
}

/**
 * Runs FFmpeg/pipeline and builds the full API response (charts, keyframes, etc.).
 */
export async function runVideoAnalysisAndBuildResponse(
  params: RunVideoAnalysisParams
): Promise<AnalysisApiResponse> {
  const result = await runAnalysisPipeline({
    videoPath: params.videoPath,
    clipId: params.clipId,
    exerciseType: params.exerciseType,
    workDir: params.workDir,
    sampleCount: params.sampleCount,
  });
  return buildAnalysisApiResponse(params.workDir, result);
}

export function defaultWorkDir(jobId: string): string {
  return path.join(UPLOAD_DIR, jobId);
}

export async function ensureWorkDir(workDir: string): Promise<void> {
  await fs.mkdir(workDir, { recursive: true });
}
