import React from 'react';
import { Spinner } from './Spinner';

export interface LoadingStateProps {
  /** Mensaje visible bajo el indicador, p. ej. "Cargando contratos...". */
  message: string;
  className?: string;
}

/** Tarjeta de carga centrada: indicador + mensaje. */
export const LoadingState: React.FC<LoadingStateProps> = ({ message, className = '' }) => (
  <div
    className={`bg-white border border-[#E5E8EE] rounded-2xl p-12 sm:p-16 text-center shadow-xs flex flex-col items-center justify-center ${className}`.trim()}
  >
    <Spinner label={message} className="mb-4" />
    <p aria-hidden="true" className="text-xs text-[#747780] font-medium">
      {message}
    </p>
  </div>
);