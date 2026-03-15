import { PrincipleAnalysis, PrincipleIssue } from '../../types';
import { PrincipleContext, frameToTimestamp } from './types';
import { ZoneMotionProfile } from '../bodyZones';
import { analyzeVelocityCurve } from '../velocityCurve';

/**
 * Slow In / Slow Out (Ease): per-zone velocity curve analysis.
 * Checks each body zone independently for proper easing.
 */
export function analyzeSpacing(ctx: PrincipleContext): PrincipleAnalysis {
  const issues: PrincipleIssue[] = [];
  const fps = ctx.metadata.fps;
  const zoneScores: Record<string, number> = {};

  const ep = ctx.exerciseProfile;

  // Whole-body analysis
  const wholeBody = analyzeSpacingForFrames(
    ctx.motionProfile.perFrame.map((f) => ({ frame: f.frame, displacement: f.displacement, isHold: f.isHold })),
    fps, 'whole_body', 'Whole Body', ep.constantVelocityCV, ep.easeInMaxStartRatio, ep.easeOutMaxEndRatio
  );
  issues.push(...wholeBody.issues);
  zoneScores['whole_body'] = wholeBody.score;

  // Per-zone
  for (const zone of ctx.zoneProfiles) {
    if (zone.motionFrameCount < 5) {
      zoneScores[zone.zone] = 1.0;
      continue;
    }
    const result = analyzeSpacingForFrames(zone.perFrame, fps, zone.zone, zone.displayName, ep.constantVelocityCV, ep.easeInMaxStartRatio, ep.easeOutMaxEndRatio);
    issues.push(...result.issues);
    zoneScores[zone.zone] = result.score;
  }

  const zoneKeys = Object.keys(zoneScores).filter((k) => k !== 'whole_body');
  const zoneAvg = zoneKeys.length > 0
    ? zoneKeys.reduce((s, k) => s + zoneScores[k], 0) / zoneKeys.length
    : 1.0;
  const score = Math.round((zoneScores['whole_body'] * 0.4 + zoneAvg * 0.6) * 100) / 100;

  return {
    principle: 'slow_in_slow_out',
    display_name: 'Slow In / Slow Out',
    score,
    issues,
    zone_scores: zoneScores,
  };
}

