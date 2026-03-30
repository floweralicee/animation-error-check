import { NextResponse } from 'next/server';
import type { ExerciseType } from '@/lib/types';

const VALID_EXERCISES: ExerciseType[] = [
  'auto',
  'bouncing_ball',
  'walk_cycle',
  'jump',
  'acting',
];

export function parseExerciseType(raw: string): ExerciseType {
  return VALID_EXERCISES.includes(raw as ExerciseType) ? (raw as ExerciseType) : 'auto';
}

export function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export type ValidatedAnalyzeForm =
  | { ok: true; file: File; email: string; exerciseType: ExerciseType }
  | { ok: false; response: NextResponse };

/**
 * Shared validation for sync POST /api/analyze and async POST /api/analyze/jobs.
 */
export function validateAnalyzeForm(formData: FormData): ValidatedAnalyzeForm {
  const file = formData.get('video') as File | null;
  const exerciseRaw = (formData.get('exercise_type') as string) || 'auto';
  const emailRaw = (formData.get('email') as string) ?? '';
  const email = emailRaw.trim();

  if (email === '') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Email is required', code: 'email_required' }, { status: 400 }),
    };
  }
  if (!isValidEmail(email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid email format', code: 'email_invalid' }, { status: 400 }),
    };
  }

  if (!file) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No video file provided' }, { status: 400 }),
    };
  }

  const exerciseType = parseExerciseType(exerciseRaw);

  return { ok: true, file, email, exerciseType };
}
