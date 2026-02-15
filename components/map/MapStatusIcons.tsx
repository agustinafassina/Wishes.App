"use client";

const iconProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24' as const,
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function IconDone() {
  return (
    <svg {...iconProps} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function IconInReview() {
  return (
    <svg {...iconProps} aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function IconPending() {
  return (
    <svg {...iconProps} aria-hidden>
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}
