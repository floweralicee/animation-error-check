import { PrincipleAnalysis, PrincipleIssue } from '../../types';
import { PrincipleContext, frameToTimestamp } from './types';

/**
 * Appeal: analyze composition balance and visual clarity.
 * This is the softest principle — scored gently with clear limitations noted.
 */
export function analyzeAppeal(ctx: PrincipleContext): PrincipleAnalysis {
  const issues: PrincipleIssue[] = [];
  const fps = ctx.metadata.fps;
  const { brightness } = ctx;

  if (brightness.perFrame.length < 3) {
    return { principle: 'appeal', display_name: 'Appeal', score: 1.0, issues: [] };
  }

  const firstFrame = ctx.frameNumbers[0] ?? 0;
  const lastFrame = ctx.frameNumbers[ctx.frameNumbers.length - 1] ?? 0;

  // Check contrast: is the primary motion area visually distinct from background?
  // We approximate using brightness range — very low range = flat, hard to read
  const brightnessRange = brightness.overall.max - brightness.overall.min;

  if (brightnessRange < 15) {
    issues.push({
      severity: 'low',
      frame_start: firstFrame,
      frame_end: lastFrame,
      timestamp_start: frameToTimestamp(firstFrame, fps),
      timestamp_end: frameToTimestamp(lastFrame, fps),
      description: `Very low brightness range across frames (${brightnessRange.toFixed(1)} units). The image may lack visual contrast, making the action harder to read.`,
      recommendation: `Increase the value contrast between the character and the background. A clear silhouette reads better.`,
      measured_data: {
        brightness_min: brightness.overall.min,
        brightness_max: brightness.overall.max,
        brightness_range: Math.round(brightnessRange * 100) / 100,
      },
      confidence: 0.45, // Very approximate
    });
  }

  // Check brightness consistency — erratic brightness changes are distracting
  let flickerCount = 0;
  for (let i = 1; i < brightness.perFrame.length; i++) {
    const delta = Math.abs(brightness.perFrame[i].mean - brightness.perFrame[i - 1].mean);
    if (delta > 10) flickerCount++;
  }
  const flickerRatio = brightness.perFrame.length > 1
    ? flickerCount / (brightness.perFrame.length - 1)
    : 0;

  if (flickerRatio > 0.3) {
    issues.push({
      severity: 'low',
      frame_start: firstFrame,
      frame_end: lastFrame,
      timestamp_start: frameToTimestamp(firstFrame, fps),
      timestamp_end: frameToTimestamp(lastFrame, fps),
      description: `${Math.round(flickerRatio * 100)}% of frame transitions have brightness jumps >10 units. This flickering can be distracting.`,
      recommendation: `Check for inconsistent lighting or rendering between frames. Smooth out brightness transitions.`,
      measured_data: {
        flicker_ratio: Math.round(flickerRatio * 100) / 100,
        flicker_count: flickerCount,
        total_transitions: brightness.perFrame.length - 1,
      },
      confidence: 0.5,
    });
  }

  const severity_weights = { low: 0.05, medium: 0.12, high: 0.22 };
  const penalty = issues.reduce((s, i) => s + severity_weights[i.severity], 0);
  const score = Math.max(0, Math.min(1, 1 - penalty));

  return {
    principle: 'appeal',
    display_name: 'Appeal',
    score: Math.round(score * 100) / 100,
    issues,
  };
}
