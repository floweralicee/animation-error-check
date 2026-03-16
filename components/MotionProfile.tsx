'use client';

import { useLocale } from '@/components/LocaleProvider';

interface MotionProfileProps {
  perFrame: {
    frame: number;
    displacement: number;
    isHold: boolean;
  }[];
  maxDisplacementFrame: number;
}

export default function MotionProfile({ perFrame, maxDisplacementFrame }: MotionProfileProps) {
  const { t } = useLocale();
  if (perFrame.length === 0) return null;

  const maxDisp = Math.max(...perFrame.map((f) => f.displacement), 0.1);

  return (
    <div className="card">
      <h2>{t('motionProfile')}</h2>
      <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.75rem' }}>
        {t('motionProfileDesc')}
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
              title={`${t('framesLabel')} ${f.frame}: ${f.displacement.toFixed(2)}px${f.frame === maxDisplacementFrame ? ` (${t('tooltipPeak')})` : ''}`}
            />
          );
        })}
      </div>
      <div className="motion-profile-labels">
        <span>{t('framesLabel')} {perFrame[0]?.frame}</span>
        <span>{t('framesLabel')} {perFrame[perFrame.length - 1]?.frame}</span>
      </div>
    </div>
  );
}
