'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useLocale } from '@/components/LocaleProvider';
import { ZoneMotionPath } from '@/lib/types';

// Short display labels for each body zone
const ZONE_LABELS: Record<string, string> = {
  head: 'Head',
  chest: 'Chest',
  left_arm: 'L.Arm',
  right_arm: 'R.Arm',
  core: 'Core',
  left_leg: 'L.Leg',
  right_leg: 'R.Leg',
};

// How many frames of trail history to show
const TRAIL_LENGTH = 40;

interface VideoPlayerProps {
  videoUrl: string;
  fps: number;
  totalFrames: number;
  onFrameChange?: (frame: number) => void;
  onSeekToFrame?: (frame: number) => void;
  zoneMotionPaths?: ZoneMotionPath[];
}

export default function VideoPlayer({
  videoUrl,
  fps,
  totalFrames,
  onFrameChange,
  zoneMotionPaths = [],
}: VideoPlayerProps) {
  const { t } = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showTrails, setShowTrails] = useState(false);

  const timeToFrame = useCallback((time: number) => Math.floor(time * fps), [fps]);
  const frameToTime = useCallback((frame: number) => frame / fps, [fps]);

  // Draw frame number overlay + zone motion trails on canvas
  const drawOverlay = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const frame = timeToFrame(video.currentTime);

    // --- Zone motion trail overlay ---
    if (showTrails && zoneMotionPaths.length > 0) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (const zone of zoneMotionPaths) {
        // Collect points up to the current frame within trail window
        const visiblePoints = zone.path.filter(
          (pt) => pt.frame <= frame && pt.frame > frame - TRAIL_LENGTH
        );
        if (visiblePoints.length === 0) continue;

        const total = visiblePoints.length;

        // Draw trail as individual segments with increasing alpha (fade-in from tail to head)
        for (let i = 1; i < total; i++) {
          const alpha = i / total; // 0 at tail, 1 at head
          const prev = visiblePoints[i - 1];
          const curr = visiblePoints[i];

          ctx.globalAlpha = alpha * 0.85;
          ctx.strokeStyle = zone.color;
          ctx.lineWidth = Math.max(1.5, 3 * alpha);
          ctx.beginPath();
          ctx.moveTo(prev.x * canvas.width, prev.y * canvas.height);
          ctx.lineTo(curr.x * canvas.width, curr.y * canvas.height);
          ctx.stroke();
        }

        // Current position dot
        const latest = visiblePoints[total - 1];
        const px = latest.x * canvas.width;
        const py = latest.y * canvas.height;

        ctx.globalAlpha = 1;
        // Outer glow ring
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fill();
        // Filled dot
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = zone.color;
        ctx.fill();

        // Zone label
        const label = ZONE_LABELS[zone.zone] ?? zone.zone;
        const labelSize = Math.max(10, Math.floor(canvas.height / 30));
        ctx.font = `bold ${labelSize}px "SF Mono", "Fira Code", monospace`;
        const lm = ctx.measureText(label);
        const lx = Math.min(px + 9, canvas.width - lm.width - 4);
        const ly = Math.max(py - 6, labelSize + 4);

        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(lx - 2, ly - labelSize, lm.width + 4, labelSize + 4);
        ctx.fillStyle = zone.color;
        ctx.fillText(label, lx, ly);
      }

      ctx.restore();
    }

    // --- Frame counter (top-left) ---
    const fontSize = Math.max(14, Math.floor(canvas.height / 20));
    ctx.font = `bold ${fontSize}px "SF Mono", "Fira Code", monospace`;

    const text = `${t('frameShort')} ${frame}`;
    const timeText = `${video.currentTime.toFixed(2)}s`;

    const metrics = ctx.measureText(text);
    const timeMetrics = ctx.measureText(timeText);
    const maxW = Math.max(metrics.width, timeMetrics.width);
    const padding = 8;
    const lineH = fontSize + 4;

    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(26, 26, 46, 0.75)';
    ctx.beginPath();
    ctx.roundRect(padding, padding, maxW + padding * 2, lineH * 2 + padding, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, padding * 2, padding + lineH - 4);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `${fontSize - 2}px "SF Mono", "Fira Code", monospace`;
    ctx.fillText(timeText, padding * 2, padding + lineH * 2 - 6);

    setCurrentFrame(frame);
    onFrameChange?.(frame);
  }, [fps, timeToFrame, onFrameChange, t, showTrails, zoneMotionPaths]);

  // Animation loop for overlay
  const updateLoop = useCallback(() => {
    drawOverlay();
    rafRef.current = requestAnimationFrame(updateLoop);
  }, [drawOverlay]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(updateLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [updateLoop]);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
      drawOverlay();
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.pause();
    } else {
      video.play();
    }
    setPlaying(!playing);
  };

  const stepFrame = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setPlaying(false);
    const newTime = Math.max(0, Math.min(video.duration, video.currentTime + delta / fps));
    video.currentTime = newTime;
    drawOverlay();
  };

  const seekToFrame = useCallback((frame: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setPlaying(false);
    video.currentTime = frameToTime(Math.max(0, Math.min(frame, totalFrames)));
    drawOverlay();
  }, [frameToTime, totalFrames, drawOverlay]);

  // Expose seekToFrame via a global callback
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__hanaSeekToFrame = seekToFrame;
    return () => {
      delete (window as unknown as Record<string, unknown>).__hanaSeekToFrame;
    };
  }, [seekToFrame]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = pct * duration;
    drawOverlay();
  };

  const progress = duration > 0 ? (currentFrame / fps) / duration : 0;

  return (
    <div className="video-player">
      <div className="video-container">
        <video
          ref={videoRef}
          src={videoUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          playsInline
        />
        <canvas ref={canvasRef} className="video-overlay" />
      </div>

      {/* Scrub timeline */}
      <div className="video-scrub" onClick={handleTimelineClick}>
        <div className="video-scrub-fill" style={{ width: `${progress * 100}%` }} />
        <div className="video-playhead" style={{ left: `${progress * 100}%` }} />
      </div>

      {/* Controls */}
      <div className="video-controls">
        <button className="video-btn" onClick={() => stepFrame(-1)} title={t('previousFrame')}>
          ◂
        </button>
        <button className="video-btn video-btn-play" onClick={togglePlay}>
          {playing ? '⏸' : '▶'}
        </button>
        <button className="video-btn" onClick={() => stepFrame(1)} title={t('nextFrame')}>
          ▸
        </button>
        <span className="video-frame-display">
          {t('framesLabel')} <strong>{currentFrame}</strong> / {totalFrames}
        </span>
        {zoneMotionPaths.length > 0 && (
          <div
            className="video-trails-control"
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              flexWrap: 'wrap',
              justifyContent: 'flex-end',
            }}
          >
            <button
              className="video-btn"
              onClick={() => setShowTrails((v) => !v)}
              style={{
                fontSize: '0.75rem',
                opacity: showTrails ? 1 : 0.5,
                borderColor: showTrails ? 'var(--accent)' : undefined,
              }}
              title={showTrails ? t('trailsHideMotionTrails') : t('trailsShowMotionTrails')}
            >
              {showTrails ? t('trailsOn') : t('trailsOff')}
            </button>
            <span
              style={{
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              {t('trailsNewFeatureTesting')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
