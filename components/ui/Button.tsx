'use client';

import React from 'react';

const NOISE_BG = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")";
const GRADIENT_BG = 'linear-gradient(155deg, #D4A030 5%, #fa8ea4 25%, #fa8ea4 50%, #4A9FD6 70%, #5FAD72 95%)';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold tracking-wide rounded-xl transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]';

  const variants = {
    primary:
      'relative overflow-hidden text-[#1a1a1a] shadow-md hover:shadow-lg hover:-translate-y-[1px] active:translate-y-0',
    secondary:
      'bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-fg)] border border-[var(--border)] hover:bg-[var(--bg-hover)]',
    ghost:
      'text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--bg-muted)]',
    danger:
      'bg-[var(--red-soft)] text-[var(--red)] border border-[var(--red)]/20 hover:bg-[var(--red)]/10',
    accent:
      'bg-[var(--accent)] text-[var(--btn-primary-fg)] hover:opacity-90 shadow-sm',
  };

  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3 text-sm',
  };

  const isPrimary = variant === 'primary';

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {isPrimary && (
        <>
          <div className="absolute inset-0 rounded-[inherit]" style={{ background: GRADIENT_BG }} />
          <div className="absolute inset-0 rounded-[inherit] mix-blend-overlay pointer-events-none" style={{ backgroundImage: NOISE_BG, opacity: 0.7 }} />
        </>
      )}
      <span className={isPrimary ? 'relative z-10 flex items-center gap-2' : 'flex items-center gap-2'}>
        {loading ? (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : icon ? (
          icon
        ) : null}
        {children}
      </span>
    </button>
  );
}
