'use client';

import { useState } from 'react';
import { PrincipleAnalysis } from '@/lib/types';
import { useLocale } from '@/components/LocaleProvider';
import { PRINCIPLE_DISPLAY_KEYS, SEVERITY_KEYS, type TranslationKeys } from '@/lib/i18n';

const ZONE_KEYS: Record<string, TranslationKeys> = {
  whole_body: 'zoneWholeBody',
  head: 'zoneHead',
  chest: 'zoneChest',
  left_arm: 'zoneLeftArm',
  right_arm: 'zoneRightArm',
  core: 'zoneCore',
  left_leg: 'zoneLeftLeg',
  right_leg: 'zoneRightLeg',
};

interface PrincipleCardProps {
  principle: PrincipleAnalysis;
}

export default function PrincipleCard({ principle }: PrincipleCardProps) {
  const { t } = useLocale();
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
          <span className="principle-name">
            {PRINCIPLE_DISPLAY_KEYS[principle.principle]
              ? t(PRINCIPLE_DISPLAY_KEYS[principle.principle])
              : principle.display_name}
          </span>
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
              const zoneLabel = ZONE_KEYS[zone] ? t(ZONE_KEYS[zone]) : zone;
              return (
                <span key={zone} className={`zone-pill ${c}`} title={zoneLabel}>
                  {zoneLabel.split(' ').slice(0, 2).join(' ')} {s}
                </span>
              );
            })}
          </div>
        )}

        {principle.issues.length > 0 && (
          <span className="principle-issue-count">
            {principle.issues.length} {principle.issues.length !== 1 ? t('issues') : t('issue')}{' '}
            {expanded ? '▾' : '▸'}
          </span>
        )}
      </div>

      {expanded && principle.issues.length > 0 && (
        <div className="principle-issues">
          {principle.issues.map((issue, i) => (
            <div key={i} className={`issue-detail ${issue.severity}`}>
              <div className="issue-detail-header">
                <span className={`badge ${issue.severity}`}>{t(SEVERITY_KEYS[issue.severity] || 'severityHigh')}</span>
                {issue.body_zone_display && (
                  <span className="zone-label">{ZONE_KEYS[issue.body_zone || ''] ? t(ZONE_KEYS[issue.body_zone || '']) : issue.body_zone_display}</span>
                )}
                <span className="issue-frames">
                  {t('framesLabel')} {issue.frame_start}–{issue.frame_end} ({issue.timestamp_start} – {issue.timestamp_end})
                </span>
                <span className="issue-confidence" title={t('analysisConfidence')}>
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
                    🔧 {showTools === i ? t('hide') : t('show')} {t('toolSuggestions')} ({issue.tool_suggestions.length})
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
                            <strong>{t('howToFix')}</strong>
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
                {showData === i ? t('hideMeasuredData') : t('showMeasuredData')}
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
