'use client';

import { useLocale } from './LocaleProvider';
import { locales, localeNames, Locale } from '@/lib/i18n';

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className="language-switcher"
      style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
      }}
    >
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={locale === l ? 'active' : ''}
          style={{
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: locale === l ? 'var(--accent)' : 'transparent',
            color: locale === l ? 'white' : 'var(--text-secondary)',
            fontSize: '0.875rem',
            cursor: 'pointer',
            fontWeight: locale === l ? 600 : 400,
          }}
        >
          {localeNames[l]}
        </button>
      ))}
    </div>
  );
}
