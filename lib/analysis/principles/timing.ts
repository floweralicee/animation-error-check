import { PrincipleAnalysis, PrincipleIssue } from '../../types';
import { PrincipleContext, frameToTimestamp, findMotionSegments } from './types';
import { ZoneMotionProfile, ZONE_DISPLAY_NAMES } from '../bodyZones';
import { ExerciseProfile } from '../exerciseThresholds';

/**
 * Timing: analyze whether motion is too rushed or too slow.
 * Evaluates both whole-body and per-zone timing.
 */
export function analyzeTiming(ctx: PrincipleContext): PrincipleAnalysis {
  const issues: PrincipleIssue[] = [];
  const fps = ctx.metadata.fps;
  const zoneScores: Record<string, number> = {};

  const ep = ctx.exerciseProfile;

  // Whole-body timing analysis
  const wholeBodyIssues = analyzeTimingForProfile(
    ctx.motionProfile.perFrame.map((f) => ({
      frame: f.frame,
      displacement: f.displacement,
      isHold: f.isHold,
    })),
    ctx.motionProfile.averageDisplacement,
    fps,
    'whole_body',
    'Whole Body',
    ep
  );
  issues.push(...wholeBodyIssues.issues);
  zoneScores['whole_body'] = wholeBodyIssues.score;

  // Per-zone timing analysis
  for (const zone of ctx.zoneProfiles) {
    if (zone.motionFrameCount < 4) {
      zoneScores[zone.zone] = 1.0;
      continue;
    }
    const zoneResult = analyzeTimingForProfile(
      zone.perFrame,
      zone.averageDisplacement,
      fps,
      zone.zone,
      zone.displayName,
      ep
    );
    issues.push(...zoneResult.issues);
    zoneScores[zone.zone] = zoneResult.score;
  }

  // Overall score: weighted average (whole body 40%, zones 60%)
  const zoneKeys = Object.keys(zoneScores).filter((k) => k !== 'whole_body');
  const zoneAvg = zoneKeys.length > 0
    ? zoneKeys.reduce((s, k) => s + zoneScores[k], 0) / zoneKeys.length
    : 1.0;
  const score = Math.round((zoneScores['whole_body'] * 0.4 + zoneAvg * 0.6) * 100) / 100;

  return {
    principle: 'timing',
    display_name: 'Timing',
    score,
    issues,
    zone_scores: zoneScores,
  };
}

function analyzeTimingForProfile(
  frames: { frame: number; displacement: number; isHold: boolean }[],
  avg: number,
  fps: number,
  zone: string,
  zoneName: string,
  ep: ExerciseProfile
): { issues: PrincipleIssue[]; score: number } {
  const issues: PrincipleIssue[] = [];

  if (frames.length < 4 || avg < 0.1) {
    return { issues: [], score: 1.0 };
  }

  // Rushed detection — uses exercise-specific threshold
  let runStart = -1;
  for (let i = 0; i <= frames.length; i++) {
    const isRushed = i < frames.length && frames[i].displacement > avg * ep.rushedRatio && !frames[i].isHold;
    if (isRushed && runStart === -1) {
      runStart = i;
    } else if (!isRushed && runStart !== -1) {
      const runLen = i - runStart;
      if (runLen >= ep.rushedMinFrames) {
        const startFrame = frames[runStart].frame;
        const endFrame = frames[i - 1].frame;
        const avgInRun = frames.slice(runStart, i).reduce((s, f) => s + f.displacement, 0) / runLen;
        issues.push({
          severity: runLen >= 5 ? 'high' : 'medium',
          frame_start: startFrame,
          frame_end: endFrame,
          timestamp_start: frameToTimestamp(startFrame, fps),
          timestamp_end: frameToTimestamp(endFrame, fps),
          description: `[${zoneName}] Frames ${startFrame}–${endFrame}: rushed timing. Displacement ${avgInRun.toFixed(1)}px/frame is ${(avgInRun / avg).toFixed(1)}x the ${zoneName.toLowerCase()} average.`,
          recommendation: `Slow down the ${zoneName.toLowerCase()} at frames ${startFrame}–${endFrame}. Add ${Math.ceil(runLen * 0.5)} in-between frames or reduce per-frame spacing by ${Math.round(((avgInRun - avg) / avgInRun) * 100)}%.`,
          measured_data: {
            zone,
            average_displacement_in_range: Math.round(avgInRun * 100) / 100,
            zone_average: Math.round(avg * 100) / 100,
            ratio: Math.round((avgInRun / avg) * 100) / 100,
          },
          confidence: 0.75,
          body_zone: zone,
          body_zone_display: zoneName,
        });
      }
      runStart = -1;
    }
  }

  // Dragging detection
  runStart = -1;
  for (let i = 0; i <= frames.length; i++) {
    const isDragging = i < frames.length && frames[i].displacement < avg * ep.draggingRatio && !frames[i].isHold;
    if (isDragging && runStart === -1) {
      runStart = i;
    } else if (!isDragging && runStart !== -1) {
      const runLen = i - runStart;
      if (runLen >= ep.draggingMinFrames) {
        const startFrame = frames[runStart].frame;
        const endFrame = frames[i - 1].frame;
        const avgInRun = frames.slice(runStart, i).reduce((s, f) => s + f.displacement, 0) / runLen;
        issues.push({
          severity: runLen >= 8 ? 'high' : 'medium',
          frame_start: startFrame,
          frame_end: endFrame,
          timestamp_start: frameToTimestamp(startFrame, fps),
          timestamp_end: frameToTimestamp(endFrame, fps),
          description: `[${zoneName}] Frames ${startFrame}–${endFrame}: timing drags. Displacement ${avgInRun.toFixed(1)}px/frame is only ${(avgInRun / avg).toFixed(2)}x the ${zoneName.toLowerCase()} average over ${runLen} frames.`,
          recommendation: `Speed up the ${zoneName.toLowerCase()} at frames ${startFrame}–${endFrame}. Remove ${Math.ceil(runLen * 0.3)} frames or increase spacing.`,
          measured_data: {
            zone,
            average_displacement_in_range: Math.round(avgInRun * 100) / 100,
            zone_average: Math.round(avg * 100) / 100,
            ratio: Math.round((avgInRun / avg) * 100) / 100,
          },
          confidence: 0.72,
          body_zone: zone,
          body_zone_display: zoneName,
        });
      }
      runStart = -1;
    }
  }

  const severity_weights = { low: 0.1, medium: 0.2, high: 0.35 };
  const penalty = issues.reduce((s, i) => s + severity_weights[i.severity], 0);
  const score = Math.max(0, Math.min(1, 1 - penalty));

  return { issues, score };
}
