import { PrincipleAnalysis, PrincipleIssue } from '../../types';
import { PrincipleContext, frameToTimestamp } from './types';

/**
 * Solid Drawing: track consistency of proportions/silhouette across frames.
 * Large sudden changes in bounding box aspect ratio may indicate proportion issues.
 */
export function analyzeSolidDrawing(ctx: PrincipleContext): PrincipleAnalysis {
  const issues: PrincipleIssue[] = [];
  const { perFrame } = ctx.motionProfile;
  const fps = ctx.metadata.fps;

  // Collect frames with bounding boxes
  const withBBox = perFrame.filter((f) => f.motionBBox !== null && !f.isHold);
  if (withBBox.length < 5) {
    return { principle: 'solid_drawing', display_name: 'Solid Drawing', score: 1.0, issues: [] };
  }

  // Compute aspect ratios
  const ratios = withBBox.map((f) => {
    const bb = f.motionBBox!;
    return { frame: f.frame, ratio: bb.h > 0 ? bb.w / bb.h : 1, w: bb.w, h: bb.h };
  });

  const avgRatio = ratios.reduce((s, r) => s + r.ratio, 0) / ratios.length;

  // Find sudden aspect ratio changes between consecutive frames
  for (let i = 1; i < ratios.length; i++) {
    const change = Math.abs(ratios[i].ratio - ratios[i - 1].ratio);
    const relChange = avgRatio > 0 ? change / avgRatio : change;

    if (relChange > 0.4) {
      issues.push({
        severity: relChange > 0.7 ? 'high' : 'medium',
        frame_start: ratios[i - 1].frame,
        frame_end: ratios[i].frame,
        timestamp_start: frameToTimestamp(ratios[i - 1].frame, fps),
        timestamp_end: frameToTimestamp(ratios[i].frame, fps),
        description: `Silhouette aspect ratio changes by ${(relChange * 100).toFixed(0)}% between frames ${ratios[i - 1].frame}→${ratios[i].frame} (${ratios[i - 1].ratio.toFixed(2)} → ${ratios[i].ratio.toFixed(2)}). This may indicate inconsistent proportions or a drawing error.`,
        recommendation: `Check the character drawing at frames ${ratios[i - 1].frame}–${ratios[i].frame}. Ensure proportions (width:height ratio) stay consistent unless intentional squash/stretch is applied.`,
        measured_data: {
          ratio_before: Math.round(ratios[i - 1].ratio * 100) / 100,
          ratio_after: Math.round(ratios[i].ratio * 100) / 100,
          relative_change: Math.round(relChange * 100) / 100,
          average_ratio: Math.round(avgRatio * 100) / 100,
        },
        confidence: 0.55, // Bounding box is an approximation of silhouette
      });
    }
  }

  const severity_weights = { low: 0.06, medium: 0.14, high: 0.25 };
  const penalty = issues.reduce((s, i) => s + severity_weights[i.severity], 0);
  const score = Math.max(0, Math.min(1, 1 - penalty));

  return {
    principle: 'solid_drawing',
    display_name: 'Solid Drawing',
    score: Math.round(score * 100) / 100,
    issues,
  };
}
