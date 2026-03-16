'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { useLocale } from '@/components/LocaleProvider';

interface UploadFormProps {
  onAnalyze: (file: File, exerciseType: string) => void;
  loading: boolean;
}

const EXERCISE_TYPE_KEYS = [
  { value: 'auto', key: 'exerciseAuto' as const },
  { value: 'bouncing_ball', key: 'exerciseBouncingBall' as const },
  { value: 'walk_cycle', key: 'exerciseWalkCycle' as const },
  { value: 'jump', key: 'exerciseJump' as const },
  { value: 'acting', key: 'exerciseActing' as const },
];

export default function UploadForm({ onAnalyze, loading }: UploadFormProps) {
  const { t } = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [exerciseType, setExerciseType] = useState('auto');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (file) {
      onAnalyze(file, exerciseType);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ borderLeft: '4px solid rgba(250, 142, 164, 0.5)' }}>
      <div>
        <label htmlFor="video-file">{t('animationClip')}</label>
        <input
          ref={inputRef}
          id="video-file"
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="exercise-type">{t('exerciseType')}</label>
          <select
            id="exercise-type"
            value={exerciseType}
            onChange={(e) => setExerciseType(e.target.value)}
          >
            {EXERCISE_TYPE_KEYS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.key)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button type="submit" disabled={!file || loading} loading={loading} size="lg">
        {loading ? t('analyzing') : t('analyze')}
      </Button>

      {file && (
        <p className="mt-3 text-sm text-text-muted">
          {t('selected')}: {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
        </p>
      )}
    </form>
  );
}
