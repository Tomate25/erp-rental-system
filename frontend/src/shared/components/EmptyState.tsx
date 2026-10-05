import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** `primary`: icono azul (listas vacías al inicio). `neutral`: icono gris (sin resultados con filtros). */
  tone?: 'primary' | 'neutral';
  /** Acción opcional (por ejemplo un botón "Crear"). */
  children?: React.ReactNode;
  className?: string;
}

const TILE_CLASS = {
  primary: 'bg-[#E8F0FE] text-[#1A73E8] border-[#1A73E8]/10',
  neutral: 'bg-[#F4F6F9] text-[#747780] border-[#E5E8EE]',
} as const;

/** Estado vacío: icono, título y descripción centrados en una tarjeta. */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  tone = 'primary',
  children,
  className = '',
}) => (
  <div
    className={`bg-white border border-[#E5E8EE] rounded-3xl p-10 sm:p-16 text-center shadow-xs font-sans ${className}`.trim()}
  >
    <div className={`p-4 rounded-2xl inline-flex items-center justify-center mb-4 border ${TILE_CLASS[tone]}`}>
      <Icon aria-hidden="true" className="w-8 h-8" />
    </div>
    <h3 className="text-sm sm:text-base font-extrabold text-[#1B1D22]">{title}</h3>
    {description && (
      <p className="text-xs text-[#747780] max-w-sm mx-auto mt-1 leading-relaxed font-medium">{description}</p>
    )}
    {children && <div className="mt-5 flex justify-center">{children}</div>}
  </div>
);