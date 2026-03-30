import { redirect } from 'next/navigation';
import { defaultLocale } from '@/lib/i18n';

type RootPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

/**
 * Preserve query string (e.g. ?job=...) when redirecting / → /en so email “result” links work
 * even if the user lands on the bare domain.
 */
export default function RootPage({ searchParams }: RootPageProps) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    } else {
      params.set(key, value);
    }
  }
  const qs = params.toString();
  redirect(`/${defaultLocale}${qs ? `?${qs}` : ''}`);
}
