import type { ReactNode } from 'react';

export type StatusTone = 'primary' | 'tertiary' | 'success' | 'warning' | 'danger' | 'neutral';

const tones: Record<StatusTone, string> = {
  primary: 'bg-precision-primary-light text-precision-primary-dark',
  tertiary: 'bg-precision-tertiary-light text-precision-tertiary-dark',
  success: 'bg-emerald-50 text-emerald-800',
  warning: 'bg-amber-50 text-amber-900',
  danger: 'bg-red-50 text-red-700',
  neutral: 'bg-precision-secondary-light text-precision-secondary',
};

export function StatusBadge({ tone = 'neutral', children, className = '' }: { tone?: StatusTone; children: ReactNode; className?: string }) {
  return <span className={`inline-flex min-h-6 items-center gap-1 rounded-full px-2 text-xs font-semibold ${tones[tone]} ${className}`}>{children}</span>;
}
