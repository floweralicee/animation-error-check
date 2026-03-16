import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LocaleProvider } from '@/components/LocaleProvider';
import { locales, pageTitles, pageDescriptions, type Locale } from '@/lib/i18n';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }> | { locale: string };
}): Promise<Metadata> {
  const resolvedParams = params instanceof Promise ? await params : params;
  const locale = resolvedParams.locale as Locale;
  if (!locales.includes(locale)) {
    return {};
  }
  return {
    title: pageTitles[locale],
    description: pageDescriptions[locale],
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }> | { locale: string };
}) {
  const resolvedParams = params instanceof Promise ? await params : params;
  const { locale } = resolvedParams;
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return (
    <LocaleProvider initialLocale={locale as Locale}>
      {children}
    </LocaleProvider>
  );
}
