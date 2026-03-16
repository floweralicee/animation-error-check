'use client';

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { AnalysisOutput } from '@/lib/types';

export interface AnalysisResponse extends AnalysisOutput {
  keyframe_previews?: string[];
  motion_profile_detail?: { frame: number; displacement: number; isHold: boolean }[];
}

interface AnalysisContextValue {
  result: AnalysisResponse | null;
  videoUrl: string | null;
  loading: boolean;
  error: string | null;
  setResult: (result: AnalysisResponse | null) => void;
  setVideoUrl: (url: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      result,
      videoUrl,
      loading,
      error,
      setResult,
      setVideoUrl,
      setLoading,
      setError,
    }),
    [result, videoUrl, loading, error]
  );

  return (
    <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) {
    throw new Error('useAnalysis must be used within AnalysisProvider');
  }
  return ctx;
}
