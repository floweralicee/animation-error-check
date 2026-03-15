'use client';

import React, { useMemo } from 'react';

const APPLE = ['#D4A030', '#fa8ea4', '#4A9FD6', '#5FAD72'];
const OCEAN = ['#D98A3F', '#E04565', '#2B7FDE', '#2EAD5A'];

let _seed = 42;
function seeded() {
  _seed = (_seed * 16807 + 0) % 2147483647;
  return (_seed - 1) / 2147483646;
}

function makeGradient(palette: string[], alpha?: string): string {
  const angle = 120 + Math.floor(seeded() * 120);
  const stops = [
    `${palette[0]}${alpha || ''} ${Math.floor(seeded() * 10)}%`,
    `${palette[1]}${alpha || ''} ${15 + Math.floor(seeded() * 10)}%`,
    `${palette[1]}${alpha || ''} ${45 + Math.floor(seeded() * 10)}%`,
    `${palette[2]}${alpha || ''} ${60 + Math.floor(seeded() * 10)}%`,
    `${palette[2]}${alpha || ''} ${80 + Math.floor(seeded() * 5)}%`,
    `${palette[3]}${alpha || ''} 100%`,
  ];
  return `linear-gradient(${angle}deg, ${stops.join(', ')})`;
}

export const NOISE_SVG = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")";

interface GrainyProps {
  palette?: 'apple' | 'ocean';
  soft?: boolean;
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

function resolvePalette(palette?: 'apple' | 'ocean') {
  return palette === 'ocean' ? OCEAN : APPLE;
}

export function GrainyGradient({ palette, soft = false, className = '', children, style }: GrainyProps) {
  const colors = useMemo(() => resolvePalette(palette), [palette]);
  const bg = useMemo(() => (soft ? makeGradient(colors, '40') : makeGradient(colors)), [colors, soft]);

  return (
    <div className={`relative overflow-hidden ${className}`} style={style}>
      <div
        className="absolute -inset-4 rounded-[inherit]"
        style={{ background: bg, filter: 'blur(12px)' }}
      />
      <div
        className="absolute inset-0 pointer-events-none rounded-[inherit] mix-blend-overlay"
        style={{ backgroundImage: NOISE_SVG, opacity: 0.8 }}
      />
      <span className="relative z-10">{children}</span>
    </div>
  );
}

interface GrainyButtonProps extends GrainyProps, React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function GrainyButton({ palette, children, className = '', ...props }: GrainyButtonProps) {
  const colors = useMemo(() => resolvePalette(palette), [palette]);
  const bg = useMemo(() => makeGradient(colors), [colors]);

  return (
    <button
      className={`group relative overflow-hidden rounded-full cursor-pointer transition-all duration-400 border border-[var(--border)] hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-md ${className}`}
      style={{
        padding: '12px 32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
      {...props}
    >
      <div
        className="absolute -inset-4 opacity-25 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: bg, filter: 'blur(16px)' }}
      />
      <div
        className="absolute inset-0 rounded-[inherit] opacity-20 group-hover:opacity-90 transition-opacity duration-500"
        style={{ background: bg }}
      />
      <div
        className="absolute inset-0 rounded-[inherit] opacity-60 group-hover:opacity-80 transition-opacity duration-500 mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: NOISE_SVG }}
      />
      <span className="relative z-10 font-semibold text-sm tracking-wide text-[var(--text)] group-hover:text-[#18181b] transition-colors duration-400">
        {children}
      </span>
    </button>
  );
}
