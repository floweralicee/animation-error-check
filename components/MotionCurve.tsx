'use client';

import { useRef, useCallback } from 'react';
import { useLocale } from '@/components/LocaleProvider';

export type EasingType = 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'spring' | 'unknown';

export interface VelocityCurveSegment {
  segmentStart: number;
  segmentEnd: number;
  bestFitEasing: EasingType;
  fitQuality: number;
  normalizedVelocity: number[];
}

interface MotionCurveProps {
  perFrame: { frame: number; displacement: number; acceleration: number; isHold: boolean }[];
  velocityCurveSegments: VelocityCurveSegment[];
  maxDisplacementFrame: number;
  currentFrame: number;
  totalFrames: number;
  onSeekToFrame: (frame: number) => void;
}

// ---- Color mappings ----

const MOTION_COLORS = {
  hold: '#6B7280',
  low: '#60A5FA',
  mediumLow: '#34D399',
  mediumHigh: '#FBBF24',
  peak: '#F87171',
} as const;

const EASING_COLORS: Record<EasingType, string> = {
  linear: '#94A3B8',
  ease_in: '#A78BFA',
  ease_out: '#4ADE80',
  ease_in_out: '#38BDF8',
  spring: '#FB923C',
  unknown: '#94A3B8',
};

const EASING_LABELS: Record<EasingType, string> = {
  linear: 'Linear',
  ease_in: 'Ease In',
  ease_out: 'Ease Out',
  ease_in_out: 'Ease In-Out',
  spring: 'Spring',
  unknown: 'Unknown',
};

function getMotionColor(displacement: number, maxDisp: number, isHold: boolean): string {
  if (isHold) return MOTION_COLORS.hold;
  const ratio = displacement / maxDisp;
  if (ratio > 0.8) return MOTION_COLORS.peak;
  if (ratio > 0.5) return MOTION_COLORS.mediumHigh;
  if (ratio > 0.25) return MOTION_COLORS.mediumLow;
  return MOTION_COLORS.low;
}

function getMotionLabel(displacement: number, maxDisp: number, isHold: boolean): string {
  if (isHold) return 'Hold';
  const ratio = displacement / maxDisp;
  if (ratio > 0.8) return 'Peak';
  if (ratio > 0.5) return 'Fast';
  if (ratio > 0.25) return 'Normal';
  return 'Slow';
}

// SVG layout constants
const SVG_W = 800;
const SVG_H = 160;
const PAD_LEFT = 40;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 28;
const PLOT_W = SVG_W - PAD_LEFT - PAD_RIGHT;
const PLOT_H = SVG_H - PAD_TOP - PAD_BOTTOM;

