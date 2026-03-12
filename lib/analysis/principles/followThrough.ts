import { PrincipleAnalysis, PrincipleIssue } from '../../types';
import { PrincipleContext, frameToTimestamp } from './types';

/**
 * Follow Through / Overlapping Action: per-zone abrupt stop detection.
 * Different body parts should stop at different times (overlap).
 */
export function analyzeFollowThrough(ctx: PrincipleContext): PrincipleAnalysis {
  const issues: PrincipleIssue[] = [];
  const fps = ctx.metadata.fps;
  const zoneScores: Record<string, number> = {};

  // Whole body
  const wholeResult = analyzeStopsForFrames(
    ctx.motionProfile.perFrame.map((f) => ({ frame: f.frame, displacement: f.displacement, isHold: f.isHold })),
    ctx.motionProfile.averageDisplacement,
    fps, 'whole_body', 'Whole Body'
  );
  issues.push(...wholeResult.issues);
  zoneScores['whole_body'] = wholeResult.score;

  // Per-zone: detect if all zones stop at the same frame (no overlap)
  for (const zone of ctx.zoneProfiles) {
    if (zone.motionFrameCount < 4) {
      zoneScores[zone.zone] = 1.0;
      continue;
    }
    const result = analyzeStopsForFrames(zone.perFrame, zone.averageDisplacement, fps, zone.zone, zone.displayName);
    issues.push(...result.issues);
    zoneScores[zone.zone] = result.score;
  }

  // Check for simultaneous stops (lack of overlapping action)
  if (ctx.zoneProfiles.length >= 3) {
    const stopFrames: { zone: string; displayName: string; frame: number }[] = [];
    for (const zone of ctx.zoneProfiles) {
      // Find last motion frame before a long hold
      for (let i = zone.perFrame.length - 1; i >= 0; i--) {
        if (!zone.perFrame[i].isHold && zone.perFrame[i].displacement > 0.3) {
          stopFrames.push({ zone: zone.zone, displayName: zone.displayName, frame: zone.perFrame[i].frame });
          break;
        }
      }
    }

    if (stopFrames.length >= 3) {
      const frames = stopFrames.map((s) => s.frame);
      const range = Math.max(...frames) - Math.min(...frames);
      // If all zones stop within 2 frames of each other, it's too simultaneous
      if (range <= 2) {
        const firstFrame = Math.min(...frames);
        const lastFrame = Math.max(...frames);
        issues.push({
          severity: 'medium',
          frame_start: firstFrame,
          frame_end: lastFrame + 4,
          timestamp_start: frameToTimestamp(firstFrame, fps),
          timestamp_end: frameToTimestamp(lastFrame + 4, fps),
          description: `All body zones stop within ${range} frames of each other (frames ${firstFrame}–${lastFrame}). There is no overlapping action — everything halts simultaneously.`,
          recommendation: `Offset the stops: let the body/core settle first, then the head 2–3 frames later, then the arms/hands 3–5 frames after that. Use AnimBot Offset Keys to shift secondary controls by 2–4 frames. Apply OverShooter with a 2-frame delay on extremities.`,
          measured_data: {
            stop_frame_range: range,
            zone_stop_frames: Object.fromEntries(stopFrames.map((s) => [s.zone, s.frame])),
          },
          confidence: 0.7,
          body_zone: 'whole_body',
          body_zone_display: 'All Zones',
        });
      }
    }
  }

  const zoneKeys = Object.keys(zoneScores).filter((k) => k !== 'whole_body');
  const zoneAvg = zoneKeys.length > 0
    ? zoneKeys.reduce((s, k) => s + zoneScores[k], 0) / zoneKeys.length
    : 1.0;
  const score = Math.round((zoneScores['whole_body'] * 0.3 + zoneAvg * 0.7) * 100) / 100;

  return {
    principle: 'follow_through',
    display_name: 'Follow Through & Overlapping Action',
    score,
    issues,
    zone_scores: zoneScores,
  };
}

function analyzeStopsForFrames(
  frames: { frame: number; displacement: number; isHold: boolean }[],
  avg: number,
  fps: number,
  zone: string,
  zoneName: string
): { issues: PrincipleIssue[]; score: number } {
  const issues: PrincipleIssue[] = [];
  if (frames.length < 5 || avg < 0.2) return { issues: [], score: 1.0 };

  for (let i = 1; i < frames.length - 2; i++) {
    const curr = frames[i].displacement;
    if (curr < avg * 1.5) continue;

    const next1 = frames[i + 1]?.displacement ?? 0;
    const next2 = frames[i + 2]?.displacement ?? 0;
    const dropRatio1 = next1 / curr;

    const isAbrupt = dropRatio1 < 0.3 || (dropRatio1 < 0.5 && (next2 / curr) < 0.15);

    if (isAbrupt) {
      const peakFrame = frames[i].frame;
      const stopFrame = frames[Math.min(i + 2, frames.length - 1)].frame;
      issues.push({
        severity: dropRatio1 < 0.15 ? 'high' : 'medium',
        frame_start: peakFrame,
        frame_end: stopFrame,
        timestamp_start: frameToTimestamp(peakFrame, fps),
        timestamp_end: frameToTimestamp(stopFrame, fps),
        description: `[${zoneName}] Motion at frame ${peakFrame} (${curr.toFixed(1)}px) drops to ${next1.toFixed(1)}px — the ${zoneName.toLowerCase()} stops too abruptly.`,
        recommendation: `Add 3–5 frames of settling to the ${zoneName.toLowerCase()} after frame ${peakFrame}. Use OverShooter on the ${zoneName.toLowerCase()} controls: set amplitude 15-25%, 2-3 oscillations, fast decay. The ${zoneName.toLowerCase()} should overshoot slightly past the target and settle back.`,
        measured_data: {
          zone,
          peak_displacement: Math.round(curr * 100) / 100,
          next_displacement: Math.round(next1 * 100) / 100,
          drop_ratio: Math.round(dropRatio1 * 100) / 100,
        },
        confidence: 0.72,
        body_zone: zone,
        body_zone_display: zoneName,
      });
    }
  }

  const severity_weights = { low: 0.08, medium: 0.18, high: 0.3 };
  const penalty = issues.reduce((s, i) => s + severity_weights[i.severity], 0);
  const score = Math.max(0, Math.min(1, 1 - penalty));
  return { issues, score };
}
