'use client';

import { AnalysisProvider } from './AnalysisProvider';

/** Providers that persist across locale navigation (must be in root layout) */
export function Providers({ children }: { children: React.ReactNode }) {
  return <AnalysisProvider>{children}</AnalysisProvider>;
}
