'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';

interface UploadFormProps {
  onAnalyze: (file: File, exerciseType: string) => void;
  loading: boolean;
}

const EXERCISE_TYPES = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'bouncing_ball', label: 'Bouncing Ball' },
  { value: 'walk_cycle', label: 'Walk Cycle' },
  { value: 'jump', label: 'Jump' },
  { value: 'acting', label: 'Acting / Performance' },
];

export default function UploadForm({ onAnalyze, loading }: UploadFormProps) {
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
        <label htmlFor="video-file">Animation Clip</label>
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
          <label htmlFor="exercise-type">Exercise Type</label>
          <select
            id="exercise-type"
            value={exerciseType}
            onChange={(e) => setExerciseType(e.target.value)}
          >
            {EXERCISE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button type="submit" disabled={!file || loading} loading={loading} size="lg">
        {loading ? 'Analyzing...' : 'Analyze'}
      </Button>

      {file && (
        <p className="mt-3 text-sm text-text-muted">
          Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
        </p>
      )}
    </form>
  );
}
