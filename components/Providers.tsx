'use client';

import { AnalysisProvider } from './AnalysisProvider';
import { PostHogProvider } from './PostHogProvider';

/** Providers that persist across locale navigation (must be in root layout) */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <AnalysisProvider>{children}</AnalysisProvider>
    </PostHogProvider>
  );
}
