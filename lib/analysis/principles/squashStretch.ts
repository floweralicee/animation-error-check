import { PrincipleAnalysis, PrincipleIssue } from '../../types';
import { PrincipleContext, frameToTimestamp } from './types';

/**
 * Squash and Stretch: detect whether volume/area changes occur during high-acceleration moments.
 * Good animation shows squash on impact and stretch during fast movement.
 * We approximate by tracking the bounding box area of the motion region.
 */
export function analyzeSquashStretch(ctx: PrincipleContext): PrincipleAnalysis {
  const issues: PrincipleIssue[] = [];
  const { perFrame } = ctx.motionProfile;
  const fps = ctx.metadata.fps;

  if (perFrame.length < 6) {
    return { principle: 'squash_stretch', display_name: 'Squash & Stretch', score: 1.0, issues: [] };
  }

  // Get frames with area data
  const withArea = perFrame.filter((f) => f.motionBBox !== null && f.motionArea > 0);
  if (withArea.length < 4) {
    return { principle: 'squash_stretch', display_name: 'Squash & Stretch', score: 1.0, issues: [] };
  }

  const areas = withArea.map((f) => f.motionArea);
  const avgArea = areas.reduce((a, b) => a + b, 0) / areas.length;
  if (avgArea < 10) {
    return { principle: 'squash_stretch', display_name: 'Squash & Stretch', score: 1.0, issues: [] };
  }

  // Find high-acceleration moments (direction changes or large acceleration)
  for (let i = 1; i < perFrame.length - 1; i++) {
    const accel = Math.abs(perFrame[i].acceleration);
    const avgDisp = ctx.motionProfile.averageDisplacement;
    if (accel < avgDisp * 1.5) continue; // not a significant acceleration moment

    // Check if the bounding box area changed near this moment
    const nearbyFrames = perFrame.slice(Math.max(0, i - 1), Math.min(perFrame.length, i + 2));
    const nearbyAreas = nearbyFrames
      .filter((f) => f.motionArea > 0)
      .map((f) => f.motionArea);

    if (nearbyAreas.length < 2) continue;

    const areaVariation =
      (Math.max(...nearbyAreas) - Math.min(...nearbyAreas)) / avgArea;

    // If there's a significant acceleration but very little area change → missing squash/stretch
    if (areaVariation < 0.1) {
      const frame = perFrame[i].frame;
      issues.push({
        severity: accel > avgDisp * 3 ? 'medium' : 'low',
        frame_start: perFrame[Math.max(0, i - 1)].frame,
        frame_end: perFrame[Math.min(perFrame.length - 1, i + 1)].frame,
        timestamp_start: frameToTimestamp(perFrame[Math.max(0, i - 1)].frame, fps),
        timestamp_end: frameToTimestamp(perFrame[Math.min(perFrame.length - 1, i + 1)].frame, fps),
        description: `High acceleration at frame ${frame} (${accel.toFixed(1)}px/frame²) with minimal volume change (area variation: ${(areaVariation * 100).toFixed(1)}%). The shape appears rigid.`,
        recommendation: `Add squash at frame ${frame} (compress the character along the motion direction) or stretch in the frames leading up to it. The silhouette should deform during rapid direction changes.`,
        measured_data: {
          acceleration: Math.round(accel * 100) / 100,
          area_variation_pct: Math.round(areaVariation * 1000) / 10,
          average_area: Math.round(avgArea),
        },
        confidence: 0.55, // Lower confidence — bounding box area is a rough proxy
      });
    }
  }

  const severity_weights = { low: 0.06, medium: 0.15, high: 0.28 };
  const penalty = issues.reduce((s, i) => s + severity_weights[i.severity], 0);
  const score = Math.max(0, Math.min(1, 1 - penalty));

  return {
    principle: 'squash_stretch',
    display_name: 'Squash & Stretch',
    score: Math.round(score * 100) / 100,
    issues,
  };
}
