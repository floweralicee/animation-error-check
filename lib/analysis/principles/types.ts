import { MotionProfile, FrameMotionVectors, BrightnessStats, VideoMetadata, PrincipleAnalysis, ExerciseType } from '../../types';
import { ZoneMotionProfile } from '../bodyZones';

export interface PrincipleContext {
  motionProfile: MotionProfile;
  motionVectors: FrameMotionVectors[];
  brightness: BrightnessStats;
  metadata: VideoMetadata;
  frameNumbers: number[];
  exerciseType: ExerciseType;
  zoneProfiles: ZoneMotionProfile[];
}

export type PrincipleAnalyzer = (ctx: PrincipleContext) => PrincipleAnalysis;

export function frameToTimestamp(frame: number, fps: number): string {
  const sec = frame / fps;
  return `${sec.toFixed(2)}s`;
}

/**
 * Find contiguous segments of non-hold frames (motion segments).
 */
export function findMotionSegments(
  ctx: PrincipleContext,
  minLength: number = 3
): { startIdx: number; endIdx: number; startFrame: number; endFrame: number }[] {
  const pf = ctx.motionProfile.perFrame;
  const segments: { startIdx: number; endIdx: number; startFrame: number; endFrame: number }[] = [];
  let segStart = -1;

  for (let i = 0; i < pf.length; i++) {
    if (!pf[i].isHold) {
      if (segStart === -1) segStart = i;
    } else {
      if (segStart !== -1 && i - segStart >= minLength) {
        segments.push({
          startIdx: segStart,
          endIdx: i - 1,
          startFrame: pf[segStart].frame,
          endFrame: pf[i - 1].frame,
        });
      }
      segStart = -1;
    }
  }
  if (segStart !== -1 && pf.length - segStart >= minLength) {
    segments.push({
      startIdx: segStart,
      endIdx: pf.length - 1,
      startFrame: pf[segStart].frame,
      endFrame: pf[pf.length - 1].frame,
    });
  }

  return segments;
}
