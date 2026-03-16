import { ensureFfmpegPaths } from '../video/ffmpegSetup';
import { extractMetadata } from '../video/metadata';
import { sampleFrames } from '../video/frameSampler';
import { extractKeyframes } from '../video/keyframes';
import { isMatAnyone2Available, generateAutoMask, runMatAnyone2 } from '../video/matanyone';
import { extractForeground, loadMatAnyone2Foreground, ForegroundResult } from '../video/foreground';
import { computeFrameDiffs, findLargestChanges } from './frameDiff';
import { computeBrightness } from './brightness';
import { computeAllMotionVectors, loadGrayscaleBuffer } from './motionVectors';
import { buildMotionProfile } from './motionProfile';
import { extractZoneMotionProfiles } from './bodyZones';
import { analyzeAllPrinciples } from './principles';
import { generateCritique, generatePrincipleSummary } from './critique';
import { getExerciseProfile } from './exerciseThresholds';
import { formatOutput } from '../output/formatter';
import { PipelineInput, AnalysisOutput } from '../types';
import path from 'path';
import fs from 'fs/promises';

/**
 * Main analysis pipeline orchestrator.
 *
 * Pipeline:
 * 1. Extract metadata
 * 2. Sample frames (dense)
 * 3. Foreground segmentation (MatAnyone2 if available, temporal-diff fallback)
 * 4. Frame diffs + brightness (legacy)
 * 5. Motion vectors (foreground-masked)
 * 6. Motion profile
 * 7. Body zone profiles
 * 8. 12 principle analyzers (with exercise-specific thresholds + velocity curve fitting)
 * 9. Format output
 */
