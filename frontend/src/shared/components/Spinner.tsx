import React from 'react';

export type SpinnerSize = 'sm' | 'md' | 'lg';
export type SpinnerTone = 'primary' | 'slate' | 'white';

const SIZE_CLASS: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-10 h-10 border-4',
};

const TONE_CLASS: Record<SpinnerTone, string> = {
  primary: 'border-[#1A73E8]',
  slate: 'border-[#37474F]',
  white: 'border-white',
};

export interface SpinnerProps {
  size?: SpinnerSize;
  tone?: SpinnerTone;
  /** Texto para lectores de pantalla (no se ve). */
  label?: string;
  className?: string;
}

/** Indicador de carga circular. Se anuncia a los lectores de pantalla como estado ("status"). */
export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', tone = 'primary', label = 'Cargando', className = '' }) => (
  <span role="status" className={`inline-flex ${className}`.trim()}>
    <span
      aria-hidden="true"
      className={`${SIZE_CLASS[size]} ${TONE_CLASS[tone]} border-t-transparent rounded-full animate-spin`}
    />
    <span className="sr-only">{label}</span>
  </span>
);