import { Suspense } from 'react';
import HomePage from '@/components/HomePage';

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container py-12 text-center" style={{ color: 'var(--text-muted)' }}>
          Loading…
        </div>
      }
    >
      <HomePage />
    </Suspense>
  );
}
