import { BadRequestException } from '@nestjs/common';
import { TipoCobro } from '@prisma/client';

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
      ? assertPositive(item.dias, 'dias')
      : 1;
  let horas: number | undefined = undefined;

  let factorTiempo = dias;
  if (isHourly) {
    const rawHoras = item.horas ?? item.dias ?? 1;
    horas = assertPositive(rawHoras, 'horas');
    factorTiempo = horas;
  }

  const bruto = roundMoney(cantidad * factorTiempo * precioUnitario);

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
  const iva = roundMoney(baseImponible * ivaRate);
  const total = roundMoney(baseImponible + iva);

  return {
    subtotal,
    descuento,
    baseImponible,
    iva,
    total,
  };
}
