import type { ReactNode } from 'react';
import { StatusBadge } from './StatusBadge';
import type { StatusTone } from './StatusBadge';

interface Action { label: string; onClick: () => void; disabled?: boolean; type?: 'button' | 'submit' }
export function StickyActionBar({ status, tone = 'neutral', confirm, error, primary, secondary, primaryTone = 'tertiary', children }: {
  status: string; tone?: StatusTone; confirm?: { checked: boolean; onChange: (checked: boolean) => void; label: string };
  error?: string | null; primary: Action; secondary?: Action; primaryTone?: 'primary' | 'tertiary'; children?: ReactNode;
}) {
  return <div className="fixed bottom-0 inset-x-0 z-30 border-t border-precision-neutral-border bg-white/95 px-4 py-3 shadow-lg backdrop-blur-xs">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
      <StatusBadge tone={tone}>{status}</StatusBadge>
      {confirm && <label className="flex items-center gap-2 text-xs font-medium text-precision-secondary"><input type="checkbox" checked={confirm.checked} onChange={e => confirm.onChange(e.target.checked)} className="h-4 w-4 accent-precision-primary" />{confirm.label}</label>}
      {children}
      {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
      <div className="ml-auto flex gap-2">
        {secondary && <button type={secondary.type || 'button'} onClick={secondary.onClick} disabled={secondary.disabled} className="btn-precision-outline">{secondary.label}</button>}
        <button type={primary.type || 'button'} onClick={primary.onClick} disabled={primary.disabled} className={`${primaryTone === 'primary' ? 'btn-precision-primary' : 'btn-precision-tertiary'} disabled:cursor-not-allowed disabled:opacity-50`}>{primary.label}</button>
      </div>
    </div>
  </div>;
}
