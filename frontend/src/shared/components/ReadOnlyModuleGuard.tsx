import React, { useEffect, useRef } from 'react';
import { Eye } from 'lucide-react';

interface ReadOnlyModuleGuardProps {
  readOnly: boolean;
  moduleName: string;
  children: React.ReactNode;
}

/**
 * Acciones de solo lectura o navegación que SIEMPRE permanecen habilitadas en modo Solo Lectura.
 */
const SAFE_READ_ACTION_REGEX =
  /\b(ver|detalle|detalles|consultar|imprimir|pdf|excel|exportar|descargar|filtrar|buscar|limpiar|actualizar|recargar|refrescar|cerrar|cancelar|volver|regresar|anterior|siguiente|aceptar y cerrar|copiar|mostrar|ocultar|expandir|contraer|vista previa|previsualizar|historial|estado de cuenta|ver comprobante|ver factura|ver contrato|ver recibo)\b/i;

/**
 * Acciones de escritura/mutación que se deshabilitan visualmente en modo Solo Lectura.
 * (La seguridad real además se refuerza en el backend bloqueando POST/PUT/PATCH/DELETE con HTTP 403.)
 */
const WRITE_ACTION_REGEX =
  /\b(nuevo|nueva|crear|agregar|añadir|anadir|registrar|guardar|editar|modificar|eliminar|borrar|anular|aprobar|rechazar|despachar|retornar|devolver|pagar|cobrar|abonar|carga masiva|importar|subir|restaurar|liquidar|generar|emitir|desbloquear|sincronizar|activar|desactivar|asignar|transferir|ajustar|abrir contrato|cerrar contrato|nueva versión|nueva version|convertir|rotar|revocar|enviar|aplicar pago|nuevo asiento|nueva orden|nuevo subarriendo|registrar compra|registrar gasto|registrar mantenimiento)\b/i;

export function isWriteActionText(text: string, isSubmit = false): boolean {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (isSubmit && !SAFE_READ_ACTION_REGEX.test(clean)) {
    return true;
  }
  if (!clean) return false;
  if (WRITE_ACTION_REGEX.test(clean)) {
    if (
      /\b(pdf|excel|exportar|imprimir|descargar)\b/i.test(clean) &&
      !/\b(factura|asiento|planilla|corte|contrato)\b/i.test(clean)
    ) {
      return false;
    }
    return true;
  }
  return false;
}

function isWriteButton(el: HTMLElement): boolean {
  const button = el.closest('button, input[type="submit"]') as
    | HTMLButtonElement
    | HTMLInputElement
    | null;
  if (!button) return false;
  if (button.dataset.allowReadonly === 'true') return false;

  const text = [
    button.textContent || '',
    button.getAttribute('title') || '',
    button.getAttribute('aria-label') || '',
    'value' in button ? String(button.value || '') : '',
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const typeAttr = (button.getAttribute('type') || '').toLowerCase();
  return isWriteActionText(text, typeAttr === 'submit');
}

export const ReadOnlyModuleGuard: React.FC<ReadOnlyModuleGuardProps> = ({
  readOnly,
  moduleName,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!readOnly || !containerRef.current) return;
    const root = containerRef.current;

    const applyDisabledState = () => {
      const candidates = root.querySelectorAll<HTMLElement>(
        'button, input[type="submit"]',
      );
      candidates.forEach((btn) => {
        if (isWriteButton(btn)) {
          btn.setAttribute('data-readonly-disabled', 'true');
          btn.setAttribute('aria-disabled', 'true');
          if (!btn.getAttribute('title')) {
            btn.setAttribute(
              'title',
              'Acción deshabilitada: tu cuenta tiene permiso de Solo Lectura en este módulo',
            );
          }
          btn.classList.add('opacity-45', 'cursor-not-allowed', 'pointer-events-auto');
        }
      });
    };

    applyDisabledState();

    const observer = new MutationObserver(() => {
      applyDisabledState();
    });
    observer.observe(root, {
      childList: true,
      subtree: true,
    });

    const handleCaptureClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const btn = target.closest('button, input[type="submit"]') as HTMLElement | null;
      if (!btn) return;
      if (btn.getAttribute('data-readonly-disabled') === 'true' || isWriteButton(btn)) {
        event.preventDefault();
        event.stopPropagation();
        window.dispatchEvent(
          new CustomEvent('bismark:permission-denied', {
            detail: {
              message: `Modo Solo Lectura en ${moduleName}: no tienes permiso para crear, editar ni eliminar registros.`,
            },
          }),
        );
      }
    };

    root.addEventListener('click', handleCaptureClick, true);

    return () => {
      observer.disconnect();
      root.removeEventListener('click', handleCaptureClick, true);
    };
  }, [readOnly, moduleName]);

  if (!readOnly) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="space-y-4">
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white border border-slate-200 border-l-4 border-l-[#1A73E8] text-slate-700 shadow-2xs"
      >
        <div className="flex items-center gap-2.5 text-xs">
          <Eye className="w-4 h-4 text-[#1A73E8] shrink-0" />
          <div>
            <span className="font-semibold text-slate-900">
              Modo Solo Lectura — {moduleName}
            </span>
            <span className="text-slate-500 ml-2">
              Puedes consultar, filtrar, imprimir y exportar. Las acciones de creación, edición y eliminación están deshabilitadas para tu cuenta.
            </span>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};
