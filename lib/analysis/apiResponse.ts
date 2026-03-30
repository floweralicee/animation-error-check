import path from 'path';
import fs from 'fs/promises';
import { buildMotionProfile } from '@/lib/analysis/motionProfile';
import { computeAllMotionVectors } from '@/lib/analysis/motionVectors';
import { analyzeAllSegments } from '@/lib/analysis/velocityCurve';
import { extractZoneMotionProfiles, ZONE_DEFINITIONS, BodyZone } from '@/lib/analysis/bodyZones';
import type { AnalysisOutput, PrincipleIssue } from '@/lib/types';
import type { ZoneMotionPath } from '@/lib/types';

/** Full JSON returned by POST /api/analyze (matches client AnalysisResponse). */
export interface AnalysisApiResponse extends AnalysisOutput {
  keyframe_previews?: string[];
  motion_profile_detail?: {
    frame: number;
    displacement: number;
    acceleration: number;
    isHold: boolean;
  }[];
  velocity_curve_segments?: {
    segmentStart: number;
    segmentEnd: number;
    bestFitEasing: string;
    fitQuality: number;
    normalizedVelocity: number[];
  }[];
  zone_motion_paths?: ZoneMotionPath[];
}

const ANALYSIS_WIDTH = 320;
const ANALYSIS_HEIGHT = 240;

const ZONE_COLORS: Record<string, string> = {
  head: '#FF6B6B',
  chest: '#FFD93D',
  left_arm: '#6BCB77',
  right_arm: '#4D96FF',
  core: '#C77DFF',
  left_leg: '#FF9F43',
  right_leg: '#00D2FF',
};

/**
 * Builds the API response payload (keyframes, motion charts, zone paths) from pipeline output and workDir.
 */
