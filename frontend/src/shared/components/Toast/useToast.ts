import { useContext } from 'react';
import { ToastContext } from './ToastContext';
import type { ToastApi } from './ToastContext';

/** Acceso a los toasts: const toast = useToast(); toast.error('mensaje'). */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>');
  }
  return ctx;
}