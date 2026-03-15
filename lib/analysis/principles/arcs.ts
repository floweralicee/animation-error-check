import { PrincipleAnalysis, PrincipleIssue } from '../../types';
import { PrincipleContext, frameToTimestamp } from './types';
import { ZoneMotionProfile } from '../bodyZones';

/**
 * Arcs: track motion paths per body zone and detect linear/jerky paths.
 * The head, hands, and feet should follow smooth arcs in natural motion.
 */
export function analyzeArcs(ctx: PrincipleContext): PrincipleAnalysis {
  const issues: PrincipleIssue[] = [];
  const fps = ctx.metadata.fps;
  const zoneScores: Record<string, number> = {};

  const ep = ctx.exerciseProfile;

  // Whole-body arc analysis
  const wholeResult = analyzeArcForPath(
    ctx.motionProfile.motionPath, fps, 'whole_body', 'Whole Body', ep.arcMinCurvature, ep.arcMaxDeviation
  );
  issues.push(...wholeResult.issues);
  zoneScores['whole_body'] = wholeResult.score;

  // Per-zone arc analysis — head, arms, and legs are most important for arcs
  for (const zone of ctx.zoneProfiles) {
    if (zone.motionPath.length < 5) {
      zoneScores[zone.zone] = 1.0;
      continue;
    }
    const result = analyzeArcForPath(zone.motionPath, fps, zone.zone, zone.displayName, ep.arcMinCurvature, ep.arcMaxDeviation);
    issues.push(...result.issues);
    zoneScores[zone.zone] = result.score;
  }

  const zoneKeys = Object.keys(zoneScores).filter((k) => k !== 'whole_body');
  const zoneAvg = zoneKeys.length > 0
    ? zoneKeys.reduce((s, k) => s + zoneScores[k], 0) / zoneKeys.length
    : 1.0;
  const score = Math.round((zoneScores['whole_body'] * 0.3 + zoneAvg * 0.7) * 100) / 100;

  return {
    principle: 'arcs',
    display_name: 'Arcs',
    score,
    issues,
    zone_scores: zoneScores,
  };
}

