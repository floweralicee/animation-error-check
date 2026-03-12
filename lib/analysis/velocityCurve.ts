/**
 * Velocity curve analysis — detect easing shape and organic vs mechanical motion.
 *
 * Fits velocity profiles to known easing curves and measures:
 * - Which easing type best matches (linear, ease-in, ease-out, ease-in-out)
 * - Jerk (rate of acceleration change) — high jerk = mechanical, smooth jerk = organic
 * - Gravity consistency for vertical motion
 */

export type EasingType = 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'spring' | 'unknown';

export interface VelocityCurveAnalysis {
  /** Best-fitting easing type */
  bestFitEasing: EasingType;
  /** How well the best fit matches (0-1, higher = better match) */
  fitQuality: number;
  /** Residual from best fit (lower = closer match) */
  residual: number;
  /** Average jerk (rate of acceleration change). Low = smooth/organic. High = mechanical/snappy */
  averageJerk: number;
  /** Jerk smoothness (std dev of jerk). Low = consistent. High = erratic */
  jerkSmoothness: number;
  /** Whether the curve shows gravity-consistent behavior (for vertical motion) */
  gravityConsistent: boolean;
  /** Velocity values normalized to 0-1 */
  normalizedVelocity: number[];
}

/**
 * Reference easing curves (normalized 0-1 domain and range).
 */
function linearCurve(t: number): number {
  return t;
}

function easeInCurve(t: number): number {
  return t * t; // quadratic ease-in
}

function easeOutCurve(t: number): number {
  return 1 - (1 - t) * (1 - t); // quadratic ease-out
}

