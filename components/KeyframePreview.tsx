'use client';

interface KeyframePreviewProps {
  previews: string[];
}

export default function KeyframePreview({ previews }: KeyframePreviewProps) {
  if (previews.length === 0) return null;

  return (
    <div className="card">
      <h2>Keyframe Previews</h2>
      <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>
        I-frames extracted from the video codec. These are reference points, not necessarily
        the most important animation frames.
      </p>
      <div className="keyframes-grid">
        {previews.map((src, i) => (
          <img key={i} src={src} alt={`Keyframe ${i + 1}`} loading="lazy" />
        ))}
      </div>
    </div>
  );
}
