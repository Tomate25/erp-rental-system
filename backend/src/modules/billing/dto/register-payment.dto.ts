import { MetodoPago } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';
import { DECIMAL_12_2_MAX } from './create-invoice.dto';

/** Cuerpo de POST /billing/invoices/:id/payment. Solo `monto` es obligatorio. */
export class RegisterPaymentDto {
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El monto debe ser un número válido con máximo 2 decimales' },
  )
  @Min(0.01, { message: 'El monto debe ser mayor que cero' })
  @Max(DECIMAL_12_2_MAX, {
    message: `El monto no puede superar ${DECIMAL_12_2_MAX}`,
  })
  monto: number;

  @IsOptional()
  @IsEnum(MetodoPago, {
    message:
      'El método de pago no es válido (TRANSFERENCIA, TARJETA, EFECTIVO, CHEQUE)',
  })
  metodo?: MetodoPago;

  @IsOptional()
  @IsString({ message: 'La referencia debe ser texto' })
  @MaxLength(LIMITS.TEXT.SHORT, {
    message: `La referencia no puede superar ${LIMITS.TEXT.SHORT} caracteres`,
  })
  referencia?: string;

  @IsOptional()
  @IsString({ message: 'El banco debe ser texto' })
  @MaxLength(LIMITS.TEXT.NAME, {
    message: `El banco no puede superar ${LIMITS.TEXT.NAME} caracteres`,
  })
  banco?: string;

  @IsOptional()
  @IsString({ message: 'La URL del comprobante debe ser texto' })
  @MaxLength(LIMITS.TEXT.URL, {
    message: `La URL del comprobante no puede superar ${LIMITS.TEXT.URL} caracteres`,
  })
  comprobanteUrl?: string;
}