function analyzeArcForPath(
  path: { frame: number; x: number; y: number }[],
  fps: number,
  zone: string,
  zoneName: string,
  minCurvature: number = 0.0005,
  maxDeviation: number = 0.035
): { issues: PrincipleIssue[]; score: number } {
  const issues: PrincipleIssue[] = [];
  if (path.length < 5) return { issues: [], score: 1.0 };

  // Segment the path into windows of ~8-15 points for local arc analysis
  const windowSize = Math.min(15, Math.max(8, Math.floor(path.length / 2)));
  const stride = Math.max(1, Math.floor(windowSize / 2));

  for (let start = 0; start + windowSize <= path.length; start += stride) {
    const window = path.slice(start, start + windowSize);
    const n = window.length;

    // Compute total path length
    let pathLen = 0;
    for (let i = 1; i < n; i++) {
      pathLen += Math.sqrt(
        (window[i].x - window[i - 1].x) ** 2 + (window[i].y - window[i - 1].y) ** 2
      );
    }
    if (pathLen < 0.02) continue;

    // Fit quadratic and measure deviation
    const xs = window.map((_, i) => i);
    const fitX = fitQuad(xs, window.map((p) => p.x));
    const fitY = fitQuad(xs, window.map((p) => p.y));

    let totalDev = 0, maxDev = 0, maxDevIdx = 0;
    for (let i = 0; i < n; i++) {
      const px = fitX.a * i * i + fitX.b * i + fitX.c;
      const py = fitY.a * i * i + fitY.b * i + fitY.c;
      const d = Math.sqrt((window[i].x - px) ** 2 + (window[i].y - py) ** 2);
      totalDev += d;
      if (d > maxDev) { maxDev = d; maxDevIdx = i; }
    }
    const avgDev = totalDev / n;
    const curvature = Math.abs(fitX.a) + Math.abs(fitY.a);

    // Too linear — use exercise-specific threshold
    if (curvature < minCurvature && pathLen > 0.05) {
      issues.push({
        severity: 'medium',
        frame_start: window[0].frame,
        frame_end: window[n - 1].frame,
        timestamp_start: frameToTimestamp(window[0].frame, fps),
        timestamp_end: frameToTimestamp(window[n - 1].frame, fps),
        description: `[${zoneName}] Frames ${window[0].frame}–${window[n - 1].frame}: motion path is nearly straight (curvature: ${curvature.toFixed(5)}). The ${zoneName.toLowerCase()} moves in a straight line instead of a natural arc.`,
        recommendation: `Add arc to the ${zoneName.toLowerCase()} at frames ${window[0].frame}–${window[n - 1].frame}. Select the ${zoneName.toLowerCase()} control and use AnimBot Arc Tracker to visualize the path. Add a breakdown at the midpoint and offset it perpendicular to the line to create a curve.`,
        measured_data: { zone, curvature: Math.round(curvature * 100000) / 100000, path_length: Math.round(pathLen * 1000) / 1000 },
        confidence: 0.7,
        body_zone: zone,
        body_zone_display: zoneName,
      });
    }

    // Erratic / jerky
    if (avgDev > maxDeviation && pathLen > 0.05) {
      const worstFrame = window[maxDevIdx].frame;
      issues.push({
        severity: avgDev > 0.06 ? 'high' : 'low',
        frame_start: window[0].frame,
        frame_end: window[n - 1].frame,
        timestamp_start: frameToTimestamp(window[0].frame, fps),
        timestamp_end: frameToTimestamp(window[n - 1].frame, fps),
        description: `[${zoneName}] Frames ${window[0].frame}–${window[n - 1].frame}: arc is bumpy/jerky (avg deviation: ${avgDev.toFixed(4)}, worst at frame ${worstFrame}). The ${zoneName.toLowerCase()} path is not smooth.`,
        recommendation: `Smooth the ${zoneName.toLowerCase()} arc near frame ${worstFrame}. Use AnimBot Butter on the Graph Editor curves for the ${zoneName.toLowerCase()} controls. Delete noisy keys and let the curves interpolate smoothly.`,
        measured_data: { zone, avg_deviation: Math.round(avgDev * 10000) / 10000, max_deviation_frame: worstFrame },
        confidence: 0.65,
        body_zone: zone,
        body_zone_display: zoneName,
      });
    }
  }

  // Deduplicate overlapping issues for same zone
  const deduped = deduplicateIssues(issues);

  const severity_weights = { low: 0.08, medium: 0.18, high: 0.3 };
  const penalty = deduped.reduce((s, i) => s + severity_weights[i.severity], 0);
  const score = Math.max(0, Math.min(1, 1 - penalty));

  return { issues: deduped, score };
}

function deduplicateIssues(issues: PrincipleIssue[]): PrincipleIssue[] {
  if (issues.length <= 1) return issues;
  const result: PrincipleIssue[] = [issues[0]];
  for (let i = 1; i < issues.length; i++) {
    const prev = result[result.length - 1];
    // Skip if overlapping frame range and same severity
    if (issues[i].frame_start <= prev.frame_end && issues[i].severity === prev.severity) {
      // Extend the previous issue
      prev.frame_end = Math.max(prev.frame_end, issues[i].frame_end);
      prev.timestamp_end = issues[i].timestamp_end;
      continue;
    }
    result.push(issues[i]);
  }
  return result;
}

function fitQuad(xs: number[], ys: number[]): { a: number; b: number; c: number } {
  const n = xs.length;
  if (n < 3) return { a: 0, b: 0, c: ys[0] || 0 };
  let sx = 0, sx2 = 0, sx3 = 0, sx4 = 0, sy = 0, sxy = 0, sx2y = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i], y = ys[i], x2 = x * x;
    sx += x; sx2 += x2; sx3 += x2 * x; sx4 += x2 * x2;
    sy += y; sxy += x * y; sx2y += x2 * y;
  }
  const M = [[sx4, sx3, sx2], [sx3, sx2, sx], [sx2, sx, n]];
  const det = det3(M);
  if (Math.abs(det) < 1e-12) return { a: 0, b: 0, c: sy / n };
  return {
    a: det3([[sx2y, M[0][1], M[0][2]], [sxy, M[1][1], M[1][2]], [sy, M[2][1], M[2][2]]]) / det,
    b: det3([[M[0][0], sx2y, M[0][2]], [M[1][0], sxy, M[1][2]], [M[2][0], sy, M[2][2]]]) / det,
    c: det3([[M[0][0], M[0][1], sx2y], [M[1][0], M[1][1], sxy], [M[2][0], M[2][1], sy]]) / det,
  };
}

function det3(m: number[][]): number {
  return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
    - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
    + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
}