export default function MotionCurve({
  perFrame,
  velocityCurveSegments,
  maxDisplacementFrame,
  currentFrame,
  totalFrames,
  onSeekToFrame,
}: MotionCurveProps) {
  const { t } = useLocale();
  const svgRef = useRef<SVGSVGElement>(null);

  if (perFrame.length === 0) return null;

  const maxDisp = Math.max(...perFrame.map((f) => f.displacement), 0.1);
  const frameMin = perFrame[0].frame;
  const frameMax = perFrame[perFrame.length - 1].frame;
  const frameRange = Math.max(frameMax - frameMin, 1);

  // Map frame → SVG x
  const fx = (frame: number) => PAD_LEFT + ((frame - frameMin) / frameRange) * PLOT_W;
  // Map displacement → SVG y (inverted: higher = top)
  const fy = (disp: number) => PAD_TOP + PLOT_H - (disp / maxDisp) * PLOT_H;

  // Build colored line segments between consecutive frames
  const segments: { x1: number; y1: number; x2: number; y2: number; color: string; label: string; frame: number; disp: number }[] = [];
  for (let i = 0; i < perFrame.length - 1; i++) {
    const a = perFrame[i];
    const b = perFrame[i + 1];
    const color = getMotionColor(a.displacement, maxDisp, a.isHold);
    const label = getMotionLabel(a.displacement, maxDisp, a.isHold);
    segments.push({
      x1: fx(a.frame),
      y1: fy(a.displacement),
      x2: fx(b.frame),
      y2: fy(b.displacement),
      color,
      label,
      frame: a.frame,
      disp: a.displacement,
    });
  }

  // Build easing reference polylines per segment
  const easingOverlays = velocityCurveSegments
    .filter((seg) => seg.normalizedVelocity.length >= 2 && seg.bestFitEasing !== 'unknown')
    .map((seg) => {
      const segFrameRange = seg.segmentEnd - seg.segmentStart;
      const points = seg.normalizedVelocity.map((v, i) => {
        const frame = seg.segmentStart + (i / (seg.normalizedVelocity.length - 1)) * segFrameRange;
        const x = fx(frame);
        const y = PAD_TOP + PLOT_H - v * PLOT_H;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      return {
        points: points.join(' '),
        color: EASING_COLORS[seg.bestFitEasing],
        label: EASING_LABELS[seg.bestFitEasing],
        fitQuality: seg.fitQuality,
        segmentStart: seg.segmentStart,
        segmentEnd: seg.segmentEnd,
      };
    });

  // Playhead x position
  const playheadX = fx(Math.min(Math.max(currentFrame, frameMin), frameMax));

  // Click handler: convert SVG x → frame number
  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const xRatio = (e.clientX - rect.left) / rect.width;
      const svgX = xRatio * SVG_W;
      const relX = svgX - PAD_LEFT;
      const frame = Math.round(frameMin + (relX / PLOT_W) * frameRange);
      const clamped = Math.min(Math.max(frame, frameMin), frameMax);
      onSeekToFrame(clamped);
    },
    [frameMin, frameMax, frameRange, onSeekToFrame]
  );

  // Y-axis tick values
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0];

  return (
    <div className="card">
      <h2>{t('motionCurve')}</h2>
      <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.75rem' }}>
        {t('motionCurveDesc')}
      </p>

      {/* SVG Chart */}
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          style={{ width: '100%', minWidth: '320px', cursor: 'crosshair', display: 'block' }}
          onClick={handleClick}
          aria-label="Motion curve chart"
        >
          {/* Grid lines */}
          {yTicks.map((tick) => {
            const y = PAD_TOP + PLOT_H - tick * PLOT_H;
            return (
              <g key={tick}>
                <line
                  x1={PAD_LEFT}
                  y1={y}
                  x2={PAD_LEFT + PLOT_W}
                  y2={y}
                  stroke="#2a2a2a"
                  strokeWidth="1"
                />
                <text
                  x={PAD_LEFT - 4}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="9"
                  fill="#555"
                >
                  {(tick * maxDisp).toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={PAD_TOP + PLOT_H} stroke="#444" strokeWidth="1" />
          <line x1={PAD_LEFT} y1={PAD_TOP + PLOT_H} x2={PAD_LEFT + PLOT_W} y2={PAD_TOP + PLOT_H} stroke="#444" strokeWidth="1" />

          {/* Easing reference overlays (dashed) */}
          {easingOverlays.map((ov, i) => (
            <g key={i}>
              <polyline
                points={ov.points}
                fill="none"
                stroke={ov.color}
                strokeWidth="1.5"
                strokeDasharray="4 3"
                opacity="0.7"
              >
                <title>{`${ov.label} easing (fit: ${(ov.fitQuality * 100).toFixed(0)}%) — frames ${ov.segmentStart}–${ov.segmentEnd}`}</title>
              </polyline>
            </g>
          ))}

          {/* Motion curve — colored line segments */}
          {segments.map((seg, i) => (
            <line
              key={i}
              x1={seg.x1}
              y1={seg.y1}
              x2={seg.x2}
              y2={seg.y2}
              stroke={seg.color}
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <title>{`${t('frame')}: ${seg.frame} | ${seg.disp.toFixed(2)}px | ${seg.label}${seg.frame === maxDisplacementFrame ? ' (peak)' : ''}`}</title>
            </line>
          ))}

          {/* Data point dots at each frame */}
          {perFrame.map((f, i) => (
            <circle
              key={i}
              cx={fx(f.frame)}
              cy={fy(f.displacement)}
              r={f.frame === maxDisplacementFrame ? 4 : 2}
              fill={getMotionColor(f.displacement, maxDisp, f.isHold)}
              stroke={f.frame === maxDisplacementFrame ? '#fff' : 'none'}
              strokeWidth="1"
            >
              <title>{`${t('frame')}: ${f.frame} | ${f.displacement.toFixed(2)}px${f.frame === maxDisplacementFrame ? ' (peak)' : ''}`}</title>
            </circle>
          ))}

          {/* Playhead */}
          <line
            x1={playheadX}
            y1={PAD_TOP}
            x2={playheadX}
            y2={PAD_TOP + PLOT_H}
            stroke="#FF4444"
            strokeWidth="1.5"
            strokeDasharray="3 2"
            opacity="0.9"
          />
          <circle cx={playheadX} cy={PAD_TOP} r="3" fill="#FF4444" />

          {/* X-axis frame labels */}
          {(() => {
            const labelCount = Math.min(perFrame.length, 8);
            const step = Math.max(1, Math.floor(perFrame.length / labelCount));
            return perFrame
              .filter((_, i) => i % step === 0 || i === perFrame.length - 1)
              .map((f) => (
                <text
                  key={f.frame}
                  x={fx(f.frame)}
                  y={PAD_TOP + PLOT_H + 16}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#555"
                >
                  {f.frame}
                </text>
              ));
          })()}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 1.25rem', marginTop: '0.75rem', fontSize: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#aaa', fontWeight: 600, marginRight: '0.5rem' }}>
          {t('motionIntensity')}:
        </div>
        {[
          { color: MOTION_COLORS.hold, label: t('motionHold') },
          { color: MOTION_COLORS.low, label: t('motionSlow') },
          { color: MOTION_COLORS.mediumLow, label: t('motionNormal') },
          { color: MOTION_COLORS.mediumHigh, label: t('motionFast') },
          { color: MOTION_COLORS.peak, label: t('motionPeak') },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <div style={{ width: 20, height: 3, background: color, borderRadius: 2 }} />
            <span style={{ color: '#888' }}>{label}</span>
          </div>
        ))}

        {easingOverlays.length > 0 && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#aaa', fontWeight: 600, marginLeft: '0.5rem', marginRight: '0.5rem' }}>
              {t('easingRef')}:
            </div>
            {Array.from(new Set(velocityCurveSegments.map((s) => s.bestFitEasing)))
              .filter((e) => e !== 'unknown')
              .map((easing) => (
                <div key={easing} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <div style={{
                    width: 20,
                    height: 0,
                    borderTop: `2px dashed ${EASING_COLORS[easing]}`,
                  }} />
                  <span style={{ color: '#888' }}>{EASING_LABELS[easing]}</span>
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  );
}