function analyzeSpacingForFrames(
  frames: { frame: number; displacement: number; isHold: boolean }[],
  fps: number,
  zone: string,
  zoneName: string,
  cvThreshold: number = 0.15,
  easeInThreshold: number = 0.75,
  easeOutThreshold: number = 0.75
): { issues: PrincipleIssue[]; score: number } {
  const issues: PrincipleIssue[] = [];
  if (frames.length < 5) return { issues: [], score: 1.0 };

  // Find motion segments
  const segments: { start: number; end: number }[] = [];
  let segStart = -1;
  for (let i = 0; i <= frames.length; i++) {
    if (i < frames.length && !frames[i].isHold) {
      if (segStart === -1) segStart = i;
    } else {
      if (segStart !== -1 && i - segStart >= 4) {
        segments.push({ start: segStart, end: i - 1 });
      }
      segStart = -1;
    }
  }

  for (const seg of segments) {
    const slice = frames.slice(seg.start, seg.end + 1);
    const disps = slice.map((f) => f.displacement);
    const avg = disps.reduce((a, b) => a + b, 0) / disps.length;
    if (avg < 0.2) continue;

    const variance = disps.reduce((s, d) => s + (d - avg) ** 2, 0) / disps.length;
    const cv = Math.sqrt(variance) / avg;

    // Velocity curve analysis for this segment
    const segDisplacements = disps;
    const curveAnalysis = analyzeVelocityCurve(segDisplacements, fps);

    // Constant velocity — use exercise-specific threshold
    if (cv < cvThreshold && slice.length >= 5) {
      const easingNote = curveAnalysis.bestFitEasing === 'linear'
        ? ` Velocity curve is linear (fit quality: ${(curveAnalysis.fitQuality * 100).toFixed(0)}%).`
        : ` Best-fit curve: ${curveAnalysis.bestFitEasing} (fit: ${(curveAnalysis.fitQuality * 100).toFixed(0)}%).`;
      issues.push({
        severity: cv < cvThreshold * 0.5 ? 'high' : 'medium',
        frame_start: slice[0].frame,
        frame_end: slice[slice.length - 1].frame,
        timestamp_start: frameToTimestamp(slice[0].frame, fps),
        timestamp_end: frameToTimestamp(slice[slice.length - 1].frame, fps),
        description: `[${zoneName}] Frames ${slice[0].frame}–${slice[slice.length - 1].frame}: constant velocity (CV: ${cv.toFixed(3)}).${easingNote} The ${zoneName.toLowerCase()} moves at the same speed throughout — feels mechanical.`,
        recommendation: `Add ease-in/ease-out to the ${zoneName.toLowerCase()}. In the Graph Editor, convert linear tangents to spline. Use AnimBot Butter to smooth the curves. The ${zoneName.toLowerCase()} should accelerate into the motion and decelerate out of it.`,
        measured_data: {
          zone,
          coefficient_of_variation: Math.round(cv * 1000) / 1000,
          segment_length: slice.length,
          velocity_curve: curveAnalysis.bestFitEasing,
          curve_fit_quality: curveAnalysis.fitQuality,
          average_jerk: curveAnalysis.averageJerk,
          jerk_smoothness: curveAnalysis.jerkSmoothness,
        },
        confidence: 0.78,
        body_zone: zone,
        body_zone_display: zoneName,
      });
    }

    // Missing ease-in
    const easeN = Math.min(3, Math.floor(slice.length * 0.25));
    const firstAvg = disps.slice(0, easeN).reduce((a, b) => a + b, 0) / easeN;
    if (firstAvg > avg * easeInThreshold && slice.length >= 6) {
      issues.push({
        severity: 'medium',
        frame_start: slice[0].frame,
        frame_end: slice[easeN - 1]?.frame ?? slice[0].frame,
        timestamp_start: frameToTimestamp(slice[0].frame, fps),
        timestamp_end: frameToTimestamp(slice[easeN - 1]?.frame ?? slice[0].frame, fps),
        description: `[${zoneName}] No ease-in detected. The ${zoneName.toLowerCase()} starts at ${Math.round((firstAvg / avg) * 100)}% of average velocity — jumps straight to full speed.`,
        recommendation: `Add slow-in to the ${zoneName.toLowerCase()} at frames ${slice[0].frame}–${slice[0].frame + easeN + 1}. Flatten the outgoing tangent at the start key so the ${zoneName.toLowerCase()} gradually accelerates.`,
        measured_data: { zone, start_velocity_ratio: Math.round((firstAvg / avg) * 100) / 100 },
        confidence: 0.68,
        body_zone: zone,
        body_zone_display: zoneName,
      });
    }

    // Missing ease-out
    const lastAvg = disps.slice(-easeN).reduce((a, b) => a + b, 0) / easeN;
    if (lastAvg > avg * easeOutThreshold && slice.length >= 6) {
      const endStart = slice[slice.length - easeN]?.frame ?? slice[slice.length - 1].frame;
      issues.push({
        severity: 'medium',
        frame_start: endStart,
        frame_end: slice[slice.length - 1].frame,
        timestamp_start: frameToTimestamp(endStart, fps),
        timestamp_end: frameToTimestamp(slice[slice.length - 1].frame, fps),
        description: `[${zoneName}] No ease-out detected. The ${zoneName.toLowerCase()} ends at ${Math.round((lastAvg / avg) * 100)}% of average velocity — stops abruptly.`,
        recommendation: `Add slow-out to the ${zoneName.toLowerCase()} at frames ${endStart}–${slice[slice.length - 1].frame}. Use OverShooter to add a subtle settle, or flatten the incoming tangent at the end key.`,
        measured_data: { zone, end_velocity_ratio: Math.round((lastAvg / avg) * 100) / 100 },
        confidence: 0.68,
        body_zone: zone,
        body_zone_display: zoneName,
      });
    }
  }

  const severity_weights = { low: 0.08, medium: 0.18, high: 0.32 };
  const penalty = issues.reduce((s, i) => s + severity_weights[i.severity], 0);
  const score = Math.max(0, Math.min(1, 1 - penalty));
  return { issues, score };
}
