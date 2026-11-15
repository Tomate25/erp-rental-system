type Tone = 'neutral' | 'primary' | 'tertiary' | 'success' | 'warning' | 'danger';
const dots: Record<Tone, string> = {
  neutral: 'bg-precision-neutral', primary: 'bg-precision-primary', tertiary: 'bg-precision-tertiary',
  success: 'bg-emerald-600', warning: 'bg-amber-500', danger: 'bg-red-600',
};

export function QuantityStepper({ label, value, min = 0, max, onChange, hint, tone = 'neutral' }: {
  label: string; value: number | string; min?: number; max?: number; onChange: (value: number) => void; hint?: string; tone?: Tone;
}) {
  const current = Number(value) || 0;
  const clamp = (next: number) => Math.max(min, Math.min(max ?? Number.MAX_SAFE_INTEGER, Number.isFinite(next) ? next : min));
  return <div className="rounded-xl bg-precision-neutral-light/60 p-3">
    <label className="flex items-center gap-1.5 text-xs font-medium text-precision-secondary">
      <span className={`h-2 w-2 rounded-full ${dots[tone]}`} />{label}
    </label>
    <div className="mt-2 flex items-center gap-2">
      <button type="button" aria-label={`Restar ${label}`} disabled={current <= min} onClick={() => onChange(clamp(current - 1))} className="h-10 w-10 shrink-0 rounded-lg border border-precision-neutral-border bg-white text-lg disabled:opacity-40">−</button>
      <input aria-label={label} inputMode="numeric" type="number" min={min} max={max} value={value} onChange={e => onChange(clamp(Number(e.target.value)))} className="h-10 min-w-0 w-full rounded-lg border border-precision-neutral-border bg-white text-center text-lg font-semibold tabular-nums" />
      <button type="button" aria-label={`Sumar ${label}`} disabled={max !== undefined && current >= max} onClick={() => onChange(clamp(current + 1))} className="h-10 w-10 shrink-0 rounded-lg border border-precision-neutral-border bg-white text-lg disabled:opacity-40">+</button>
    </div>
    {hint && <p className="mt-1.5 text-xs text-precision-neutral">{hint}</p>}
  </div>;
}
