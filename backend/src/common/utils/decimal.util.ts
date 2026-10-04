import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Utilidades para valores que pueden llegar como number, string o Prisma.Decimal
 * (dias, horas, horasPactadas y similares). Es el UNICO punto de conversion
 * Decimal -> number de la capa de calculo y de los mappers de respuesta.
 *
 * Reglas:
 *  - Un Prisma.Decimal es un objeto: siempre es "truthy" (Decimal(0) incluido),
 *    asi que `d || 1` y `if (d)` NO sirven. Convertir primero y comparar el number.
 *  - `assertPositive` / `roundMoney` exigen `typeof === 'number'`.
 *  - JSON.stringify(Decimal) produce un string; los mappers deben devolver number.
 */
export type DecimalLike = Prisma.Decimal | number | string | null | undefined;

/** Maximo de una columna Decimal(12,2): 10 digitos enteros. */
export const DECIMAL_12_2_MAX = new Prisma.Decimal('9999999999.99');

function toDecimal(value: Exclude<DecimalLike, null | undefined>): Prisma.Decimal {
  try {
    const decimal = new Prisma.Decimal(
      typeof value === 'object' ? value.toString() : value,
    );
    if (!decimal.isFinite()) throw new Error('no finito');
    return decimal;
  } catch {
    throw new BadRequestException(
      `Valor de horas/dias invalido: ${String(value)}`,
    );
  }
}

/**
 * Convierte Decimal/string/number a number redondeado a 2 decimales
 * (half-up). `null`/`undefined` devuelven `fallback` (0 por defecto).
 * Lanza 400 si el valor no es un numero finito.
 */
export function toNumberHoras(value: DecimalLike, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  return toDecimal(value)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
    .toNumber();
}

/** Igual que `toNumberHoras` pero conserva `null` (para mappers de respuesta). */
export function toNumberHorasOrNull(value: DecimalLike): number | null {
  if (value === null || value === undefined) return null;
  return toNumberHoras(value);
}

/**
 * Convierte y aplica `fallback` si el valor es null/undefined o NO es mayor
 * que 0. Reemplaza al idioma `valor || fallback` con numeros (0 -> fallback)
 * de forma explicita y segura con Decimal.
 */
export function positiveHorasOr(value: DecimalLike, fallback: number): number {
  const n = toNumberHoras(value, 0);
  return n > 0 ? n : fallback;
}

/**
 * Producto exacto (Decimal) de los factores, sin redondear. Lanza 400 si el
 * resultado excede Decimal(12,2).
 */
export function multiplyDecimal(...factors: DecimalLike[]): Prisma.Decimal {
  let product = new Prisma.Decimal(1);
  for (const factor of factors) {
    product = product.mul(
      factor === null || factor === undefined ? 0 : toDecimal(factor),
    );
  }
  if (product.abs().gt(DECIMAL_12_2_MAX)) {
    throw new BadRequestException(
      'El importe calculado excede el maximo permitido (9,999,999,999.99).',
    );
  }
  return product;
}

/**
 * Valida un importe YA calculado (suma, IVA, total) contra el tope Decimal(12,2):
 * lanza 400 con un mensaje claro en lugar de dejar que PostgreSQL responda 500
 * ("numeric field overflow"). `etiqueta` va tras "El": p. ej. "total del documento".
 */
export function assertMoneyWithinLimit(value: number, etiqueta: string): number {
  // NaN no es mayor que nada: sin esta guarda pasaria el tope y llegaria a la BD.
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new BadRequestException(
      `El ${etiqueta} no es un numero valido (${String(value)}).`,
    );
  }
  if (new Prisma.Decimal(value).abs().gt(DECIMAL_12_2_MAX)) {
    throw new BadRequestException(
      `El ${etiqueta} (${value.toFixed(2)}) excede el maximo permitido (9,999,999,999.99).`,
    );
  }
  return value;
}

/** Producto de los factores como importe: 2 decimales, half-up, tope Decimal(12,2). */
export function multiplyToMoney(...factors: DecimalLike[]): number {
  return multiplyDecimal(...factors)
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
    .toNumber();
}