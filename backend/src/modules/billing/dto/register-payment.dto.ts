import { MetodoPago } from '@prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';
import { DECIMAL_12_2_MAX } from './create-invoice.dto';

export const MSG_COMPROBANTE_URL =
  'La URL del comprobante debe ser una dirección http/https o una ruta relativa que empiece con "/"';

/**
 * Acepta solo '' (sin comprobante), una URL absoluta http/https sin credenciales
 * o una ruta relativa que empiece con un solo "/" (no "//host" ni con "\").
 * Rechaza javascript:, data:, file:, vbscript:, etc. y cualquier espacio o
 * caracter de control.
 *
 * Decision (0029): NO hay lista de hosts permitidos. El backend nunca hace
 * fetch/axios/http a esta URL (solo se guarda y se devuelve) ni la usa en
 * PDFs ni correos; ver backend-condiciones/NOTA_comprobanteUrl.md. Riesgo
 * restante: el front debe renderizar el enlace con rel="noopener noreferrer".
 */
export function esComprobanteUrlSegura(valor: unknown): boolean {
  if (typeof valor !== 'string') return false;
  if (valor === '') return true;
  // eslint-disable-next-line no-control-regex
  if (/[\s\u0000-\u001f\u007f\\]/.test(valor)) return false;
  if (valor.startsWith('/')) return !valor.startsWith('//');
  if (!/^https?:\/\/[^/]/i.test(valor)) return false;
  try {
    const url = new URL(valor);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.hostname !== '' &&
      url.username === '' &&
      url.password === ''
    );
  } catch {
    return false;
  }
}

@ValidatorConstraint({ name: 'esComprobanteUrlSegura', async: false })
class EsComprobanteUrlSegura implements ValidatorConstraintInterface {
  validate(valor: unknown) {
    return esComprobanteUrlSegura(valor);
  }
}

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
  @Validate(EsComprobanteUrlSegura, { message: MSG_COMPROBANTE_URL })
  comprobanteUrl?: string;
}
