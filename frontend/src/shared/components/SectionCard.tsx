import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function SectionCard({ title, subtitle, icon: Icon, actions, children, className = '' }: {
  title: string; subtitle?: string; icon?: LucideIcon; actions?: ReactNode; children: ReactNode; className?: string;
}) {
  return <section className={`rounded-2xl border border-precision-neutral-border bg-white p-5 ${className}`}>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-sm font-semibold text-precision-neutral-dark">{Icon && <Icon aria-hidden="true" className="h-4 w-4 text-precision-primary" />}{title}</h2>{subtitle && <p className="mt-1 text-xs text-precision-neutral">{subtitle}</p>}</div>
      {actions}
    </div>
    {children}
  </section>;
}
