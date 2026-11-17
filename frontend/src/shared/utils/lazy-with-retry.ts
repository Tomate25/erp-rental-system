import { lazy, type ComponentType } from 'react';

const CHUNK_RELOAD_KEY = 'bm_chunk_reload_at';
const CHUNK_RELOAD_COOLDOWN_MS = 15_000;

/**
 * Detecta si un error corresponde a un chunk JS/CSS obsoleto tras un nuevo despliegue.
 */
export function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\d]+ failed|Unable to preload CSS|not a valid JavaScript MIME type/i.test(
    message,
  );
}

/**
 * Recarga la página una sola vez (con ventana de enfriamiento) cuando hay mismatch de chunks tras deploy.
 */
export function tryReloadOnceForStaleChunk(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const lastReloadRaw = window.sessionStorage.getItem(CHUNK_RELOAD_KEY);
    const now = Date.now();
    if (lastReloadRaw && now - Number(lastReloadRaw) < CHUNK_RELOAD_COOLDOWN_MS) {
      return false;
    }
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(now));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

/**
 * Envuelve React.lazy para recuperarse automáticamente cuando el usuario tiene una pestaña abierta
 * de un despliegue anterior y navega hacia otro módulo cuyo hash cambió.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (isChunkLoadError(error) && tryReloadOnceForStaleChunk()) {
        return await new Promise<{ default: T }>(() => {
          // Mantener Suspense activo mientras el navegador recarga el HTML actualizado
        });
      }
      throw error;
    }
  });
}
