'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

interface VideoPlayerProps {
  videoUrl: string;
  fps: number;
  totalFrames: number;
  onFrameChange?: (frame: number) => void;
  onSeekToFrame?: (frame: number) => void;
}

export default function VideoPlayer({
  videoUrl,
  fps,
  totalFrames,
  onFrameChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [duration, setDuration] = useState(0);

  const timeToFrame = useCallback((time: number) => Math.floor(time * fps), [fps]);
  const frameToTime = useCallback((frame: number) => frame / fps, [fps]);

  // Draw frame number overlay on canvas
  const drawOverlay = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Frame counter - top left
    const frame = timeToFrame(video.currentTime);
    const fontSize = Math.max(14, Math.floor(canvas.height / 20));
    ctx.font = `bold ${fontSize}px "SF Mono", "Fira Code", monospace`;

    const text = `F ${frame}`;
    const timeText = `${video.currentTime.toFixed(2)}s`;

    // Background pill
    const metrics = ctx.measureText(text);
    const timeMetrics = ctx.measureText(timeText);
    const maxW = Math.max(metrics.width, timeMetrics.width);
    const padding = 8;
    const lineH = fontSize + 4;

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
  }, [fps, timeToFrame, onFrameChange]);

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
        <button className="video-btn" onClick={() => stepFrame(-1)} title="Previous frame">
          ◂
        </button>
        <button className="video-btn video-btn-play" onClick={togglePlay}>
          {playing ? '⏸' : '▶'}
        </button>
        <button className="video-btn" onClick={() => stepFrame(1)} title="Next frame">
          ▸
        </button>
        <span className="video-frame-display">
          Frame <strong>{currentFrame}</strong> / {totalFrames}
        </span>
      </div>
    </div>
  );
}