export async function buildAnalysisApiResponse(
  workDir: string,
  result: AnalysisOutput
): Promise<AnalysisApiResponse> {
  let keyframePreviews: string[] = [];
  if (result.keyframe_paths && result.keyframe_paths.length > 0) {
    keyframePreviews = await Promise.all(
      result.keyframe_paths.map(async (relPath) => {
        try {
          const absPath = path.join(workDir, relPath);
          const buf = await fs.readFile(absPath);
          return `data:image/png;base64,${buf.toString('base64')}`;
        } catch {
          return '';
        }
      })
    );
    keyframePreviews = keyframePreviews.filter((p) => p.length > 0);
  }

  const framesDir = path.join(workDir, 'frames');
  let motionProfileDetail: {
    frame: number;
    displacement: number;
    acceleration: number;
    isHold: boolean;
  }[] = [];
  let velocityCurveSegments: {
    segmentStart: number;
    segmentEnd: number;
    bestFitEasing: string;
    fitQuality: number;
    normalizedVelocity: number[];
  }[] = [];
  let zoneMotionPaths: ZoneMotionPath[] = [];

  try {
    const frameFiles = await fs.readdir(framesDir);
    const framePaths = frameFiles
      .filter((f) => f.startsWith('frame_') && f.endsWith('.png'))
      .sort()
      .map((f) => path.join(framesDir, f));

    if (framePaths.length >= 2) {
      const totalFrames = result.metadata.frame_count;
      const interval = Math.max(1, Math.floor(totalFrames / framePaths.length));
      const frameNumbers = framePaths.map((_, i) => i * interval);

      const mvs = await computeAllMotionVectors(framePaths, frameNumbers);
      const profile = buildMotionProfile(mvs, result.metadata);
      motionProfileDetail = profile.perFrame.map((f) => ({
        frame: f.frame,
        displacement: f.displacement,
        acceleration: f.acceleration,
        isHold: f.isHold,
      }));

      const segments = analyzeAllSegments(profile.perFrame, result.metadata.fps);
      velocityCurveSegments = segments.map((s) => ({
        segmentStart: s.segmentStart,
        segmentEnd: s.segmentEnd,
        bestFitEasing: s.analysis.bestFitEasing,
        fitQuality: s.analysis.fitQuality,
        normalizedVelocity: s.analysis.normalizedVelocity,
      }));

      if (profile.primaryRegion) {
        const primaryRegion = profile.primaryRegion;
        const zoneProfiles = extractZoneMotionProfiles(mvs, primaryRegion);

        const rawPaths = zoneProfiles
          .filter((zp) => zp.motionPath.length > 0)
          .map((zp) => {
            const zoneDef = ZONE_DEFINITIONS[zp.zone as Exclude<BodyZone, 'whole_body'>];
            if (!zoneDef) return null;

            const zonePath = zp.motionPath.map((pt) => {
              const absX = primaryRegion.x + (zoneDef.x + pt.x * zoneDef.w) * primaryRegion.w;
              const absY = primaryRegion.y + (zoneDef.y + pt.y * zoneDef.h) * primaryRegion.h;
              return {
                frame: pt.frame,
                x: Math.min(1, Math.max(0, absX / ANALYSIS_WIDTH)),
                y: Math.min(1, Math.max(0, absY / ANALYSIS_HEIGHT)),
              };
            });

            const entry: ZoneMotionPath = {
              zone: String(zp.zone),
              color: ZONE_COLORS[zp.zone] ?? '#FFFFFF',
              path: zonePath,
            };
            return entry;
          });

        zoneMotionPaths = rawPaths.filter((zp): zp is ZoneMotionPath => zp !== null);
      }
    }
  } catch {
    // Motion profile detail is optional for the UI chart
  }

  return {
    ...result,
    keyframe_previews: keyframePreviews,
    motion_profile_detail: motionProfileDetail,
    velocity_curve_segments: velocityCurveSegments,
    zone_motion_paths: zoneMotionPaths,
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Consistent formatting for email + server-side copy (English). */
export function formatAnalyzedAtForEmail(d: Date): string {
  return d.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function collectSortedIssues(
  payload: AnalysisApiResponse
): { principleName: string; issue: PrincipleIssue }[] {
  const out: { principleName: string; issue: PrincipleIssue }[] = [];
  for (const p of payload.principles_analysis ?? []) {
    for (const issue of p.issues ?? []) {
      out.push({ principleName: p.display_name, issue });
    }
  }
  out.sort((a, b) => a.issue.frame_start - b.issue.frame_start);
  return out;
}

/** Plain-text frame-range feedback (12 principles issues), sorted by frame. */
function buildFrameFeedbackEmailSection(payload: AnalysisApiResponse): string {
  const rows = collectSortedIssues(payload);
  if (rows.length === 0) {
    return 'No frame-specific feedback was listed for this clip.';
  }
  const lines: string[] = [];
  for (const { principleName, issue } of rows) {
    const range =
      issue.frame_start === issue.frame_end
        ? `Frame ${issue.frame_start}`
        : `Frames ${issue.frame_start}–${issue.frame_end}`;
    lines.push(`• ${principleName} — ${range} (${issue.timestamp_start} – ${issue.timestamp_end})`);
    lines.push(`  ${issue.description}`);
    lines.push(`  Recommendation: ${issue.recommendation}`);
    lines.push('');
  }
  return lines.join('\n').trimEnd();
}

function formatTopPriorities(payload: AnalysisApiResponse): string | null {
  const items = (payload.top_priorities ?? []).map((s) => s.trim()).filter(Boolean);
  if (items.length === 0) return null;
  return items.map((s, i) => `${i + 1}. ${s}`).join('\n');
}

export function buildAnalysisEmailBody(
  payload: AnalysisApiResponse,
  opts: { analyzedAt: Date }
): { text: string; html: string } {
  const score = Math.round((payload.overall_score ?? 0) * 100);
  const summary = payload.summary?.trim() || 'Your animation analysis is ready.';
  const analyzedLine = `Analyzed: ${formatAnalyzedAtForEmail(opts.analyzedAt)}`;
  const priorities = formatTopPriorities(payload);

  const frameSection = buildFrameFeedbackEmailSection(payload);

  let text = `Overall score: ${score}/100\n\n${summary}\n`;
  if (priorities) {
    text += `\nTop priorities:\n${priorities}\n`;
  }
  text += `\n${analyzedLine}\n\n`;
  text += `---\nFRAME-BY-FRAME FEEDBACK\n---\n\n${frameSection}\n`;

  const emailFont =
    "font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:14px;line-height:1.5;color:#111;";
  const blockP = 'margin:0 0 0.75em 0;';
  const sectionTitle = 'margin:1em 0 0.5em 0;font-size:14px;font-weight:bold;';

  const prioritiesHtml = priorities
    ? `<p style="${blockP}"><strong>Top priorities:</strong></p><pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;margin:0 0 1em 0;">${escapeHtml(priorities)}</pre>`
    : '';

  const html = `<div style="${emailFont}">
<p style="${blockP}"><strong>Overall score:</strong> ${score}/100</p>
<p style="${blockP}">${escapeHtml(summary)}</p>
${prioritiesHtml}
<p style="${blockP}"><strong>Analyzed:</strong> ${escapeHtml(formatAnalyzedAtForEmail(opts.analyzedAt))}</p>
<p style="${sectionTitle}">Frame-by-frame feedback</p>
<pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;margin:0;">${escapeHtml(frameSection)}</pre>
</div>`;

  return { text, html };
}

