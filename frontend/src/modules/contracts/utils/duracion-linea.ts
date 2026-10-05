import { toNum } from '../../../shared/utils/numbers';

/**
 * Duracion (dias u horas) de una linea de contrato. `dias` puede llegar como numero o como texto ("3", "1.00").
 * Devuelve `NaN` si falta, es 0, negativa o no es un numero valido: NO se reemplaza por 1, porque eso imprimiria
 * un total que no corresponde al contrato sin avisar. Quien llama debe mostrar el aviso.
 */
export function duracionDeLinea(item: unknown): number {
  const dias = toNum((item as { dias?: unknown } | null | undefined)?.dias);
  return Number.isFinite(dias) && dias > 0 ? dias : Number.NaN;
}

/** Numeros de linea (desde 1) cuya duracion no es valida. Vacio = el total se puede calcular. */
export function lineasSinDuracionValida(items: ReadonlyArray<unknown> | null | undefined): number[] {
  const invalidas: number[] = [];
  (items ?? []).forEach((item, indice) => {
    if (!Number.isFinite(duracionDeLinea(item))) invalidas.push(indice + 1);
  });
  return invalidas;
}