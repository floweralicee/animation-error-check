import { extractMetadata } from '../video/metadata';
import { sampleFrames } from '../video/frameSampler';
import { extractKeyframes } from '../video/keyframes';
import { computeFrameDiffs, findLargestChanges } from './frameDiff';
import { computeBrightness } from './brightness';
import { computeAllMotionVectors } from './motionVectors';
import { buildMotionProfile } from './motionProfile';
import { extractZoneMotionProfiles } from './bodyZones';
import { analyzeAllPrinciples } from './principles';
import { generateCritique, generatePrincipleSummary } from './critique';
import { formatOutput } from '../output/formatter';
import { PipelineInput, AnalysisOutput } from '../types';
import path from 'path';
import fs from 'fs/promises';

/**
 * Main analysis pipeline orchestrator.
 * Runs: metadata → frames → diffs → brightness → motion vectors → motion profile → 12 principles → output.
 */
export async function runAnalysisPipeline(input: PipelineInput): Promise<AnalysisOutput> {
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

  // Step 4: Compute frame diffs (legacy)
  const diffs = await computeFrameDiffs(framePaths, frameNumbers);

  // Step 5: Compute brightness
  const brightness = await computeBrightness(framePaths, frameNumbers);

  // Step 6: Find largest changes (legacy)
  const largestChangeFrames = findLargestChanges(diffs, 4);

  // Step 7: Compute motion vectors (block matching)
  const motionVectors = await computeAllMotionVectors(framePaths, frameNumbers);

  // Step 8: Build motion profile
  const motionProfile = buildMotionProfile(motionVectors, metadata);

  // Step 8b: Extract per-body-zone motion profiles
  const zoneProfiles = extractZoneMotionProfiles(motionVectors, motionProfile.primaryRegion);

  // Step 9: Run all 12 principle analyzers (with zone data)
  const { analyses: principlesAnalysis, overallScore } = analyzeAllPrinciples({
    motionProfile,
    motionVectors,
    brightness,
    metadata,
    frameNumbers,
    exerciseType,
    zoneProfiles,
  });

  // Step 10: Generate legacy critique
  const legacyCritique = generateCritique(diffs, brightness, largestChangeFrames, exerciseType);

  // Step 11: Generate principle-based summary + priorities
  const { summary: principleSummary, topPriorities } = generatePrincipleSummary(
    principlesAnalysis,
    overallScore
  );

  // Step 12: Format output
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
