import { FrameDiffResult, BrightnessStats, Issue, ExerciseType, PrincipleAnalysis } from '../types';

/**
 * Legacy heuristic critique layer — kept for backward compatibility.
 */
export function generateCritique(
  diffs: FrameDiffResult[],
  brightness: BrightnessStats,
  largestChangeFrames: number[],
  _exerciseType: ExerciseType
): { issues: Issue[]; summary: string; confidenceNotes: string[] } {
  const issues: Issue[] = [];
  const confidenceNotes: string[] = [
    'Analysis uses pixel-level block-matching motion estimation, not skeleton/pose tracking.',
    'The 12 principles evaluation is based on motion vectors and frame analysis — not hand-annotated timing charts.',
    'Squash/stretch and solid drawing detection use bounding box approximations, not actual shape analysis.',
    'For more accurate results, future versions will integrate MediaPipe pose estimation and Lucas-Kanade point tracking.',
  ];

  if (diffs.length === 0) {
    return { issues: [], summary: 'Not enough frames to analyze.', confidenceNotes };
  }

  const diffScores = diffs.map((d) => d.diffScore);
  const avgDiff = diffScores.reduce((a, b) => a + b, 0) / diffScores.length;
  const maxDiff = Math.max(...diffScores);
  const minDiff = Math.min(...diffScores);
  const diffRange = maxDiff - minDiff;
  const diffVariance = diffScores.reduce((sum, v) => sum + (v - avgDiff) ** 2, 0) / diffScores.length;
  const diffStddev = Math.sqrt(diffVariance);

  if (avgDiff < 0.005) {
    issues.push({
      category: 'low_motion',
      severity: 'high',
      frame_range: [diffs[0].frameA, diffs[diffs.length - 1].frameB],
      note: `Very low average frame difference (${(avgDiff * 100).toFixed(2)}%). The clip appears nearly static.`,
    });
  }

  if (avgDiff > 0.005 && diffStddev < avgDiff * 0.15 && diffs.length > 4) {
    issues.push({
      category: 'even_motion',
      severity: 'medium',
      frame_range: [diffs[0].frameA, diffs[diffs.length - 1].frameB],
      note: `Frame-to-frame differences are very uniform (stddev: ${(diffStddev * 100).toFixed(3)}%). Motion may lack ease-in/ease-out.`,
    });
  }

  const spikeThreshold = avgDiff + 3 * diffStddev;
  for (const diff of diffs) {
    if (diff.diffScore > spikeThreshold && diff.diffScore > 0.05) {
      issues.push({
        category: 'abrupt_transition',
        severity: diff.diffScore > avgDiff * 5 ? 'high' : 'medium',
        frame_range: [diff.frameA, diff.frameB],
        note: `Abrupt visual change between frames ${diff.frameA}→${diff.frameB} (diff: ${(diff.diffScore * 100).toFixed(2)}% vs avg ${(avgDiff * 100).toFixed(2)}%).`,
      });
    }
  }

  const brightMeans = brightness.perFrame.map((f) => f.mean);
  for (let i = 1; i < brightMeans.length; i++) {
    const delta = Math.abs(brightMeans[i] - brightMeans[i - 1]);
    if (delta > 30) {
      issues.push({
        category: 'brightness_shift',
        severity: delta > 60 ? 'high' : 'medium',
        frame_range: [brightness.perFrame[i - 1].frame, brightness.perFrame[i].frame],
        note: `Brightness shifted by ${delta.toFixed(1)} units between sampled frames.`,
      });
    }
  }

  if (diffRange < 0.002 && diffs.length > 8) {
    issues.push({
      category: 'possible_hold',
      severity: 'low',
      frame_range: [diffs[0].frameA, diffs[diffs.length - 1].frameB],
      note: 'Extremely low variation across all sampled frames.',
    });
  }

  const summaryParts: string[] = [];
  summaryParts.push(`Analyzed ${diffs.length + 1} sampled frames.`);
  summaryParts.push(`Average frame difference: ${(avgDiff * 100).toFixed(2)}%.`);
  if (largestChangeFrames.length > 0) {
    summaryParts.push(`Strongest visual changes near frames: ${largestChangeFrames.join(', ')}.`);
  }
  if (issues.length === 0) {
    summaryParts.push('No significant issues detected at the pixel-difference level.');
  } else {
    const highCount = issues.filter((i) => i.severity === 'high').length;
    const medCount = issues.filter((i) => i.severity === 'medium').length;
    summaryParts.push(`Found ${issues.length} potential issue(s): ${highCount} high, ${medCount} medium severity.`);
  }

  return { issues, summary: summaryParts.join(' '), confidenceNotes };
}

/**
 * Generate summary and top priorities from principle analysis results.
 */
export function generatePrincipleSummary(
  principles: PrincipleAnalysis[],
  overallScore: number
): { summary: string; topPriorities: string[] } {
  // Collect all issues with principle name
  const allIssues: { principle: string; displayName: string; issue: PrincipleAnalysis['issues'][0] }[] = [];
  for (const p of principles) {
    for (const issue of p.issues) {
      allIssues.push({ principle: p.principle, displayName: p.display_name, issue });
    }
  }

  // Sort by severity (high > medium > low), then confidence
  const severityOrder = { high: 0, medium: 1, low: 2 };
  allIssues.sort((a, b) => {
    const sevDiff = severityOrder[a.issue.severity] - severityOrder[b.issue.severity];
    if (sevDiff !== 0) return sevDiff;
    return b.issue.confidence - a.issue.confidence;
  });

  // Top 5 priorities
  const topPriorities = allIssues.slice(0, 5).map((item) => {
    return `[${item.displayName}] Frames ${item.issue.frame_start}–${item.issue.frame_end}: ${item.issue.description.split('.')[0]}.`;
  });

  // Summary
  const weakPrinciples = principles
    .filter((p) => p.score < 0.7)
    .sort((a, b) => a.score - b.score);

  const strongPrinciples = principles.filter((p) => p.score >= 0.85);

  const parts: string[] = [];
  parts.push(`Overall animation score: ${Math.round(overallScore * 100)}/100.`);

  if (weakPrinciples.length > 0) {
    const weakNames = weakPrinciples.slice(0, 3).map((p) => p.display_name);
    parts.push(`Weakest areas: ${weakNames.join(', ')}.`);
  }

  if (strongPrinciples.length > 0) {
    parts.push(`${strongPrinciples.length} principle(s) scored well (≥85%).`);
  }

  const totalIssues = allIssues.length;
  const highCount = allIssues.filter((i) => i.issue.severity === 'high').length;
  if (totalIssues > 0) {
    parts.push(`${totalIssues} issue(s) found across all principles (${highCount} high severity).`);
  } else {
    parts.push('No significant animation issues detected.');
  }

  return { summary: parts.join(' '), topPriorities };
}
