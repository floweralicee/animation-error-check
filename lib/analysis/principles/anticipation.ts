import { PrincipleAnalysis, PrincipleIssue } from '../../types';
import { PrincipleContext, frameToTimestamp } from './types';

/**
 * Anticipation: detect if large movements have preparatory motion before them.
 * Good animation has a small reverse movement before a big action.
 */
export function analyzeAnticipation(ctx: PrincipleContext): PrincipleAnalysis {
  const issues: PrincipleIssue[] = [];
  const { perFrame } = ctx.motionProfile;
  const fps = ctx.metadata.fps;
  const avg = ctx.motionProfile.averageDisplacement;

  if (perFrame.length < 6 || avg < 0.2) {
    return { principle: 'anticipation', display_name: 'Anticipation', score: 1.0, issues: [] };
  }

  const mvs = ctx.motionVectors;

  const ep = ctx.exerciseProfile;

  // Find large motion events: frames where displacement > threshold × average
  for (let i = 0; i < perFrame.length; i++) {
    if (perFrame[i].displacement <= avg * ep.bigMoveRatio) continue;
    if (i < 3) continue; // not enough preceding frames to check

    // Get dominant direction of the big move
    const bigMoveDir = perFrame[i].directionDeg;

    // Check preceding frames for reverse motion — exercise-specific lookback
    const lookback = Math.min(ep.anticipationLookback, i);
    let hasAnticipation = false;
    for (let j = i - lookback; j < i; j++) {
      if (perFrame[j].isHold) continue;
      // Check if direction is roughly opposite (within 120-240° of big move)
      const dirDiff = Math.abs(((perFrame[j].directionDeg - bigMoveDir + 180) % 360) - 180);
      if (dirDiff > 120 && perFrame[j].displacement > avg * 0.15) {
        hasAnticipation = true;
        break;
      }
    }

    if (!hasAnticipation) {
      const startFrame = perFrame[Math.max(0, i - 3)].frame;
      const eventFrame = perFrame[i].frame;
      issues.push({
        severity: perFrame[i].displacement > avg * 3 ? 'high' : 'medium',
        frame_start: startFrame,
        frame_end: eventFrame,
        timestamp_start: frameToTimestamp(startFrame, fps),
        timestamp_end: frameToTimestamp(eventFrame, fps),
        description: `Large motion at frame ${eventFrame} (${perFrame[i].displacement.toFixed(1)}px, ${(perFrame[i].displacement / avg).toFixed(1)}x average) has no anticipatory movement in the preceding ${lookback} frames.`,
        recommendation: `Add 2–4 frames of small reverse motion before frame ${eventFrame}. The character should "wind up" in the opposite direction (around ${((bigMoveDir + 180) % 360).toFixed(0)}°) before the main action.`,
        measured_data: {
          event_displacement: Math.round(perFrame[i].displacement * 100) / 100,
          event_direction_deg: Math.round(bigMoveDir),
          clip_average: Math.round(avg * 100) / 100,
          lookback_frames: lookback,
        },
        confidence: 0.65,
      });
    }
  }

  const severity_weights = { low: 0.08, medium: 0.18, high: 0.3 };
  const penalty = issues.reduce((s, i) => s + severity_weights[i.severity], 0);
  const score = Math.max(0, Math.min(1, 1 - penalty));

  return {
    principle: 'anticipation',
    display_name: 'Anticipation',
    score: Math.round(score * 100) / 100,
    issues,
  };
}
