import { createContext } from 'react';
import type { ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  /** Milisegundos antes de cerrarse solo. 0 = no se cierra solo. */
  duration?: number;
}

export interface ToastApi {
  show: (message: string, type?: ToastType, options?: ToastOptions) => number;
  success: (message: string, options?: ToastOptions) => number;
  error: (message: string, options?: ToastOptions) => number;
  warning: (message: string, options?: ToastOptions) => number;
  info: (message: string, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
}

export interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** 'danger' resalta el boton de confirmar en rojo (acciones destructivas). */
  variant?: 'default' | 'danger';
}

/** Devuelve true si el usuario confirma; false si cancela, pulsa Escape o hace clic en el fondo. */
export type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

export const ToastContext = createContext<ToastApi | null>(null);
export const ConfirmContext = createContext<ConfirmFn | null>(null);