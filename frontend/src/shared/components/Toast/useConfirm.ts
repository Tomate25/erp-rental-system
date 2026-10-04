import { useContext } from 'react';
import { ConfirmContext } from './ToastContext';
import type { ConfirmFn } from './ToastContext';

/** Reemplazo de window.confirm: const confirm = useConfirm(); if (await confirm('Seguro?')) { ... } */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm debe usarse dentro de <ToastProvider>');
  }
  return ctx;
}