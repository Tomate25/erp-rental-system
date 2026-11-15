import type { LucideIcon } from 'lucide-react';
import type { StatusTone } from './StatusBadge';

const tones: Record<StatusTone, string> = {
  primary: 'text-precision-primary bg-precision-primary-light',
  tertiary: 'text-precision-tertiary bg-precision-tertiary-light',
  success: 'text-emerald-700 bg-emerald-50',
  warning: 'text-amber-700 bg-amber-50',
  danger: 'text-red-700 bg-red-50',
  neutral: 'text-precision-secondary bg-precision-secondary-light',
};

export function KpiCard({ label, value, caption, icon: Icon, tone = 'neutral' }: {
  label: string; value: number | string; caption?: string; icon: LucideIcon; tone?: StatusTone;
}) {
  return <div className="rounded-2xl border border-precision-neutral-border bg-white p-4 shadow-xs">
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs font-semibold text-precision-secondary">{label}</span>
      <span className={`rounded-lg p-1.5 ${tones[tone]}`}><Icon aria-hidden="true" className="h-4 w-4" /></span>
    </div>
    <div className="mt-2 text-3xl font-bold tabular-nums text-precision-neutral-dark">{value}</div>
    {caption && <p className="mt-1 text-xs text-precision-neutral">{caption}</p>}
  </div>;
}
