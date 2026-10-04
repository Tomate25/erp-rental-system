import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface ErrorAlertProps {
  message: string;
  /** Si se indica, se muestra el botón "Reintentar". */
  onRetry?: () => void;
  className?: string;
}

/** Mensaje de error en bloque, anunciado a los lectores de pantalla ("alert"), con reintento opcional. */
export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onRetry, className = '' }) => (
  <div
    role="alert"
    className={`bg-[#FDF2E9] border border-[#C55500]/20 rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center justify-center ${className}`.trim()}
  >
    <AlertCircle aria-hidden="true" className="w-8 h-8 text-[#C55500] mb-3" />
    <p className="text-xs font-bold text-[#C55500]">{message}</p>
    {onRetry && (
      <button type="button" onClick={onRetry} className="mt-4 btn-precision-outline text-xs py-2 px-4">
        Reintentar
      </button>
    )}
  </div>
);