export async function runAnalysisPipeline(input: PipelineInput): Promise<AnalysisOutput> {
  ensureFfmpegPaths();

  const { videoPath, clipId, exerciseType, workDir, sampleCount = 48, useAllFrames = false, onStep } = input;
  const step = (name: string) => { onStep?.(name); console.log(`[pipeline] ${name}`); };

  const isVercel = !!process.env.VERCEL;
  const hardCap = isVercel ? 16 : 24;

  const framesDir = path.join(workDir, 'frames');
  await fs.mkdir(framesDir, { recursive: true });

  // Step 1: Extract metadata
  step('extracting video metadata');
  const metadata = await extractMetadata(videoPath);

  // Step 2: Sample frames — cap tightly on Vercel to stay within 60s function limit (unless useAllFrames)
  step('sampling frames');
  const effectiveSampleCount = useAllFrames
    ? metadata.frame_count
    : metadata.frame_count < hardCap
      ? metadata.frame_count
      : Math.min(sampleCount, hardCap);

  const { paths: framePaths, frameNumbers } = await sampleFrames(
    videoPath,
    metadata,
    framesDir,
    effectiveSampleCount
  );

  if (framePaths.length === 0) {
    throw new Error('No frames could be extracted from the video.');
  }

  // Preload all frames once as grayscale buffers — shared across foreground, diffs, brightness, BMA
  step('loading frame buffers');
  const sharedBuffers = await Promise.all(framePaths.map(loadGrayscaleBuffer));

  // Step 3: Extract keyframes (I-frames) — run in parallel with foreground segmentation
  step('extracting keyframes & foreground segmentation');
  let keyframePaths: string[] = [];
  let foreground: ForegroundResult | null = null;
  let foregroundMethod: 'matanyone2' | 'temporal_diff' | 'none' = 'none';

  const [keyframeResult, foregroundResult] = await Promise.allSettled([
    isVercel ? Promise.resolve([]) : extractKeyframes(videoPath, workDir, 8),
    (async (): Promise<{ fg: ForegroundResult; method: 'matanyone2' | 'temporal_diff' }> => {
      const matAvailable = await isMatAnyone2Available();

      if (matAvailable) {
        console.log('MatAnyone2 available — generating auto-mask...');
        const maskPath = await generateAutoMask(framePaths, workDir, metadata.width, metadata.height);
        console.log('Running MatAnyone2 foreground extraction...');
        const matResult = await runMatAnyone2(videoPath, maskPath, workDir);

        if (matResult.success) {
          const fg = await loadMatAnyone2Foreground(matResult.fgrDir, matResult.phaDir, framePaths.length);
          console.log('MatAnyone2 foreground extraction complete.');
          return { fg, method: 'matanyone2' };
        }
      }

      console.log('Using temporal-diff foreground segmentation...');
      const fg = await extractForeground(framePaths, sharedBuffers);
      return { fg, method: 'temporal_diff' };
    })(),
  ]);

  if (keyframeResult.status === 'fulfilled') {
    keyframePaths = keyframeResult.value;
  }

  if (foregroundResult.status === 'fulfilled') {
    foreground = foregroundResult.value.fg;
    foregroundMethod = foregroundResult.value.method;
  } else {
    console.warn('Foreground segmentation failed, proceeding without:', foregroundResult.reason);
  }

  // Steps 5 & 6: Compute frame diffs and brightness in parallel — both use sharedBuffers
  step('computing frame diffs & brightness');
  const [diffs, brightness] = await Promise.all([
    computeFrameDiffs(framePaths, frameNumbers, sharedBuffers),
    computeBrightness(framePaths, frameNumbers, sharedBuffers),
  ]);

  // Step 7: Find largest changes (legacy)
  const largestChangeFrames = findLargestChanges(diffs, 4);

  // Step 8: Compute motion vectors — use masked frames if available, otherwise fall back to sharedBuffers
  step('computing motion vectors');
  const motionVectors = await computeAllMotionVectors(
    framePaths,
    frameNumbers,
    foreground?.maskedFrames ?? sharedBuffers,
    foreground?.masks
  );

  // Step 9: Build motion profile
  const motionProfile = buildMotionProfile(motionVectors, metadata);

  // Step 10: Extract per-body-zone motion profiles
  const zoneProfiles = extractZoneMotionProfiles(motionVectors, motionProfile.primaryRegion);

  // Step 11: Get exercise-specific thresholds
  const exerciseProfile = getExerciseProfile(exerciseType);

  // Step 12: Run all 12 principle analyzers (with zone data + exercise thresholds)
  step('evaluating 12 animation principles');
  const { analyses: principlesAnalysis, overallScore } = analyzeAllPrinciples({
    motionProfile,
    motionVectors,
    brightness,
    metadata,
    frameNumbers,
    exerciseType,
    zoneProfiles,
    exerciseProfile,
    foregroundMethod,
  });

  // Step 13: Generate legacy critique
  const legacyCritique = generateCritique(diffs, brightness, largestChangeFrames, exerciseType);

  // Update confidence notes based on foreground method
  if (foregroundMethod === 'matanyone2') {
    legacyCritique.confidenceNotes[0] = 'Foreground isolation by MatAnyone2 — background noise removed for accurate analysis.';
  } else if (foregroundMethod === 'temporal_diff') {
    legacyCritique.confidenceNotes[0] = 'Foreground isolation by temporal differencing — most background noise filtered.';
  }

  // Step 14: Generate principle-based summary + priorities
  const { summary: principleSummary, topPriorities } = generatePrincipleSummary(
    principlesAnalysis,
    overallScore
  );

  // Step 15: Format output
  step('formatting output');
  const output = formatOutput({
    clipId,
    exerciseType,
    metadata,
    motionProfile,
    zoneProfiles,
    principlesAnalysis,
    overallScore,
    topPriorities,
    analysis: {
      sampled_frames: framePaths.length,
      frame_diffs: diffs,
      largest_change_frames: largestChangeFrames,
      average_brightness_range: {
        min: brightness.overall.min,
        max: brightness.overall.max,
      },
      brightness_stats: brightness,
    },
    legacyCritique,
    principleSummary,
    keyframePaths: keyframePaths.map((p) => path.relative(workDir, p)),
  });

  return output;
}