function easeInOutCurve(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function springCurve(t: number): number {
  // Damped spring: overshoots then settles
  const decay = 4;
  const freq = 3;
  return 1 - Math.exp(-decay * t) * Math.cos(freq * Math.PI * t);
}

const EASING_CURVES: { name: EasingType; fn: (t: number) => number }[] = [
  { name: 'linear', fn: linearCurve },
  { name: 'ease_in', fn: easeInCurve },
  { name: 'ease_out', fn: easeOutCurve },
  { name: 'ease_in_out', fn: easeInOutCurve },
  { name: 'spring', fn: springCurve },
];

/**
 * Compute residual (mean squared error) between data and a reference curve.
 */
function computeResidual(data: number[], curveFn: (t: number) => number): number {
  if (data.length < 2) return Infinity;
  let sse = 0;
  for (let i = 0; i < data.length; i++) {
    const t = i / (data.length - 1);
    const predicted = curveFn(t);
    sse += (data[i] - predicted) ** 2;
  }
  return sse / data.length;
}

/**
 * Analyze a velocity profile segment.
 *
 * @param displacements — raw displacement values for consecutive frames
 * @param fps — frames per second (used for gravity check)
 */
export function analyzeVelocityCurve(
  displacements: number[],
  fps: number = 24
): VelocityCurveAnalysis {
  if (displacements.length < 4) {
    return {
      bestFitEasing: 'unknown',
      fitQuality: 0,
      residual: Infinity,
      averageJerk: 0,
      jerkSmoothness: 0,
      gravityConsistent: false,
      normalizedVelocity: [],
    };
  }

  // Normalize displacements to 0-1 (cumulative proportion of total movement)
  const total = displacements.reduce((a, b) => a + b, 0);
  if (total < 0.01) {
    return {
      bestFitEasing: 'unknown',
      fitQuality: 0,
      residual: Infinity,
      averageJerk: 0,
      jerkSmoothness: 0,
      gravityConsistent: false,
      normalizedVelocity: displacements.map(() => 0),
    };
  }

  // Build cumulative curve (position over time, normalized)
  const cumulative: number[] = [];
  let sum = 0;
  for (const d of displacements) {
    sum += d;
    cumulative.push(sum / total);
  }

  // Fit against each easing curve
  let bestName: EasingType = 'unknown';
  let bestResidual = Infinity;

  for (const { name, fn } of EASING_CURVES) {
    const residual = computeResidual(cumulative, fn);
    if (residual < bestResidual) {
      bestResidual = residual;
      bestName = name;
    }
  }

  // Fit quality: 1.0 = perfect match, 0.0 = terrible
  // Residual of 0.01 → quality ~0.9, residual of 0.1 → quality ~0.5
  const fitQuality = Math.max(0, Math.min(1, 1 - Math.sqrt(bestResidual) * 3));

  // Compute jerk (third derivative: rate of acceleration change)
  // velocity = displacement
  // acceleration = Δvelocity
  // jerk = Δacceleration
  const accelerations: number[] = [];
  for (let i = 1; i < displacements.length; i++) {
    accelerations.push(displacements[i] - displacements[i - 1]);
  }

  const jerks: number[] = [];
  for (let i = 1; i < accelerations.length; i++) {
    jerks.push(accelerations[i] - accelerations[i - 1]);
  }

  const avgJerk = jerks.length > 0
    ? jerks.reduce((a, b) => a + Math.abs(b), 0) / jerks.length
    : 0;

  const jerkMean = jerks.length > 0
    ? jerks.reduce((a, b) => a + b, 0) / jerks.length
    : 0;
  const jerkVariance = jerks.length > 0
    ? jerks.reduce((s, j) => s + (j - jerkMean) ** 2, 0) / jerks.length
    : 0;
  const jerkSmoothness = Math.sqrt(jerkVariance);

  // Gravity consistency check:
  // Under gravity, vertical acceleration should be roughly constant (~9.8m/s² in pixel space).
  // Check if acceleration is approximately constant (low variance in acceleration).
  const accelMean = accelerations.length > 0
    ? accelerations.reduce((a, b) => a + b, 0) / accelerations.length
    : 0;
  const accelVariance = accelerations.length > 0
    ? accelerations.reduce((s, a) => s + (a - accelMean) ** 2, 0) / accelerations.length
    : 0;
  const accelCV = Math.abs(accelMean) > 0.01
    ? Math.sqrt(accelVariance) / Math.abs(accelMean)
    : Infinity;

  // Gravity-consistent if acceleration variance is low AND acceleration is positive (downward)
  const gravityConsistent = accelCV < 0.5 && accelMean > 0;

  // Normalize velocity for output
  const maxDisp = Math.max(...displacements, 0.001);
  const normalizedVelocity = displacements.map((d) => Math.round((d / maxDisp) * 1000) / 1000);

  return {
    bestFitEasing: bestName,
    fitQuality: Math.round(fitQuality * 1000) / 1000,
    residual: Math.round(bestResidual * 10000) / 10000,
    averageJerk: Math.round(avgJerk * 1000) / 1000,
    jerkSmoothness: Math.round(jerkSmoothness * 1000) / 1000,
    gravityConsistent,
    normalizedVelocity,
  };
}

/**
 * Analyze multiple motion segments and return per-segment velocity analysis.
 */
export function analyzeAllSegments(
  perFrame: { displacement: number; isHold: boolean }[],
  fps: number,
  minSegmentLength: number = 5
): { segmentStart: number; segmentEnd: number; analysis: VelocityCurveAnalysis }[] {
  const results: { segmentStart: number; segmentEnd: number; analysis: VelocityCurveAnalysis }[] = [];

  // Find contiguous non-hold segments
  let segStart = -1;
  for (let i = 0; i <= perFrame.length; i++) {
    const isMotion = i < perFrame.length && !perFrame[i].isHold;
    if (isMotion && segStart === -1) {
      segStart = i;
    } else if (!isMotion && segStart !== -1) {
      if (i - segStart >= minSegmentLength) {
        const segment = perFrame.slice(segStart, i).map((f) => f.displacement);
        results.push({
          segmentStart: segStart,
          segmentEnd: i - 1,
          analysis: analyzeVelocityCurve(segment, fps),
        });
      }
      segStart = -1;
    }
  }

  return results;
}
