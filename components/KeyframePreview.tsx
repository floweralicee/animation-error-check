'use client';

import { useLocale } from '@/components/LocaleProvider';

interface KeyframePreviewProps {
  previews: string[];
}

export default function KeyframePreview({ previews }: KeyframePreviewProps) {
  const { t } = useLocale();
  if (previews.length === 0) return null;

  return (
    <div className="card">
      <h2>{t('keyframePreviews')}</h2>
      <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>
        {t('keyframePreviewsDesc')}
      </p>
      <div className="keyframes-grid">
        {previews.map((src, i) => (
          <img key={i} src={src} alt={`${t('keyframe')} ${i + 1}`} loading="lazy" />
        ))}
      </div>
    </div>
  );
}
