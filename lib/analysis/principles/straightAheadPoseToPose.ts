import { PrincipleAnalysis, PrincipleIssue } from '../../types';
import { PrincipleContext, frameToTimestamp, findMotionSegments } from './types';

/**
 * Straight Ahead vs Pose to Pose: detect interpolation patterns.
 * Perfectly even spacing with minimal variation → likely linear interpolation (pose-to-pose with no easing).
 * This isn't inherently wrong but flags suspiciously mechanical motion.
 */
export function analyzeStraightAheadPoseToPose(ctx: PrincipleContext): PrincipleAnalysis {
  const issues: PrincipleIssue[] = [];
  const { perFrame } = ctx.motionProfile;
  const fps = ctx.metadata.fps;

  if (perFrame.length < 8) {
    return { principle: 'straight_ahead_pose_to_pose', display_name: 'Straight Ahead / Pose to Pose', score: 1.0, issues: [] };
  }

  const segments = findMotionSegments(ctx, 6);

  for (const seg of segments) {
    const slice = perFrame.slice(seg.startIdx, seg.endIdx + 1);
    if (slice.length < 6) continue;

    const disps = slice.map((f) => f.displacement);
    const avg = disps.reduce((a, b) => a + b, 0) / disps.length;
    if (avg < 0.2) continue;

    // Compute successive differences to detect interpolation pattern
    const diffs: number[] = [];
    for (let i = 1; i < disps.length; i++) {
      diffs.push(disps[i] - disps[i - 1]);
    }

    const diffAvg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const diffVariance = diffs.reduce((s, d) => s + (d - diffAvg) ** 2, 0) / diffs.length;
    const diffCV = Math.abs(diffAvg) > 0.01 ? Math.sqrt(diffVariance) / Math.abs(diffAvg) : Math.sqrt(diffVariance);

    // Also check the displacement values directly
    const dispVariance = disps.reduce((s, d) => s + (d - avg) ** 2, 0) / disps.length;
    const dispCV = avg > 0 ? Math.sqrt(dispVariance) / avg : 0;

    // Suspiciously mechanical: very low variance in both displacement and rate of change
    if (dispCV < 0.12 && slice.length >= 8) {
      issues.push({
        severity: 'medium',
        frame_start: seg.startFrame,
        frame_end: seg.endFrame,
        timestamp_start: frameToTimestamp(seg.startFrame, fps),
        timestamp_end: frameToTimestamp(seg.endFrame, fps),
        description: `Frames ${seg.startFrame}–${seg.endFrame} show highly uniform spacing (CV: ${dispCV.toFixed(3)}). This suggests linear interpolation between key poses without manual in-betweening.`,
        recommendation: `Review the in-betweens at frames ${seg.startFrame}–${seg.endFrame}. If these are computer-generated tweens, consider hand-adjusting the spacing curves to add organic variation. Break the evenness with slight timing offsets.`,
        measured_data: {
          displacement_cv: Math.round(dispCV * 1000) / 1000,
          displacement_variance: Math.round(dispVariance * 1000) / 1000,
          successive_diff_cv: Math.round(diffCV * 1000) / 1000,
          segment_length: slice.length,
        },
        confidence: 0.6,
      });
    }
  }

  const severity_weights = { low: 0.06, medium: 0.14, high: 0.25 };
  const penalty = issues.reduce((s, i) => s + severity_weights[i.severity], 0);
  const score = Math.max(0, Math.min(1, 1 - penalty));

  return {
    principle: 'straight_ahead_pose_to_pose',
    display_name: 'Straight Ahead / Pose to Pose',
    score: Math.round(score * 100) / 100,
    issues,
  };
}
