import { useId } from 'react';

/** Bubble-Pfad des AppLingua-Logos (identisch mit public/icon.svg). */
const BUBBLE =
  'M204 100H308A100 100 0 0 1 408 200V272A100 100 0 0 1 308 372H236L124 436L133 343A100 100 0 0 1 104 272V200A100 100 0 0 1 204 100Z';

interface LogoMarkProps {
  size?: number;
  className?: string;
  /** Zugänglicher Name; ohne Titel ist das Logo dekorativ. */
  title?: string;
}

/** AppLingua-Logo: Sprechblase (Korall → Gold) mit „A“, dessen Querstrich eine Schallwelle ist. */
export function LogoMark({ size = 40, className, title }: LogoMarkProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1F2745" />
          <stop offset="1" stopColor="#0D111D" />
        </linearGradient>
        <radialGradient id={`${id}gl`} cx="0.5" cy="0.46" r="0.5">
          <stop offset="0" stopColor="#FF7A55" stopOpacity="0.32" />
          <stop offset="1" stopColor="#FF7A55" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}bu`} x1="104" y1="92" x2="408" y2="440" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FF7A55" />
          <stop offset="0.55" stopColor="#F89A48" />
          <stop offset="1" stopColor="#F5C04A" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill={`url(#${id}bg)`} />
      <rect width="512" height="512" rx="116" fill={`url(#${id}gl)`} />
      <path d={BUBBLE} fill={`url(#${id}bu)`} stroke={`url(#${id}bu)`} strokeWidth="16" strokeLinejoin="round" />
      <path d="M190 318L256 150L322 318" fill="none" stroke="#111627" strokeWidth="38" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M176 264q16 -22 32 0t32 0t32 0t32 0t32 0" fill="none" stroke="#111627" strokeWidth="18" strokeLinecap="round" />
    </svg>
  );
}
