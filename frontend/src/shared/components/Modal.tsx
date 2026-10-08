import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  /** Controla si el modal esta visible. Si es false no se renderiza nada. */
  isOpen: boolean;
  /** Se invoca al pulsar Escape o al hacer clic en el fondo (si estan habilitados). */
  onClose: () => void;
  /** id del elemento (normalmente el titulo) que nombra al dialogo -> aria-labelledby. */
  labelledBy?: string;
  /** Nombre accesible alternativo cuando no hay un titulo visible -> aria-label. */
  ariaLabel?: string;
  /** id del elemento con la descripcion -> aria-describedby. */
  describedBy?: string;
  /** Usar 'alertdialog' para confirmaciones que requieren respuesta. */
  role?: 'dialog' | 'alertdialog';
  /** Clases del panel (el elemento con role="dialog"). */
  className?: string;
  /** Clases del fondo (overlay). */
  overlayClassName?: string;
  /** Cerrar al hacer clic en el fondo. Por defecto true. */
  closeOnBackdrop?: boolean;
  /** Cerrar al pulsar Escape. Por defecto true. */
  closeOnEscape?: boolean;
  children: ReactNode;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const DEFAULT_OVERLAY_CLASS =
  'fixed inset-0 z-50 flex items-center justify-center bg-[#1B1D22]/50 p-4 font-sans';
const DEFAULT_PANEL_CLASS =
  'w-full max-w-lg overflow-hidden rounded-3xl border border-[#E5E8EE] bg-white shadow-2xl';

// Pila de modales abiertos: solo el de arriba reacciona a Escape/Tab (modales anidados).
const modalStack: object[] = [];

// Bloqueo de scroll con contador para soportar varios modales a la vez.
let scrollLockCount = 0;
let previousBodyOverflow = '';

function lockBodyScroll() {
  if (scrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLockCount += 1;
}

function unlockBodyScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow;
  }
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden',
  );
}

type ModalContentProps = Omit<ModalProps, 'isOpen'>;

function ModalContent({
  onClose,
  labelledBy,
  ariaLabel,
  describedBy,
  role = 'dialog',
  className = DEFAULT_PANEL_CLASS,
  overlayClassName = DEFAULT_OVERLAY_CLASS,
  closeOnBackdrop = true,
  closeOnEscape = true,
  children,
}: ModalContentProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const mouseDownOnBackdrop = useRef(false);

  // Se captura durante el render (antes de que un autoFocus mueva el foco) el elemento que abrio el modal.
  const [opener] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );

  // Siempre la ultima version de los props dentro de los listeners globales.
  const latest = useRef({ onClose, closeOnEscape });
  useEffect(() => {
    latest.current = { onClose, closeOnEscape };
  });

  useEffect(() => {
    const token = {};
    modalStack.push(token);
    lockBodyScroll();

    const panel = panelRef.current;
    if (panel && !panel.contains(document.activeElement)) {
      (getFocusableElements(panel)[0] ?? panel).focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== token) return;

      if (event.key === 'Escape') {
        if (latest.current.closeOnEscape) {
          event.preventDefault();
          event.stopPropagation();
          latest.current.onClose();
        }
        return;
      }

      if (event.key === 'Tab' && panel) {
        const focusables = getFocusableElements(panel);
        if (focusables.length === 0) {
          event.preventDefault();
          panel.focus();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        const outside = !active || !panel.contains(active) || active === panel;

        if (event.shiftKey) {
          if (outside || active === first) {
            event.preventDefault();
            last.focus();
          }
        } else if (outside || active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const index = modalStack.indexOf(token);
      if (index !== -1) modalStack.splice(index, 1);
      unlockBodyScroll();
      // Devuelve el foco a quien abrio el modal (si sigue en el documento).
      if (opener && opener.isConnected) opener.focus();
    };
  }, [opener]);

  return (
    <div
      className={overlayClassName}
      onMouseDown={(event) => {
        mouseDownOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        const startedOnBackdrop = mouseDownOnBackdrop.current;
        mouseDownOnBackdrop.current = false;
        if (closeOnBackdrop && startedOnBackdrop && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : ariaLabel}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`${className} focus:outline-none`}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Modal accesible reutilizable.
 * - role="dialog" + aria-modal + aria-labelledby
 * - Cierra con Escape y con clic en el fondo
 * - Bloquea el scroll del body mientras esta abierto
 * - Atrapa el foco con Tab / Shift+Tab y lo devuelve al elemento que lo abrio
 */
export function Modal({ isOpen, ...rest }: ModalProps) {
  if (!isOpen) return null;
  if (typeof document === 'undefined') {
    return <ModalContent {...rest} />;
  }
  return createPortal(<ModalContent {...rest} />, document.body);
}

export default Modal;