'use client';

import { useState, useMemo } from 'react';
import { PrincipleAnalysis, PrincipleIssue, ToolSuggestion } from '@/lib/types';
import { useLocale } from '@/components/LocaleProvider';
import { PRINCIPLE_DISPLAY_KEYS, SEVERITY_KEYS, type TranslationKeys } from '@/lib/i18n';

const ZONE_KEYS: Record<string, TranslationKeys> = {
  whole_body: 'zoneWholeBody',
  head: 'zoneHeadShort',
  chest: 'zoneChestShort',
  left_arm: 'zoneLeftArmShort',
  right_arm: 'zoneRightArmShort',
  core: 'zoneCoreShort',
  left_leg: 'zoneLeftLegShort',
  right_leg: 'zoneRightLegShort',
};

interface IssueTimelineProps {
  principlesAnalysis: PrincipleAnalysis[];
  totalFrames: number;
  fps: number;
  currentFrame: number;
  onSeekToFrame: (frame: number) => void;
}

interface TimelineDot {
  frame: number;
  pct: number;
  severity: 'low' | 'medium' | 'high';
  principle: string;
  displayName: string;
  issue: PrincipleIssue;
}

const SEVERITY_COLORS: Record<string, string> = {
  high: '#d32f2f',
  medium: '#e67e22',
  low: '#6b6b8a',
};

export default function IssueTimeline({
  principlesAnalysis,
  totalFrames,
  fps,
  currentFrame,
  onSeekToFrame,
}: IssueTimelineProps) {
  const { t } = useLocale();
  const [activeDot, setActiveDot] = useState<TimelineDot | null>(null);
  const [showTools, setShowTools] = useState(false);

  // Collect all issues as timeline dots
  const dots = useMemo(() => {
    const result: TimelineDot[] = [];
    for (const p of principlesAnalysis) {
      const displayName = PRINCIPLE_DISPLAY_KEYS[p.principle]
        ? t(PRINCIPLE_DISPLAY_KEYS[p.principle])
        : p.display_name;
      for (const issue of p.issues) {
        // Place dot at the midpoint of the issue frame range
        const midFrame = Math.round((issue.frame_start + issue.frame_end) / 2);
        result.push({
          frame: midFrame,
          pct: totalFrames > 0 ? (midFrame / totalFrames) * 100 : 0,
          severity: issue.severity,
          principle: p.principle,
          displayName,
          issue,
        });
      }
    }
    // Sort by frame
    result.sort((a, b) => a.frame - b.frame);
    return result;
  }, [principlesAnalysis, totalFrames, t]);

  // Deduplicate dots that are too close (within 2% of each other)
  const visibleDots = useMemo(() => {
    const deduped: TimelineDot[] = [];
    for (const dot of dots) {
      const tooClose = deduped.find((d) => Math.abs(d.pct - dot.pct) < 1.5);
      if (tooClose) {
        // Keep the higher severity one
        const order = { high: 0, medium: 1, low: 2 };
        if (order[dot.severity] < order[tooClose.severity]) {
          deduped[deduped.indexOf(tooClose)] = dot;
        }
      } else {
        deduped.push(dot);
      }
    }
    return deduped;
  }, [dots]);

  const playheadPct = totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0;

  const handleDotClick = (dot: TimelineDot) => {
    setActiveDot(dot);
    setShowTools(false);
    onSeekToFrame(dot.issue.frame_start);
  };

  const handleClose = () => {
    setActiveDot(null);
    setShowTools(false);
  };

  return (
    <div className="issue-timeline-section">
      {/* Timeline bar */}
      <div className="issue-timeline">
        <div className="timeline-track">
          {/* Playhead */}
          <div className="timeline-playhead" style={{ left: `${playheadPct}%` }} />

          {/* Issue dots */}
          {visibleDots.map((dot, i) => (
            <button
              key={i}
              className={`timeline-dot ${dot.severity} ${activeDot === dot ? 'active' : ''}`}
              style={{ left: `${dot.pct}%` }}
              onClick={() => handleDotClick(dot)}
              title={`${dot.displayName}: Frame ${dot.issue.frame_start}–${dot.issue.frame_end}`}
            />
          ))}
        </div>

        {/* Frame markers */}
        <div className="timeline-markers">
          <span>0</span>
          <span>{Math.round(totalFrames * 0.25)}</span>
          <span>{Math.round(totalFrames * 0.5)}</span>
          <span>{Math.round(totalFrames * 0.75)}</span>
          <span>{totalFrames}</span>
        </div>
      </div>

      {/* Summary line */}
      <div className="timeline-summary">
        {dots.length} {t('issuesDetected')}
        {dots.filter((d) => d.severity === 'high').length > 0 &&
          ` · ${dots.filter((d) => d.severity === 'high').length} ${t('high')}`}
        {dots.filter((d) => d.severity === 'medium').length > 0 &&
          ` · ${dots.filter((d) => d.severity === 'medium').length} ${t('medium')}`}
      </div>

      {/* Active issue detail */}
      {activeDot && (
        <div className={`timeline-issue-detail ${activeDot.severity}`}>
          <div className="timeline-issue-header">
            <span className={`badge ${activeDot.severity}`}>{t(SEVERITY_KEYS[activeDot.severity] || 'severityHigh')}</span>
            <span className="timeline-issue-principle">{activeDot.displayName}</span>
            {activeDot.issue.body_zone_display && (
              <span className="zone-label">
                {ZONE_KEYS[activeDot.issue.body_zone || ''] ? t(ZONE_KEYS[activeDot.issue.body_zone || '']) : activeDot.issue.body_zone_display}
              </span>
            )}
            <span className="issue-frames">
              {t('framesLabel')} {activeDot.issue.frame_start}–{activeDot.issue.frame_end}
            </span>
            <button className="timeline-close" onClick={handleClose}>✕</button>
          </div>

          <p className="issue-description">{activeDot.issue.description}</p>
          <p className="recommendation">💡 {activeDot.issue.recommendation}</p>

          {/* Tool suggestions */}
          {activeDot.issue.tool_suggestions && activeDot.issue.tool_suggestions.length > 0 && (
            <div className="tool-suggestions-section">
              <button
                className="tool-toggle"
                onClick={() => setShowTools(!showTools)}
              >
                🔧 {showTools ? t('hide') : t('show')} {t('animBotTools')} ({activeDot.issue.tool_suggestions.length})
              </button>
              {showTools && (
                <div className="tool-suggestions">
                  {activeDot.issue.tool_suggestions.map((tool: ToolSuggestion, ti: number) => (
                    <div key={ti} className="tool-card">
                      <div className="tool-header">
                        <strong>{tool.tool}</strong> — {tool.feature}
                        {tool.url && (
                          <a href={tool.url} target="_blank" rel="noopener noreferrer" className="tool-link">↗</a>
                        )}
                      </div>
                      <p className="tool-desc">{tool.description}</p>
                      <div className="tool-workflow">
                        <strong>{t('howToFix')}</strong>
                        <p>{tool.workflow}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="timeline-nav">
            <button
              className="video-btn"
              onClick={() => onSeekToFrame(activeDot.issue.frame_start)}
              title={t('goToIssueStart')}
            >
              ◂ {t('framesLabel')} {activeDot.issue.frame_start}
            </button>
            <button
              className="video-btn"
              onClick={() => onSeekToFrame(activeDot.issue.frame_end)}
              title={t('goToIssueEnd')}
            >
              {t('framesLabel')} {activeDot.issue.frame_end} ▸
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
