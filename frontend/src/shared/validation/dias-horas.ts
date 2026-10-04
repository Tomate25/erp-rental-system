import { GLOBAL_LIMITS } from './limits';

/**
 * Validacion de `dias` / `horas` por linea segun la tarifa. Replica el validador del backend
 * (`dias-horas.validator.ts`, commit b9ae54b): mismos rangos, mismos textos.
 *
 * - Linea DIA: `dias` entero de 1 a 3650; `horas` opcional, de 0 a 87600 con maximo 2 decimales.
 * - Linea HORA: `dias` y `horas` son horas totales: de 0,01 a 87600 con maximo 2 decimales.
 * - Una linea es horaria si `tipoTarifa === 'HORA'` o `tipoCobro === 'POR_HORA'` (mismo criterio que el backend).
 */

export const MSG_DIAS_DIA = 'dias debe ser un entero entre 1 y 3650 para tarifa DIA.';
export const MSG_DIAS_HORA = 'dias debe estar entre 0,01 y 87600 horas, con máximo 2 decimales, para tarifa HORA.';
export const MSG_HORAS_HORA = 'horas debe estar entre 0,01 y 87600 horas, con máximo 2 decimales, para tarifa HORA.';
export const MSG_HORAS_DIA = 'horas debe estar entre 0 y 87600 horas, con máximo 2 decimales.';

/**
 * Tolerancia, en centesimas, al ruido binario de la coma flotante: `21.900000000000002 * 100` da
 * `2190.0000000000005`, que dista 5e-13 de un entero y se acepta; `6.505 * 100` da `650.4999999999999`,
 * que dista ~0,5 del entero mas cercano y se rechaza. Mismo valor que usa el backend.
 */
export const TOLERANCIA_CENTESIMAS = 1e-6;

export const esLineaHoraria = (linea: { tipoTarifa?: unknown; tipoCobro?: unknown } | null | undefined): boolean =>
  linea?.tipoTarifa === 'HORA' || linea?.tipoCobro === 'POR_HORA';

const esNumeroFinito = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Maximo 2 decimales, tolerando el ruido de la coma flotante (ver `TOLERANCIA_CENTESIMAS`). */
export const tieneMaximoDosDecimales = (value: number): boolean =>
  Math.abs(value * 100 - Math.round(value * 100)) < TOLERANCIA_CENTESIMAS;

const horasValidas = (value: unknown, minimo: number): boolean =>
  esNumeroFinito(value) && value >= minimo && value <= GLOBAL_LIMITS.HOURS_TOTAL_MAX && tieneMaximoDosDecimales(value);

export const diasValido = (value: unknown, horaria: boolean): boolean =>
  horaria
    ? horasValidas(value, 0.01)
    : esNumeroFinito(value) && Number.isInteger(value) && value >= 1 && value <= GLOBAL_LIMITS.DAYS_MAX;

export const horasValido = (value: unknown, horaria: boolean): boolean => horasValidas(value, horaria ? 0.01 : 0);

export interface LineaDiasHoras {
  tipoTarifa?: unknown;
  tipoCobro?: unknown;
  dias?: unknown;
  horas?: unknown;
}

export interface ErrorDiasHoras {
  campo: 'dias' | 'horas';
  message: string;
}

export interface OpcionesDiasHoras {
  /** `false` = `dias` puede faltar (undefined/null), como en contratos. Por defecto es obligatorio. */
  diasRequerido?: boolean;
}

/** Errores de `dias` / `horas` de una linea; `horas` ausente (undefined/null) solo falla en lineas HORA. */
export function validarDiasHorasLinea(linea: LineaDiasHoras, opciones: OpcionesDiasHoras = {}): ErrorDiasHoras[] {
  const { diasRequerido = true } = opciones;
  const horaria = esLineaHoraria(linea);
  const errores: ErrorDiasHoras[] = [];

  const diasAusente = linea.dias === undefined || linea.dias === null;
  if (!(diasAusente && !diasRequerido) && !diasValido(linea.dias, horaria)) {
    errores.push({ campo: 'dias', message: horaria ? MSG_DIAS_HORA : MSG_DIAS_DIA });
  }

  const horasAusente = linea.horas === undefined || linea.horas === null;
  if (!(horasAusente && !horaria) && !horasValido(linea.horas, horaria)) {
    errores.push({ campo: 'horas', message: horaria ? MSG_HORAS_HORA : MSG_HORAS_DIA });
  }
  return errores;
}

/** Primer error de un arreglo de lineas, con el prefijo "Línea N: "; `null` si todas son validas. */
export function primerErrorDiasHoras(lineas: readonly LineaDiasHoras[], opciones: OpcionesDiasHoras = {}): string | null {
  for (let i = 0; i < lineas.length; i += 1) {
    const [primero] = validarDiasHorasLinea(lineas[i], opciones);
    if (primero) return `Línea ${i + 1}: ${primero.message}`;
  }
  return null;
}

/** Redondea un monto a 2 decimales. */
export const redondear2 = (value: number): number => Math.round(value * 100) / 100;
