import { CondicionPagoFactura, TipoFactura } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';

/**
 * Tope real de las columnas Decimal(12,2) de PostgreSQL
 * (10 enteros + 2 decimales). Es mayor que LIMITS.MONEY_MAX, que es un tope
 * de negocio para importes de documentos.
 */
export const DECIMAL_12_2_MAX = 9_999_999_999.99;

/**
 * Una factura nace siempre PENDIENTE: el cobro se registra con
 * POST /billing/invoices/:id/payment (o /pay), que crea el Pago y recalcula el
 * estado. Ningun cliente (front, scripts, docs) envia PAGADA al crear; aceptarlo
 * dejaria una factura PAGADA sin ningun Pago registrado.
 */
export const ESTADOS_INICIALES_FACTURA = ['PENDIENTE'] as const;

/**
 * Cuerpo de POST /billing/invoice-quote/:id y /billing/invoice-corte/:corteId.
 * Todos los campos son opcionales: el servicio aplica sus valores por defecto
 * (ESTANDAR, CONTADO, retención 0, estado PENDIENTE).
 */
export class CreateInvoiceDto {
  /** Solo se usa al facturar una cotización; el corte toma la sucursal del contrato. */
  @IsOptional()
  @IsUUID('4', { message: 'La sucursal debe ser un identificador UUID válido' })
  sucursalId?: string;

  @IsOptional()
  @IsEnum(TipoFactura, {
    message:
      'El tipo de factura no es válido (ESTANDAR, ANTICIPO, RECTIFICATIVA, CARGO_DANOS)',
  })
  tipoFactura?: TipoFactura;

  @IsOptional()
  @IsEnum(CondicionPagoFactura, {
    message: 'La condición de pago no es válida (CONTADO, CREDITO)',
  })
  condicionPago?: CondicionPagoFactura;

  @IsOptional()
  @IsInt({ message: 'El plazo de crédito debe ser un número entero de días' })
  @Min(0, { message: 'El plazo de crédito no puede ser negativo' })
  @Max(LIMITS.PERIOD_DAYS_MAX, {
    message: `El plazo de crédito no puede superar ${LIMITS.PERIOD_DAYS_MAX} días`,
  })
  plazoCreditoDias?: number;

  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'La retención de IVA debe ser un número válido con máximo 2 decimales',
    },
  )
  @Min(0, { message: 'La retención de IVA no puede ser negativa' })
  @Max(DECIMAL_12_2_MAX, {
    message: `La retención de IVA no puede superar ${DECIMAL_12_2_MAX}`,
  })
  retencionIva?: number;

  /** Solo PENDIENTE (o ausente: el servicio usa PENDIENTE). */
  @IsOptional()
  @IsIn(ESTADOS_INICIALES_FACTURA, {
    message:
      'El estado inicial de la factura solo puede ser PENDIENTE; para saldarla registre un pago',
  })
  estado?: (typeof ESTADOS_INICIALES_FACTURA)[number];
}
