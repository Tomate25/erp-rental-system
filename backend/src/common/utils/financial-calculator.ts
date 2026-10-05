import { BadRequestException } from '@nestjs/common';
import { Prisma, TipoCobro } from '@prisma/client';
import {
  assertMoneyWithinLimit,
  multiplyToMoney,
  toNumberHoras,
} from './decimal.util';

export const DEFAULT_IVA_RATE = 0.15; // 15% IVA oficial (Nicaragua / Centroamérica)

/**
 * Redondeo financiero exacto a 2 decimales evitando errores binarios de coma flotante.
 */
export function roundMoney(value: number, decimals: number = 2): number {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    throw new BadRequestException(`Valor monetario inválido: ${value}`);
  }
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Valida que un número sea finito y no negativo (>= 0).
 */
export function assertNonNegative(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    throw new BadRequestException(
      `El campo '${fieldName}' debe ser un número válido y finito.`,
    );
  }
  if (value < 0) {
    throw new BadRequestException(
      `El campo '${fieldName}' no puede ser negativo.`,
    );
  }
  return value;
}

/**
 * Valida que un número sea finito y estrictamente positivo (> 0).
 */
export function assertPositive(value: unknown, fieldName: string): number {
  const num = assertNonNegative(value, fieldName);
  if (num <= 0) {
    throw new BadRequestException(
      `El campo '${fieldName}' debe ser estrictamente mayor a 0.`,
    );
  }
  return num;
}

/**
 * Igual que `assertPositive`, pero redondea ANTES a 2 decimales (half-up), que
 * es lo que guarda Decimal(10,2): el dinero se calcula con el mismo valor que
 * queda persistido (21.900000000000002 -> 21.9). Un valor < 0,005 redondea a 0
 * y se rechaza igual que 0. Tolerancia del validador de DTOs (1e-6) sin cambios.
 */
export function assertPositiveHoras(value: unknown, fieldName: string): number {
  return assertPositive(
    toNumberHoras(assertPositive(value, fieldName)),
    fieldName,
  );
}

export interface ItemCalculationInput {
  cantidad: number;
  dias?: number;
  horas?: number;
  tipoCobro?: string;
  tipoTarifa?: string;
  precioUnitario: number;
  descuento?: number;
}

export interface ItemCalculationResult {
  cantidad: number;
  dias: number;
  horas?: number;
  tipoCobro: TipoCobro;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
}

export interface FinancialTotalsResult {
  subtotal: number;
  descuento: number;
  baseImponible: number;
  iva: number;
  total: number;
}

/**
 * Calcula y valida el subtotal y campos monetarios de un ítem individual de cotización o contrato.
 */
export function calculateItemAmount(
  item: ItemCalculationInput,
): ItemCalculationResult {
  const cantidad = assertPositive(item.cantidad, 'cantidad');
  if (!Number.isInteger(cantidad)) {
    throw new BadRequestException(
      "El campo 'cantidad' debe ser un número entero.",
    );
  }
  const precioUnitario = assertNonNegative(
    item.precioUnitario,
    'precioUnitario',
  );
  const descuento =
    item.descuento !== undefined && item.descuento !== null
      ? assertNonNegative(item.descuento, 'descuento')
      : 0;

  const isHourly =
    item.tipoCobro === TipoCobro.POR_HORA ||
    item.tipoCobro === 'POR_HORA' ||
    item.tipoTarifa === 'HORA';

  const tipoCobro = isHourly ? TipoCobro.POR_HORA : TipoCobro.POR_DIA;
  const dias =
    item.dias !== undefined && item.dias !== null
      ? assertPositiveHoras(item.dias, 'dias')
      : 1;
  let horas: number | undefined = undefined;

  let factorTiempo = dias;
  if (isHourly) {
    const rawHoras = item.horas ?? item.dias ?? 1;
    horas = assertPositiveHoras(rawHoras, 'horas');
    factorTiempo = horas;
  }

  // Decimal exacto (6.5 h x 3 x tarifa de 4 decimales) y tope Decimal(12,2) -> 400.
  const bruto = multiplyToMoney(cantidad, factorTiempo, precioUnitario);

  if (descuento > bruto) {
    throw new BadRequestException(
      `El descuento aplicado al ítem (${descuento}) no puede ser mayor que su importe bruto (${bruto}).`,
    );
  }

  const subtotal = roundMoney(bruto - descuento);

  return {
    cantidad,
    dias,
    horas,
    tipoCobro,
    precioUnitario: roundMoney(precioUnitario),
    descuento: roundMoney(descuento),
    subtotal,
  };
}

/**
 * Calcula los totales agregados (Subtotal, Descuento Global, Base Imponible, IVA y Total)
 * garantizando la coherencia matemática y el redondeo fiscal.
 */
export function calculateTotals(
  items: Array<{ subtotal: number }>,
  globalDiscount: number = 0,
  taxRate: number = DEFAULT_IVA_RATE,
): FinancialTotalsResult {
  const subtotal = roundMoney(
    items.reduce(
      (sum, item) => sum + assertNonNegative(item.subtotal, 'subtotal de ítem'),
      0,
    ),
  );

  // Cada importe se valida contra el tope Decimal(12,2): una linea de 9,9e9 mas
  // IVA ya desborda el total y debe ser 400, no un 500 de PostgreSQL.
  assertMoneyWithinLimit(subtotal, 'subtotal del documento');

  const descuento = roundMoney(
    globalDiscount ? assertNonNegative(globalDiscount, 'descuento global') : 0,
  );

  if (descuento > subtotal) {
    throw new BadRequestException(
      `El descuento global (${descuento}) no puede ser mayor que el subtotal de la cotización (${subtotal}).`,
    );
  }

  const baseImponible = roundMoney(subtotal - descuento);
  const ivaRate = assertNonNegative(taxRate, 'tasaIVA');
  // IVA y total en Decimal con half-up: baseImponible * 0.15 en coma flotante
  // da p. ej. 2.0549999... para 13.70 y se redondeaba a 2.05 en lugar de 2.06.
  const baseDecimal = new Prisma.Decimal(String(baseImponible));
  const iva = assertMoneyWithinLimit(
    baseDecimal
      .mul(new Prisma.Decimal(String(ivaRate)))
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      .toNumber(),
    'IVA del documento',
  );
  const total = assertMoneyWithinLimit(
    baseDecimal
      .plus(new Prisma.Decimal(String(iva)))
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      .toNumber(),
    'total del documento (subtotal - descuento + IVA)',
  );

  return {
    subtotal,
    descuento,
    baseImponible,
    iva,
    total,
  };
}
