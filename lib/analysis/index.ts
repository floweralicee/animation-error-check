import { ensureFfmpegPaths } from '../video/ffmpegSetup';
import { extractMetadata } from '../video/metadata';
import { sampleFrames } from '../video/frameSampler';
import { extractKeyframes } from '../video/keyframes';
import { isMatAnyone2Available, generateAutoMask, runMatAnyone2 } from '../video/matanyone';
import { extractForeground, loadMatAnyone2Foreground, ForegroundResult } from '../video/foreground';
import { computeFrameDiffs, findLargestChanges } from './frameDiff';
import { computeBrightness } from './brightness';
import { computeAllMotionVectors } from './motionVectors';
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

  const { videoPath, clipId, exerciseType, workDir, sampleCount = 48 } = input;

  const framesDir = path.join(workDir, 'frames');
  await fs.mkdir(framesDir, { recursive: true });

  // Step 1: Extract metadata
  const metadata = await extractMetadata(videoPath);

  // Step 2: Sample frames (denser for principle analysis)
  const effectiveSampleCount = metadata.frame_count < 100
    ? metadata.frame_count
    : metadata.frame_count < 200
      ? Math.ceil(metadata.frame_count / 2)
      : sampleCount;

  const { paths: framePaths, frameNumbers } = await sampleFrames(
    videoPath,
    metadata,
    framesDir,
    effectiveSampleCount
  );

  if (framePaths.length === 0) {
    throw new Error('No frames could be extracted from the video.');
  }

  // Step 3: Extract keyframes (I-frames)
  let keyframePaths: string[] = [];
  try {
    keyframePaths = await extractKeyframes(videoPath, workDir, 8);
  } catch {
    keyframePaths = [];
  }

  // Step 4: Foreground segmentation
  let foreground: ForegroundResult | null = null;
  let foregroundMethod: 'matanyone2' | 'temporal_diff' | 'none' = 'none';

  try {
    const matAvailable = await isMatAnyone2Available();

    if (matAvailable) {
      // Generate auto-mask from temporal differencing of first frames
      console.log('MatAnyone2 available — generating auto-mask...');
      const maskPath = await generateAutoMask(framePaths, workDir, metadata.width, metadata.height);

      // Run MatAnyone2
      console.log('Running MatAnyone2 foreground extraction...');
      const matResult = await runMatAnyone2(videoPath, maskPath, workDir);

      if (matResult.success) {
        foreground = await loadMatAnyone2Foreground(
          matResult.fgrDir,
          matResult.phaDir,
          framePaths.length
        );
        foregroundMethod = 'matanyone2';
        console.log('MatAnyone2 foreground extraction complete.');
      }
    }

    // Fallback to temporal differencing if MatAnyone2 not available or failed
    if (!foreground) {
      console.log('Using temporal-diff foreground segmentation...');
      foreground = await extractForeground(framePaths);
      foregroundMethod = 'temporal_diff';
    }
  } catch (err) {
    console.warn('Foreground segmentation failed, proceeding without:', err);
    foregroundMethod = 'none';
  }

  // Step 5: Compute frame diffs (legacy — still uses raw frames)
  const diffs = await computeFrameDiffs(framePaths, frameNumbers);

  // Step 6: Compute brightness
  const brightness = await computeBrightness(framePaths, frameNumbers);

  // Step 7: Find largest changes (legacy)
  const largestChangeFrames = findLargestChanges(diffs, 4);

  // Step 8: Compute motion vectors (foreground-masked if available)
  const motionVectors = await computeAllMotionVectors(
    framePaths,
    frameNumbers,
    foreground?.maskedFrames,
    foreground?.masks
  );

  // Step 9: Build motion profile
  const motionProfile = buildMotionProfile(motionVectors, metadata);

  // Step 10: Extract per-body-zone motion profiles
  const zoneProfiles = extractZoneMotionProfiles(motionVectors, motionProfile.primaryRegion);

  // Step 11: Get exercise-specific thresholds
  const exerciseProfile = getExerciseProfile(exerciseType);

  // Step 12: Run all 12 principle analyzers (with zone data + exercise thresholds)
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
