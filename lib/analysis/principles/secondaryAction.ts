import { PrincipleAnalysis, PrincipleIssue } from '../../types';
import { PrincipleContext, frameToTimestamp } from './types';

/**
 * Secondary Action: detect if there are multiple independent motion regions.
 * Good animation has secondary motion (hair, clothing, etc.) supporting the primary action.
 */
export function analyzeSecondaryAction(ctx: PrincipleContext): PrincipleAnalysis {
  const issues: PrincipleIssue[] = [];
  const fps = ctx.metadata.fps;
  const mvs = ctx.motionVectors;

  if (mvs.length < 3) {
    return { principle: 'secondary_action', display_name: 'Secondary Action', score: 1.0, issues: [] };
  }

  const MOTION_THRESHOLD = 1.0;
  let totalFramePairs = 0;
  let singleRegionCount = 0;

  for (const fmv of mvs) {
    const movingBlocks = fmv.vectors.filter((v) => v.magnitude > MOTION_THRESHOLD);
    if (movingBlocks.length < 3) continue; // not enough motion to judge

    totalFramePairs++;

    // Cluster moving blocks: find connected regions
    const grid: boolean[][] = Array.from({ length: fmv.gridRows }, () =>
      new Array(fmv.gridCols).fill(false)
    );
    for (const v of movingBlocks) {
      grid[v.by][v.bx] = true;
    }

    // Simple flood-fill to count regions
    const visited: boolean[][] = Array.from({ length: fmv.gridRows }, () =>
      new Array(fmv.gridCols).fill(false)
    );
    let regionCount = 0;

    for (let y = 0; y < fmv.gridRows; y++) {
      for (let x = 0; x < fmv.gridCols; x++) {
        if (grid[y][x] && !visited[y][x]) {
          // Flood fill
          const stack: [number, number][] = [[x, y]];
          let size = 0;
          while (stack.length > 0) {
            const [cx, cy] = stack.pop()!;
            if (cx < 0 || cx >= fmv.gridCols || cy < 0 || cy >= fmv.gridRows) continue;
            if (visited[cy][cx] || !grid[cy][cx]) continue;
            visited[cy][cx] = true;
            size++;
            stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
          }
          if (size >= 2) regionCount++; // Only count regions with 2+ blocks
        }
      }
    }

    if (regionCount <= 1) {
      singleRegionCount++;
    }
  }

  if (totalFramePairs > 0) {
    const singleRegionRatio = singleRegionCount / totalFramePairs;

    if (singleRegionRatio > 0.8 && totalFramePairs >= 5) {
      const firstFrame = ctx.motionProfile.perFrame[0]?.frame ?? 0;
      const lastFrame = ctx.motionProfile.perFrame[ctx.motionProfile.perFrame.length - 1]?.frame ?? 0;
      issues.push({
        severity: singleRegionRatio > 0.95 ? 'medium' : 'low',
        frame_start: firstFrame,
        frame_end: lastFrame,
        timestamp_start: frameToTimestamp(firstFrame, fps),
        timestamp_end: frameToTimestamp(lastFrame, fps),
        description: `${Math.round(singleRegionRatio * 100)}% of motion frames show only a single motion region. The animation may lack secondary motion (hair, clothing, tail, environmental elements).`,
        recommendation: `Consider adding overlapping secondary motion — elements that move independently from the main action (e.g., hair dragging behind, clothing settling, a prop bouncing). This adds life and complexity.`,
        measured_data: {
          single_region_ratio: Math.round(singleRegionRatio * 100) / 100,
          total_frame_pairs_analyzed: totalFramePairs,
          single_region_frames: singleRegionCount,
        },
        confidence: 0.5, // Soft flag — pixel-level regions may not match semantic objects
      });
    }
  }

  const severity_weights = { low: 0.06, medium: 0.12, high: 0.25 };
  const penalty = issues.reduce((s, i) => s + severity_weights[i.severity], 0);
  const score = Math.max(0, Math.min(1, 1 - penalty));

  return {
    principle: 'secondary_action',
    display_name: 'Secondary Action',
    score: Math.round(score * 100) / 100,
    issues,
  };
}
