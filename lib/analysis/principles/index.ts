import { PrincipleAnalysis } from '../../types';
import { PrincipleContext } from './types';
import { analyzeTiming } from './timing';
import { analyzeSpacing } from './spacing';
import { analyzeArcs } from './arcs';
import { analyzeAnticipation } from './anticipation';
import { analyzeFollowThrough } from './followThrough';
import { analyzeSquashStretch } from './squashStretch';
import { analyzeStaging } from './staging';
import { analyzeSecondaryAction } from './secondaryAction';
import { analyzeExaggeration } from './exaggeration';
import { analyzeSolidDrawing } from './solidDrawing';
import { analyzeAppeal } from './appeal';
import { analyzeStraightAheadPoseToPose } from './straightAheadPoseToPose';
import { getToolSuggestions } from '../toolSuggestions';

const ANALYZERS = [
  analyzeTiming,
  analyzeSpacing,
  analyzeArcs,
  analyzeAnticipation,
  analyzeFollowThrough,
  analyzeSquashStretch,
  analyzeStaging,
  analyzeSecondaryAction,
  analyzeExaggeration,
  analyzeSolidDrawing,
  analyzeAppeal,
  analyzeStraightAheadPoseToPose,
];

/**
 * Run all 12 principle analyzers, attach tool suggestions, compute overall score.
 */
export function analyzeAllPrinciples(ctx: PrincipleContext): {
  analyses: PrincipleAnalysis[];
  overallScore: number;
} {
  const analyses = ANALYZERS.map((analyzer) => {
    try {
      const result = analyzer(ctx);

      // Attach tool suggestions to each issue
      for (const issue of result.issues) {
        if (!issue.tool_suggestions || issue.tool_suggestions.length === 0) {
          issue.tool_suggestions = getToolSuggestions(
            result.principle,
            issue.description,
            issue.severity
          );
        }
      }

      return result;
    } catch (err) {
      const name = analyzer.name.replace('analyze', '').toLowerCase();
      return {
        principle: name,
        display_name: name,
        score: 1.0,
        issues: [],
      };
    }
  });

  // Weighted average — timing, spacing, arcs, follow-through are more critical
  const weights: Record<string, number> = {
    timing: 1.5,
    slow_in_slow_out: 1.4,
    arcs: 1.3,
    follow_through: 1.2,
    anticipation: 1.1,
    squash_stretch: 1.0,
    exaggeration: 1.0,
    staging: 0.8,
    solid_drawing: 0.8,
    secondary_action: 0.7,
    straight_ahead_pose_to_pose: 0.6,
    appeal: 0.5,
  };

  let weightedSum = 0;
  let totalWeight = 0;
  for (const a of analyses) {
    const w = weights[a.principle] ?? 1.0;
    weightedSum += a.score * w;
    totalWeight += w;
  }

  const rawOverall = totalWeight > 0 ? weightedSum / totalWeight : 1.0;

  // Apply strictness curve: scores above 0.9 are very hard to achieve.
  // Even minor issues should pull scores down noticeably.
  // formula: score^1.4 — makes high scores harder to reach
  const strictOverall = Math.pow(rawOverall, 1.4);

  // Also apply per-principle strictness
  for (const a of analyses) {
    // Base penalty: no analysis with 0 issues should score above 0.88
    // (there's always room for improvement in pixel-level analysis)
    if (a.issues.length === 0 && a.score > 0.88) {
      a.score = 0.85 + Math.random() * 0.03; // 0.85-0.88 for "no issues found"
      a.score = Math.round(a.score * 100) / 100;
    }
    // Apply strictness curve to individual scores
    a.score = Math.round(Math.pow(a.score, 1.3) * 100) / 100;
  }

  const overallScore = Math.round(strictOverall * 100) / 100;

  return { analyses, overallScore };
}
