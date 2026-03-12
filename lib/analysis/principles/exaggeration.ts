import { PrincipleAnalysis, PrincipleIssue } from '../../types';
import { PrincipleContext, frameToTimestamp } from './types';

/**
 * Exaggeration: detect if the dynamic range of motion is sufficient.
 * Good animation has clear contrast between fast and slow moments.
 */
export function analyzeExaggeration(ctx: PrincipleContext): PrincipleAnalysis {
  const issues: PrincipleIssue[] = [];
  const { perFrame } = ctx.motionProfile;
  const fps = ctx.metadata.fps;
  const avg = ctx.motionProfile.averageDisplacement;

  if (perFrame.length < 5 || avg < 0.2) {
    return { principle: 'exaggeration', display_name: 'Exaggeration', score: 1.0, issues: [] };
  }

  const nonHold = perFrame.filter((f) => !f.isHold);
  if (nonHold.length < 3) {
    return { principle: 'exaggeration', display_name: 'Exaggeration', score: 1.0, issues: [] };
  }

  const displacements = nonHold.map((f) => f.displacement);
  const maxDisp = Math.max(...displacements);
  const minDisp = Math.min(...displacements.filter((d) => d > 0.1));
  const dynamicRange = minDisp > 0 ? maxDisp / minDisp : maxDisp;
  const peakToAvg = maxDisp / avg;

  const firstFrame = perFrame[0]?.frame ?? 0;
  const lastFrame = perFrame[perFrame.length - 1]?.frame ?? 0;

  // Narrow dynamic range — everything moves at similar speed
  if (dynamicRange < 2.0 && nonHold.length >= 8) {
    issues.push({
      severity: dynamicRange < 1.5 ? 'high' : 'medium',
      frame_start: firstFrame,
      frame_end: lastFrame,
      timestamp_start: frameToTimestamp(firstFrame, fps),
      timestamp_end: frameToTimestamp(lastFrame, fps),
      description: `Motion dynamic range is narrow (${dynamicRange.toFixed(1)}:1). Fast and slow moments are nearly the same speed. The animation may feel flat and under-exaggerated.`,
      recommendation: `Push the extremes: make fast moments 2–3x faster and slow/ease moments noticeably slower. Increase the spacing difference between key poses.`,
      measured_data: {
        dynamic_range: Math.round(dynamicRange * 100) / 100,
        max_displacement: Math.round(maxDisp * 100) / 100,
        min_displacement: Math.round(minDisp * 100) / 100,
        peak_to_average: Math.round(peakToAvg * 100) / 100,
      },
      confidence: 0.65,
    });
  }

  // Peak moments aren't exaggerated enough
  if (peakToAvg < 1.5 && nonHold.length >= 5) {
    const exerciseExpectsMore =
      ctx.exerciseType === 'bouncing_ball' || ctx.exerciseType === 'jump';
    issues.push({
      severity: exerciseExpectsMore ? 'high' : 'low',
      frame_start: firstFrame,
      frame_end: lastFrame,
      timestamp_start: frameToTimestamp(firstFrame, fps),
      timestamp_end: frameToTimestamp(lastFrame, fps),
      description: `Peak motion (${maxDisp.toFixed(1)}px) is only ${peakToAvg.toFixed(1)}x the average (${avg.toFixed(1)}px).${exerciseExpectsMore ? ` For a ${ctx.exerciseType.replace('_', ' ')}, peaks should be much more exaggerated.` : ''} The action may lack punch.`,
      recommendation: `Increase the displacement at key action frames (especially around frame ${ctx.motionProfile.maxDisplacementFrame}) to create more dramatic contrast.`,
      measured_data: {
        peak_displacement: Math.round(maxDisp * 100) / 100,
        average_displacement: Math.round(avg * 100) / 100,
        peak_to_average: Math.round(peakToAvg * 100) / 100,
        exercise_type: ctx.exerciseType,
      },
      confidence: 0.6,
    });
  }

  const severity_weights = { low: 0.06, medium: 0.15, high: 0.28 };
  const penalty = issues.reduce((s, i) => s + severity_weights[i.severity], 0);
  const score = Math.max(0, Math.min(1, 1 - penalty));

  return {
    principle: 'exaggeration',
    display_name: 'Exaggeration',
    score: Math.round(score * 100) / 100,
    issues,
  };
}
