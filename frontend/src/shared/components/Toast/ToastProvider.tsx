import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { Modal } from '../Modal';
import { ConfirmContext, ToastContext } from './ToastContext';
import type { ConfirmFn, ConfirmOptions, ToastApi, ToastOptions, ToastType } from './ToastContext';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ConfirmRequest {
  id: number;
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4000,
  info: 5000,
  warning: 7000,
  error: 8000,
};

const TOAST_STYLES: Record<ToastType, { box: string; icon: ReactNode }> = {
  success: {
    box: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />,
  },
  error: {
    box: 'border-red-200 bg-red-50 text-red-800',
    icon: <AlertCircle className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />,
  },
  warning: {
    box: 'border-[#C55500]/30 bg-[#FDF2E9] text-[#823500]',
    icon: <AlertTriangle className="h-5 w-5 shrink-0 text-[#C55500]" aria-hidden="true" />,
  },
  info: {
    box: 'border-[#1A73E8]/30 bg-[#E8F0FE] text-[#10458C]',
    icon: <Info className="h-5 w-5 shrink-0 text-[#1A73E8]" aria-hidden="true" />,
  },
};

function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const style = TOAST_STYLES[toast.type];
  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 text-xs font-semibold shadow-lg animate-fadeIn ${style.box}`}
    >
      {style.icon}
      <p className="flex-1 break-words leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label={'Cerrar notificaci\u00f3n'}
        className="rounded-lg p-0.5 opacity-60 transition-opacity hover:opacity-100"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function ConfirmDialog({
  request,
  onResolve,
}: {
  request: ConfirmRequest;
  onResolve: (value: boolean) => void;
}) {
  const titleId = useId();
  const messageId = useId();
  const { title, message, confirmText, cancelText, variant = 'default' } = request.options;
  const confirmClass =
    variant === 'danger'
      ? 'inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600/40'
      : 'btn-precision-primary text-xs py-2 px-4';

  return (
    <Modal
      isOpen
      role="alertdialog"
      onClose={() => onResolve(false)}
      labelledBy={titleId}
      describedBy={messageId}
      overlayClassName="fixed inset-0 z-[70] flex items-center justify-center bg-[#1B1D22]/50 p-4 font-sans"
      className="w-full max-w-md overflow-hidden rounded-3xl border border-[#E5E8EE] bg-white shadow-2xl animate-fadeIn"
    >
      <div className="space-y-2 p-6">
        <h3 id={titleId} className="text-base font-black text-[#1B1D22]">
          {title ?? 'Confirmar acci\u00f3n'}
        </h3>
        <div id={messageId} className="text-xs font-medium leading-relaxed text-[#5A5D66]">
          {message}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-[#E5E8EE] bg-[#F4F6F9] px-6 py-4">
        <button
          type="button"
          autoFocus
          onClick={() => onResolve(false)}
          className="btn-precision-outline text-xs py-2 px-4"
        >
          {cancelText ?? 'Cancelar'}
        </button>
        <button type="button" onClick={() => onResolve(true)} className={confirmClass}>
          {confirmText ?? 'Aceptar'}
        </button>
      </div>
    </Modal>
  );
}

let nextId = 1;

/**
 * Proveedor de notificaciones (toasts) y dialogos de confirmacion.
 * Montar una sola vez cerca de la raiz (main.tsx). Usar con useToast() y useConfirm().
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmQueue, setConfirmQueue] = useState<ConfirmRequest[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const pendingConfirms = useRef<ConfirmRequest[]>([]);

  useEffect(() => {
    pendingConfirms.current = confirmQueue;
  }, [confirmQueue]);

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  // Si el proveedor se desmonta con confirmaciones abiertas, se resuelven como "cancelar".
  useEffect(() => {
    return () => {
      pendingConfirms.current.forEach((request) => request.resolve(false));
      pendingConfirms.current = [];
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = 'info', options?: ToastOptions) => {
      const id = nextId++;
      setToasts((current) => [...current, { id, type, message }]);
      const duration = options?.duration ?? DEFAULT_DURATION[type];
      if (duration > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), duration),
        );
      }
      return id;
    },
    [dismiss],
  );

  const toastApi = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, options) => show(message, 'success', options),
      error: (message, options) => show(message, 'error', options),
      warning: (message, options) => show(message, 'warning', options),
      info: (message, options) => show(message, 'info', options),
      dismiss,
    }),
    [show, dismiss],
  );

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        const normalized: ConfirmOptions = typeof options === 'string' ? { message: options } : options;
        setConfirmQueue((queue) => [...queue, { id: nextId++, options: normalized, resolve }]);
      }),
    [],
  );

  const resolveCurrentConfirm = useCallback((value: boolean) => {
    setConfirmQueue((queue) => {
      const [current, ...rest] = queue;
      current?.resolve(value);
      return rest;
    });
  }, []);

  const currentConfirm = confirmQueue[0];
  const politeToasts = toasts.filter((t) => t.type === 'success' || t.type === 'info');
  const assertiveToasts = toasts.filter((t) => t.type === 'error' || t.type === 'warning');

  return (
    <ToastContext.Provider value={toastApi}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        {/* Regiones aria-live siempre montadas para que los lectores de pantalla anuncien los mensajes nuevos */}
        <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2 font-sans">
          <div role="status" aria-live="polite" aria-atomic="false" className="flex flex-col gap-2">
            {politeToasts.map((toast) => (
              <ToastView key={toast.id} toast={toast} onDismiss={dismiss} />
            ))}
          </div>
          <div role="alert" aria-live="assertive" aria-atomic="false" className="flex flex-col gap-2">
            {assertiveToasts.map((toast) => (
              <ToastView key={toast.id} toast={toast} onDismiss={dismiss} />
            ))}
          </div>
        </div>

        {currentConfirm && (
          <ConfirmDialog key={currentConfirm.id} request={currentConfirm} onResolve={resolveCurrentConfirm} />
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}