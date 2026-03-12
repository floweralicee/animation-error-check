'use client';

import { useState, useMemo } from 'react';
import { PrincipleAnalysis, PrincipleIssue, ToolSuggestion } from '@/lib/types';

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

const ZONE_LABELS: Record<string, string> = {
  whole_body: '🦴 Whole Body',
  head: '🔵 Head',
  chest: '🟢 Chest',
  left_arm: '🟡 L. Arm',
  right_arm: '🟠 R. Arm',
  core: '🟣 Core',
  left_leg: '🔴 L. Leg',
  right_leg: '🟤 R. Leg',
};

export default function IssueTimeline({
  principlesAnalysis,
  totalFrames,
  fps,
  currentFrame,
  onSeekToFrame,
}: IssueTimelineProps) {
  const [activeDot, setActiveDot] = useState<TimelineDot | null>(null);
  const [showTools, setShowTools] = useState(false);

  // Collect all issues as timeline dots
  const dots = useMemo(() => {
    const result: TimelineDot[] = [];
    for (const p of principlesAnalysis) {
      for (const issue of p.issues) {
        // Place dot at the midpoint of the issue frame range
        const midFrame = Math.round((issue.frame_start + issue.frame_end) / 2);
        result.push({
          frame: midFrame,
          pct: totalFrames > 0 ? (midFrame / totalFrames) * 100 : 0,
          severity: issue.severity,
          principle: p.principle,
          displayName: p.display_name,
          issue,
        });
      }
    }
    // Sort by frame
    result.sort((a, b) => a.frame - b.frame);
    return result;
  }, [principlesAnalysis, totalFrames]);

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
        {dots.length} issue{dots.length !== 1 ? 's' : ''} detected
        {dots.filter((d) => d.severity === 'high').length > 0 &&
          ` · ${dots.filter((d) => d.severity === 'high').length} high`}
        {dots.filter((d) => d.severity === 'medium').length > 0 &&
          ` · ${dots.filter((d) => d.severity === 'medium').length} medium`}
      </div>

      {/* Active issue detail */}
      {activeDot && (
        <div className={`timeline-issue-detail ${activeDot.severity}`}>
          <div className="timeline-issue-header">
            <span className={`badge ${activeDot.severity}`}>{activeDot.severity}</span>
            <span className="timeline-issue-principle">{activeDot.displayName}</span>
            {activeDot.issue.body_zone_display && (
              <span className="zone-label">
                {ZONE_LABELS[activeDot.issue.body_zone || ''] || activeDot.issue.body_zone_display}
              </span>
            )}
            <span className="issue-frames">
              Frames {activeDot.issue.frame_start}–{activeDot.issue.frame_end}
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
                🔧 {showTools ? 'Hide' : 'Show'} animBot tools ({activeDot.issue.tool_suggestions.length})
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
                        <strong>How to fix:</strong>
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
              title="Go to issue start"
            >
              ◂ Frame {activeDot.issue.frame_start}
            </button>
            <button
              className="video-btn"
              onClick={() => onSeekToFrame(activeDot.issue.frame_end)}
              title="Go to issue end"
            >
              Frame {activeDot.issue.frame_end} ▸
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
