import { z } from 'zod';
import { GLOBAL_LIMITS } from './limits';

const formatoNumero = new Intl.NumberFormat('es-NI', { maximumFractionDigits: 4 });
const fmt = (n: number): string => formatoNumero.format(n);

/** Cantidad de decimales de un número tal como se escribe (igual que `maxDecimalPlaces` del backend). */
export function countDecimals(value: number): number {
  const [mantisa, exponente] = String(Math.abs(value)).split('e');
  const fraccion = (mantisa.split('.')[1] ?? '').length;
  return Math.max(0, fraccion - Number(exponente ?? 0));
}

/** `true` si `value` es `YYYY-MM-DD` y existe en el calendario (rechaza 2026-02-30). */
export function isValidIsoDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const date = new Date(Date.UTC(2000, 0, 1));
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export interface MoneyOptions {
  /** Mínimo permitido (por defecto 0). */
  min?: number;
  /** Máximo permitido (por defecto MONEY_MAX = 999,999,999.99). */
  max?: number;
  /** Máximo de decimales (por defecto 2). `null` = sin límite de decimales (importes recalculados por el servidor). */
  decimals?: number | null;
  /** Nombre del campo para los mensajes, p. ej. "El límite de crédito". */
  label?: string;
}

/**
 * Número monetario/decimal: `>= min` (0 por defecto), `<= max` y con máximo de decimales.
 * Mensajes en español. No acepta NaN ni Infinity.
 */
export function money(options: MoneyOptions = {}) {
  const { min = 0, max = GLOBAL_LIMITS.MONEY_MAX, decimals = 2, label = 'El importe' } = options;
  let schema = z
    .number({ message: `${label} debe ser un número válido` })
    .min(min, {
      message: min === 0 ? `${label} no puede ser negativo` : `${label} no puede ser menor a ${fmt(min)}`,
    })
    .max(max, { message: `${label} no puede ser mayor a ${fmt(max)}` });
  if (decimals !== null) {
    schema = schema.refine((value) => countDecimals(value) <= decimals, {
      message: `${label} admite como máximo ${decimals} ${decimals === 1 ? 'decimal' : 'decimales'}`,
    });
  }
  return schema;
}

export interface QtyOptions {
  /** Mínimo permitido (por defecto 1). */
  min?: number;
  /** Máximo permitido (por defecto QTY_MAX = 100,000). */
  max?: number;
  /** Nombre del campo para los mensajes, p. ej. "La cantidad". */
  label?: string;
}

/** Cantidad entera: `>= min` (1 por defecto) y `<= max` (QTY_MAX por defecto). */
export function qty(options: QtyOptions = {}) {
  const { min = 1, max = GLOBAL_LIMITS.QTY_MAX, label = 'La cantidad' } = options;
  return z
    .number({ message: `${label} debe ser un número válido` })
    .int({ message: `${label} debe ser un número entero` })
    .min(min, {
      message: min === 1 ? `${label} debe ser al menos 1` : `${label} no puede ser menor a ${fmt(min)}`,
    })
    .max(max, { message: `${label} no puede ser mayor a ${fmt(max)}` });
}

/** Fecha `YYYY-MM-DD` válida en el calendario (rechaza fechas imposibles como 2026-02-30). */
export function isoDate(label = 'La fecha') {
  return z
    .string({ message: `${label} es requerida` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: `${label} debe tener el formato AAAA-MM-DD` })
    .refine((value) => !/^\d{4}-\d{2}-\d{2}$/.test(value) || isValidIsoDate(value), {
      message: `${label} no es una fecha válida`,
    });
}

/** Mensaje estándar de longitud máxima para `.max(n, { message: maxLen('El nombre', n) })`. */
export function maxLen(label: string, max: number): { message: string } {
  return { message: `${label} no puede superar ${fmt(max)} caracteres` };
}
