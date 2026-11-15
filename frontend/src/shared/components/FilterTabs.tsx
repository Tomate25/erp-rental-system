import type { LucideIcon } from 'lucide-react';

export interface FilterOption<T extends string> { value: T; label: string; count?: number; icon?: LucideIcon }

export function FilterTabs<T extends string>({ options, value, onChange, variant = 'tabs', label }: {
  options: FilterOption<T>[]; value: T; onChange: (value: T) => void; variant?: 'tabs' | 'chips'; label: string;
}) {
  return <div role="tablist" aria-label={label} className={variant === 'tabs' ? 'flex flex-wrap gap-1 border-b border-precision-neutral-border' : 'flex flex-wrap gap-1.5'}>
    {options.map(option => {
      const selected = option.value === value;
      const Icon = option.icon;
      return <button key={option.value} type="button" role="tab" aria-selected={selected} onClick={() => onChange(option.value)} className={variant === 'tabs'
        ? `inline-flex min-h-10 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold ${selected ? 'border-precision-primary text-precision-primary' : 'border-transparent text-precision-secondary hover:text-precision-primary'}`
        : `inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold ${selected ? 'border-precision-primary bg-precision-primary text-white' : 'border-precision-neutral-border bg-white text-precision-secondary hover:bg-precision-neutral-light'}`}>
        {Icon && <Icon aria-hidden="true" className="h-4 w-4" />}{option.label}{option.count !== undefined && <span className="tabular-nums opacity-80">({option.count})</span>}
      </button>;
    })}
  </div>;
}
