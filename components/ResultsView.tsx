'use client';

import { useState, useCallback } from 'react';
import { AnalysisOutput } from '@/lib/types';
import VideoPlayer from './VideoPlayer';
import IssueTimeline from './IssueTimeline';
import PrincipleCard from './PrincipleCard';
import MotionProfile from './MotionProfile';
import KeyframePreview from './KeyframePreview';

interface ResultsViewProps {
  result: AnalysisOutput;
  keyframePreviews: string[];
  videoUrl: string;
}

export default function ResultsView({ result, keyframePreviews, videoUrl }: ResultsViewProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [displayFps, setDisplayFps] = useState(result.metadata.fps || 24);

  const scoreColor =
    result.overall_score >= 0.7
      ? 'score-good'
      : result.overall_score >= 0.4
        ? 'score-ok'
        : 'score-poor';

  const handleFrameChange = useCallback((frame: number) => {
    setCurrentFrame(frame);
  }, []);

  const handleSeekToFrame = useCallback((frame: number) => {
    const seekFn = (window as unknown as Record<string, unknown>).__hanaSeekToFrame;
    if (typeof seekFn === 'function') {
      (seekFn as (f: number) => void)(frame);
    }
  }, []);

  return (
    <div>
      {/* Overall Score */}
      <div className="card text-center">
        <h2>Overall Animation Score</h2>
        <div className={`overall-score ${scoreColor}`}>
          {Math.round(result.overall_score * 100)}
        </div>
        <p className="mt-1 text-sm text-text-muted">/100</p>
      </div>

      {/* Summary */}
      <div className="card">
        <h2>Summary</h2>
        <p>{result.summary}</p>
      </div>

      {/* === MAIN FEATURE: Video Player + Issue Timeline === */}
      <div className="card video-analysis-card">
        <div className="video-analysis-header">
          <h2>Shot Review</h2>
          <div className="fps-selector">
            <label htmlFor="display-fps">Playback</label>
            <select
              id="display-fps"
              value={displayFps}
              onChange={(e) => setDisplayFps(parseInt(e.target.value, 10))}
            >
              <option value="24">24 fps</option>
              <option value="60">60 fps</option>
            </select>
          </div>
        </div>

        <VideoPlayer
          videoUrl={videoUrl}
          fps={displayFps}
          totalFrames={Math.round(result.metadata.duration_sec * displayFps)}
          onFrameChange={handleFrameChange}
        />

        <IssueTimeline
          principlesAnalysis={result.principles_analysis}
          totalFrames={Math.round(result.metadata.duration_sec * displayFps)}
          fps={displayFps}
          currentFrame={currentFrame}
          onSeekToFrame={handleSeekToFrame}
        />
      </div>

      {/* Top Priorities */}
      {result.top_priorities && result.top_priorities.length > 0 && (
        <div className="card">
          <h2>🎯 Top Priorities</h2>
          <ol className="top-priorities">
            {result.top_priorities.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Metadata */}
      <div className="card">
        <h2>Video Metadata</h2>
        <div className="meta-grid">
          <div className="meta-item">
            <label>FPS</label>
            <div className="value">{result.metadata.fps}</div>
          </div>
          <div className="meta-item">
            <label>Duration</label>
            <div className="value">{result.metadata.duration_sec}s</div>
          </div>
          <div className="meta-item">
            <label>Resolution</label>
            <div className="value">{result.metadata.width}×{result.metadata.height}</div>
          </div>
          <div className="meta-item">
            <label>Frames</label>
            <div className="value">{result.metadata.frame_count}</div>
          </div>
          <div className="meta-item">
            <label>Sampled</label>
            <div className="value">{result.analysis.sampled_frames}</div>
          </div>
          <div className="meta-item">
            <label>Motion Frames</label>
            <div className="value">{result.motion_profile.total_motion_frames}</div>
          </div>
        </div>
      </div>

      {/* Motion Profile */}
      {result.motion_profile && (
        <MotionProfile
          perFrame={(result as AnalysisOutputWithMotion).motion_profile_detail ?? []}
          maxDisplacementFrame={result.motion_profile.max_displacement_frame}
        />
      )}

      {/* Body Zone Profiles */}
      {result.zone_profiles && result.zone_profiles.length > 0 && (
        <div className="card">
          <h2>Body Zone Motion</h2>
          <div className="zone-profiles-grid">
            {result.zone_profiles.map((z) => (
              <div key={z.zone} className="zone-profile-item">
                <div className="zone-name">{z.display_name}</div>
                <div className="zone-stat">
                  <span>Avg</span>
                  <span className="val">{z.average_displacement.toFixed(1)}px</span>
                </div>
                <div className="zone-stat">
                  <span>Peak</span>
                  <span className="val">{z.max_displacement.toFixed(1)}px</span>
                </div>
                <div className="zone-stat">
                  <span>Motion</span>
                  <span className="val">{z.motion_frame_count}f</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 12 Principles Analysis */}
      {result.principles_analysis && result.principles_analysis.length > 0 && (
        <div className="card">
          <h2>12 Principles of Animation</h2>
          <div className="principles-grid">
            {result.principles_analysis.map((p) => (
              <PrincipleCard key={p.principle} principle={p} />
            ))}
          </div>
        </div>
      )}

      {/* Keyframes */}
      {keyframePreviews.length > 0 && (
        <KeyframePreview previews={keyframePreviews} />
      )}

      {/* Legacy Issues */}
      {result.issues.length > 0 && (
        <div className="card">
          <h2>Pixel-Level Issues ({result.issues.length})</h2>
          <ul className="issue-list">
            {result.issues.map((issue, i) => (
              <li key={i} className={`issue-item ${issue.severity}`}>
                <span className={`badge ${issue.severity}`}>{issue.severity}</span>
                <strong>{issue.category.replace(/_/g, ' ')}</strong>
                {' '}— Frames {issue.frame_range[0]}–{issue.frame_range[1]}
                <br />
                <span className="text-text-muted">{issue.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface AnalysisOutputWithMotion extends AnalysisOutput {
  motion_profile_detail?: { frame: number; displacement: number; isHold: boolean }[];
}
