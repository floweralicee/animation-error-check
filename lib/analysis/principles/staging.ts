import { PrincipleAnalysis, PrincipleIssue } from '../../types';
import { PrincipleContext, frameToTimestamp } from './types';

/**
 * Staging: analyze where the primary action sits in the frame.
 * Good staging places the action in a clear, readable position.
 */
export function analyzeStaging(ctx: PrincipleContext): PrincipleAnalysis {
  const issues: PrincipleIssue[] = [];
  const { perFrame, primaryRegion } = ctx.motionProfile;
  const fps = ctx.metadata.fps;

  if (perFrame.length < 3 || !primaryRegion) {
    return { principle: 'staging', display_name: 'Staging', score: 1.0, issues: [] };
  }

  // Analyze primary region position relative to frame (normalized to 320x240 analysis resolution)
  const frameW = 320;
  const frameH = 240;
  const regionCenterX = (primaryRegion.x + primaryRegion.w / 2) / frameW;
  const regionCenterY = (primaryRegion.y + primaryRegion.h / 2) / frameH;
  const regionCoverage = (primaryRegion.w * primaryRegion.h) / (frameW * frameH);

  const firstFrame = perFrame[0]?.frame ?? 0;
  const lastFrame = perFrame[perFrame.length - 1]?.frame ?? 0;

  // Check if action is in extreme edges
  if (regionCenterY < 0.1 || regionCenterY > 0.9) {
    const position = regionCenterY < 0.1 ? 'top' : 'bottom';
    issues.push({
      severity: 'medium',
      frame_start: firstFrame,
      frame_end: lastFrame,
      timestamp_start: frameToTimestamp(firstFrame, fps),
      timestamp_end: frameToTimestamp(lastFrame, fps),
      description: `Primary action is at the extreme ${position} of the frame (Y: ${(regionCenterY * 100).toFixed(0)}%). This reduces readability and visual impact.`,
      recommendation: `Reframe the camera or reposition the character so the main action is closer to center. Ideal range: 20–80% vertically.`,
      measured_data: {
        region_center_y: Math.round(regionCenterY * 100) / 100,
        region_center_x: Math.round(regionCenterX * 100) / 100,
      },
      confidence: 0.7,
    });
  }

  if (regionCenterX < 0.1 || regionCenterX > 0.9) {
    const position = regionCenterX < 0.1 ? 'left edge' : 'right edge';
    issues.push({
      severity: 'low',
      frame_start: firstFrame,
      frame_end: lastFrame,
      timestamp_start: frameToTimestamp(firstFrame, fps),
      timestamp_end: frameToTimestamp(lastFrame, fps),
      description: `Primary action is near the ${position} of the frame (X: ${(regionCenterX * 100).toFixed(0)}%). The action may feel cramped.`,
      recommendation: `Give the character more room in the direction of motion. Position the action with some lead space.`,
      measured_data: {
        region_center_x: Math.round(regionCenterX * 100) / 100,
      },
      confidence: 0.6,
    });
  }

  // Check if action region is too small (hard to read)
  if (regionCoverage < 0.05) {
    issues.push({
      severity: 'medium',
      frame_start: firstFrame,
      frame_end: lastFrame,
      timestamp_start: frameToTimestamp(firstFrame, fps),
      timestamp_end: frameToTimestamp(lastFrame, fps),
      description: `The main action occupies only ${(regionCoverage * 100).toFixed(1)}% of the frame. The movement may be hard to read.`,
      recommendation: `Zoom in or scale the character up so the action is more prominent. Aim for the subject to fill at least 10–25% of the frame.`,
      measured_data: {
        region_coverage_pct: Math.round(regionCoverage * 1000) / 10,
        region_width: primaryRegion.w,
        region_height: primaryRegion.h,
      },
      confidence: 0.65,
    });
  }

  // Check if action region is too large (fills whole frame, no breathing room)
  if (regionCoverage > 0.8) {
    issues.push({
      severity: 'low',
      frame_start: firstFrame,
      frame_end: lastFrame,
      timestamp_start: frameToTimestamp(firstFrame, fps),
      timestamp_end: frameToTimestamp(lastFrame, fps),
      description: `The motion region fills ${(regionCoverage * 100).toFixed(0)}% of the frame. There may not be enough negative space for visual clarity.`,
      recommendation: `Consider pulling the camera back slightly to give the action some breathing room.`,
      measured_data: {
        region_coverage_pct: Math.round(regionCoverage * 1000) / 10,
      },
      confidence: 0.5,
    });
  }

  const severity_weights = { low: 0.06, medium: 0.15, high: 0.28 };
  const penalty = issues.reduce((s, i) => s + severity_weights[i.severity], 0);
  const score = Math.max(0, Math.min(1, 1 - penalty));

  return {
    principle: 'staging',
    display_name: 'Staging',
    score: Math.round(score * 100) / 100,
    issues,
  };
}
