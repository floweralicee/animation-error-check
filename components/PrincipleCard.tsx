'use client';

import { useState } from 'react';
import { PrincipleAnalysis } from '@/lib/types';

interface PrincipleCardProps {
  principle: PrincipleAnalysis;
}

const ZONE_LABELS: Record<string, string> = {
  whole_body: '🦴 Whole Body',
  head: '🔵 Head / Nose',
  chest: '🟢 Chest / Shoulders',
  left_arm: '🟡 Left Arm',
  right_arm: '🟠 Right Arm',
  core: '🟣 Core / Hips',
  left_leg: '🔴 Left Leg',
  right_leg: '🟤 Right Leg',
};

export default function PrincipleCard({ principle }: PrincipleCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showData, setShowData] = useState<number | null>(null);
  const [showTools, setShowTools] = useState<number | null>(null);

  const scoreColor =
    principle.score >= 0.7 ? 'score-good' : principle.score >= 0.4 ? 'score-ok' : 'score-poor';

  const scorePct = Math.round(principle.score * 100);

  return (
    <div className="principle-card">
      <div
        className="principle-header"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
      >
        <div className="principle-title">
          <span className="principle-name">{principle.display_name}</span>
          <span className={`principle-score ${scoreColor}`}>{scorePct}</span>
        </div>
        <div className="score-bar">
          <div className={`score-bar-fill ${scoreColor}`} style={{ width: `${scorePct}%` }} />
        </div>

        {/* Per-zone score pills */}
        {principle.zone_scores && Object.keys(principle.zone_scores).length > 1 && (
          <div className="zone-scores">
            {Object.entries(principle.zone_scores).map(([zone, score]) => {
              const s = Math.round(score * 100);
              const c = score >= 0.7 ? 'score-good' : score >= 0.4 ? 'score-ok' : 'score-poor';
              return (
                <span key={zone} className={`zone-pill ${c}`} title={ZONE_LABELS[zone] || zone}>
                  {(ZONE_LABELS[zone] || zone).split(' ').slice(0, 2).join(' ')} {s}
                </span>
              );
            })}
          </div>
        )}

        {principle.issues.length > 0 && (
          <span className="principle-issue-count">
            {principle.issues.length} issue{principle.issues.length !== 1 ? 's' : ''}{' '}
            {expanded ? '▾' : '▸'}
          </span>
        )}
      </div>

      {expanded && principle.issues.length > 0 && (
        <div className="principle-issues">
          {principle.issues.map((issue, i) => (
            <div key={i} className={`issue-detail ${issue.severity}`}>
              <div className="issue-detail-header">
                <span className={`badge ${issue.severity}`}>{issue.severity}</span>
                {issue.body_zone_display && (
                  <span className="zone-label">{ZONE_LABELS[issue.body_zone || ''] || issue.body_zone_display}</span>
                )}
                <span className="issue-frames">
                  Frames {issue.frame_start}–{issue.frame_end} ({issue.timestamp_start} – {issue.timestamp_end})
                </span>
                <span className="issue-confidence" title="Analysis confidence">
                  {Math.round(issue.confidence * 100)}%
                </span>
              </div>
              <p className="issue-description">{issue.description}</p>
              <p className="recommendation">💡 {issue.recommendation}</p>

              {/* Tool Suggestions */}
              {issue.tool_suggestions && issue.tool_suggestions.length > 0 && (
                <div className="tool-suggestions-section">
                  <button
                    className="tool-toggle"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTools(showTools === i ? null : i);
                    }}
                  >
                    🔧 {showTools === i ? 'Hide' : 'Show'} tool suggestions ({issue.tool_suggestions.length})
                  </button>
                  {showTools === i && (
                    <div className="tool-suggestions">
                      {issue.tool_suggestions.map((tool, ti) => (
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

              <button
                className="measured-data-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowData(showData === i ? null : i);
                }}
              >
                {showData === i ? 'Hide' : 'Show'} measured data
              </button>
              {showData === i && (
                <pre className="measured-data">
                  {JSON.stringify(issue.measured_data, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
