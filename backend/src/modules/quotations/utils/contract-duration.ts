import { LIMITS } from '../../../common/validation/dto-limits';
import { DecimalLike, positiveHorasOr } from '../../../common/utils/decimal.util';

export type DuracionItem = {
  dias?: DecimalLike;
  horas?: DecimalLike;
  tipoCobro?: string | null;
};

const DURACION_POR_DEFECTO_DIAS = 30;

/**
 * Duracion en dias de una linea de cotizacion para derivar el fin del contrato
 * cuando la cotizacion NO trae `fechaFinRenta`.
 *  - Tarifa DIA: `dias` (son dias).
 *  - Tarifa HORA (tipoCobro POR_HORA): `dias`/`horas` son HORAS totales, asi que
 *    la duracion es horas / 24 redondeado hacia arriba (87600 h = 3650 dias,
 *    nunca 87600 dias = 240 anos).
 */
export function duracionLineaDias(item: DuracionItem): number {
  if (item.tipoCobro === 'POR_HORA') {
    const horas = positiveHorasOr(item.horas ?? item.dias, 0);
    return horas > 0 ? Math.ceil(horas / 24) : DURACION_POR_DEFECTO_DIAS;
  }
  return positiveHorasOr(item.dias, DURACION_POR_DEFECTO_DIAS);
}

/**
 * Duracion del contrato en dias (maximo de las lineas) con tope de
 * LIMITS.DAYS_MAX (3650, el maximo de dias de una linea DIA).
 */
export function duracionContratoDias(
  items: DuracionItem[] | null | undefined,
  validezDias?: number | null,
): number {
  const dias =
    items && items.length > 0
      ? Math.max(...items.map(duracionLineaDias))
      : validezDias || DURACION_POR_DEFECTO_DIAS;
  return Math.min(dias, LIMITS.DAYS_MAX);
}
