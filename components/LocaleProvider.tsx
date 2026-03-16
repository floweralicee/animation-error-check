'use client';

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Locale,
  locales,
  translations,
  localeNames,
  TranslationKeys,
} from '@/lib/i18n';

interface LocaleContextValue {
  locale: Locale;
  t: (key: TranslationKeys) => string;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const pathname = usePathname();
  const router = useRouter();

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      // Update URL: replace /en or /zh in path
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 0 && locales.includes(segments[0] as Locale)) {
        segments[0] = newLocale;
      } else {
        segments.unshift(newLocale);
      }
      router.push('/' + segments.join('/'));
    },
    [pathname, router]
  );

  const t = useCallback(
    (key: TranslationKeys) => {
      return translations[locale][key] ?? translations.en[key] ?? key;
    },
    [locale]
  );

  const value = useMemo(
    () => ({ locale, t, setLocale }),
    [locale, t, setLocale]
  );

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    }
  }, [locale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return ctx;
}
