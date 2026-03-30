'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { useLocale } from '@/components/LocaleProvider';
import type { EmailDelivery } from '@/lib/analyzeClient';

interface UploadFormProps {
  onAnalyze: (file: File, exerciseType: string, email: string) => void;
  loading: boolean;
  emailDelivery?: EmailDelivery | null;
}

const EXERCISE_TYPE_KEYS = [
  { value: 'auto', key: 'exerciseAuto' as const },
  { value: 'bouncing_ball', key: 'exerciseBouncingBall' as const },
  { value: 'walk_cycle', key: 'exerciseWalkCycle' as const },
  { value: 'jump', key: 'exerciseJump' as const },
  { value: 'acting', key: 'exerciseActing' as const },
];

export default function UploadForm({
  onAnalyze,
  loading,
  emailDelivery = null,
}: UploadFormProps) {
  const { t } = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [exerciseType, setExerciseType] = useState('auto');
  const [email, setEmail] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (file && trimmed) {
      onAnalyze(file, exerciseType, trimmed);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ borderLeft: '4px solid rgba(250, 142, 164, 0.5)' }}>
      <div>
        <label htmlFor="video-file">
          {t('animationClip')}
          <span className="required-mark" aria-hidden="true">
            *
          </span>
        </label>
        <input
          ref={inputRef}
          id="video-file"
          type="file"
          accept="video/*"
          required
          aria-required="true"
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

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="user-email">
            {t('email')}
            <span className="required-mark" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id="user-email"
            type="email"
            name="email"
            autoComplete="email"
            required
            aria-required="true"
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {emailDelivery === 'sent' && (
            <p className="mt-1 text-sm text-text-muted" role="status">
              {t('emailSentHint')}
            </p>
          )}
          {emailDelivery === 'failed' && (
            <p className="mt-1 text-sm text-text-muted" role="status">
              {t('emailFailedHint')}
            </p>
          )}
          {emailDelivery === 'skipped' && (
            <p className="mt-1 text-sm text-text-muted" role="status">
              {t('emailSkippedHint')}
            </p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={!file || loading || !email.trim()} loading={loading} size="lg">
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
