'use client';

interface MotionProfileProps {
  perFrame: {
    frame: number;
    displacement: number;
    isHold: boolean;
  }[];
  maxDisplacementFrame: number;
}

export default function MotionProfile({ perFrame, maxDisplacementFrame }: MotionProfileProps) {
  if (perFrame.length === 0) return null;

  const maxDisp = Math.max(...perFrame.map((f) => f.displacement), 0.1);

  return (
    <div className="card">
      <h2>Motion Profile</h2>
      <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.75rem' }}>
        Displacement magnitude per frame. Taller bars = more motion.
      </p>
      <div className="motion-profile">
        {perFrame.map((f, i) => {
          const heightPct = (f.displacement / maxDisp) * 100;
          const colorClass = f.isHold
            ? 'bar-hold'
            : f.displacement > maxDisp * 0.8
              ? 'bar-high'
              : f.displacement > maxDisp * 0.5
                ? 'bar-medium'
                : 'bar-normal';

          return (
            <div
              key={i}
              className={`motion-bar ${colorClass}`}
              style={{ height: `${Math.max(heightPct, 2)}%` }}
              title={`Frame ${f.frame}: ${f.displacement.toFixed(2)}px${f.frame === maxDisplacementFrame ? ' (peak)' : ''}`}
            />
          );
        })}
      </div>
      <div className="motion-profile-labels">
        <span>Frame {perFrame[0]?.frame}</span>
        <span>Frame {perFrame[perFrame.length - 1]?.frame}</span>
      </div>
    </div>
  );
}
