import { z } from 'zod';
import { toNum, parseNumberOrNaN } from '../../../shared/utils/numbers';
import { redondear2 } from '../../../shared/validation/dias-horas';
import { countDecimals, maxLen } from '../../../shared/validation/helpers';
import { LIMITS } from '../../../shared/validation/limits';
import type { MetodoPago, RegisterPaymentPayload } from '../types/billing.types';

const L = LIMITS.pago;

/** Métodos que acepta `RegisterPaymentDto` (enum `MetodoPago` del backend). */
export const METODOS_PAGO = ['TRANSFERENCIA', 'TARJETA', 'EFECTIVO', 'CHEQUE'] as const satisfies readonly MetodoPago[];

/** Solo con estos métodos el formulario muestra (y envía) el banco. */
export const METODOS_CON_BANCO: readonly string[] = ['CHEQUE', 'TRANSFERENCIA'];

/** Textos copiados de `RegisterPaymentDto` (backend `fix/backend-aislamiento`, commit eba295c). */
export const MSG_MONTO_NUMERO = 'El monto debe ser un número válido con máximo 2 decimales';
export const MSG_MONTO_POSITIVO = 'El monto debe ser mayor que cero';
export const MSG_MONTO_MAXIMO = `El monto no puede superar ${L.monto.max}`;
export const MSG_METODO = 'El método de pago no es válido (TRANSFERENCIA, TARJETA, EFECTIVO, CHEQUE)';

/**
 * Cuerpo del abono (`POST /billing/invoices/:id/payment`). Es `strict`: el backend responde 400 ante cualquier
 * propiedad que no esté en el DTO (por ejemplo `notas`).
 *
 * - `monto`: número, máximo 2 decimales, de 0,01 a 9999999999,99 (tope Decimal(12,2)).
 * - `metodo`, `referencia` (<= 200), `banco` (<= 120) y `comprobanteUrl` (<= 500, solo longitud): opcionales.
 */
export const paymentSchema = z
  .object({
    monto: z
      .number({ message: MSG_MONTO_NUMERO })
      .refine((valor) => countDecimals(valor) <= (L.monto.decimales ?? 2), { message: MSG_MONTO_NUMERO })
      .min(L.monto.min, { message: MSG_MONTO_POSITIVO })
      .max(L.monto.max, { message: MSG_MONTO_MAXIMO }),
    metodo: z.enum(METODOS_PAGO, { message: MSG_METODO }).optional(),
    referencia: z
      .string({ message: 'La referencia debe ser texto' })
      .max(L.referencia, maxLen('La referencia', L.referencia))
      .optional(),
    banco: z
      .string({ message: 'El banco debe ser texto' })
      .max(L.banco, maxLen('El banco', L.banco))
      .optional(),
    comprobanteUrl: z
      .string({ message: 'La URL del comprobante debe ser texto' })
      .max(L.comprobanteUrl, maxLen('La URL del comprobante', L.comprobanteUrl))
      .optional(),
  })
  .strict();

/**
 * Quita el ruido de coma flotante de un importe (100.10000000000001 -> 100.1) redondeando a 2 decimales
 * (`Math.round(x * 100) / 100`), pero SOLO cuando la diferencia es ruido (< 1e-6). Un valor escrito con más
 * decimales (10.126) no se redondea: se deja tal cual para que el esquema lo rechace en vez de cambiar el importe
 * en silencio. `NaN` e `Infinity` se devuelven sin cambios.
 */
export function quitarRuidoDecimal(valor: number): number {
  if (!Number.isFinite(valor)) return valor;
  const redondeado = redondear2(valor);
  return Math.abs(valor - redondeado) < 1e-6 ? redondeado : valor;
}

export interface PaymentFormValues {
  /** Texto del campo (o número). Vacío o no numérico da `NaN` y el esquema lo rechaza; no se convierte en 0. */
  monto: string | number;
  metodo: string;
  referencia: string;
  banco: string;
}

/**
 * Arma el cuerpo EXACTO que se envía: `monto` (sin ruido de coma flotante) y `metodo`; `referencia` y `banco` solo
 * si tienen texto (recortado), y `banco` solo con los métodos que lo muestran. Nunca incluye campos fuera del DTO.
 */
export function buildPaymentPayload(form: PaymentFormValues): Record<string, unknown> {
  const referencia = form.referencia.trim();
  const banco = METODOS_CON_BANCO.includes(form.metodo) ? form.banco.trim() : '';
  return {
    monto: quitarRuidoDecimal(parseNumberOrNaN(form.monto)),
    metodo: form.metodo,
    ...(referencia ? { referencia } : {}),
    ...(banco ? { banco } : {}),
  };
}

export type PaymentValidation = { ok: true; payload: RegisterPaymentPayload } | { ok: false; error: string };

/** Valida el formulario del abono: devuelve el cuerpo a enviar o el primer mensaje de error (en español). */
export function validatePayment(form: PaymentFormValues): PaymentValidation {
  const resultado = paymentSchema.safeParse(buildPaymentPayload(form));
  if (resultado.success) return { ok: true, payload: resultado.data };
  return { ok: false, error: resultado.error.issues[0]?.message ?? MSG_MONTO_NUMERO };
}

/** Importes de la factura que el formulario del abono usa para precargar el monto. */
export interface FacturaImportes {
  total: unknown;
  totalPagado?: unknown;
  saldoPendiente?: unknown;
}

/**
 * Monto con el que se abre el modal del abono: el saldo pendiente (o total - pagado si no viene) y, si no es
 * positivo, el total; sin ruido de coma flotante. `NaN` si los importes no son números válidos.
 */
export function montoInicialAbono(factura: FacturaImportes): number {
  const total = toNum(factura.total);
  const pagado = toNum(factura.totalPagado);
  const saldo =
    factura.saldoPendiente !== undefined ? toNum(factura.saldoPendiente) : total - (Number.isFinite(pagado) ? pagado : 0);
  return quitarRuidoDecimal(saldo > 0 ? saldo : total);
}

/** Texto para el campo del monto: el número sin ceros sobrantes, o vacío si no es un número. */
export function montoComoTexto(monto: number): string {
  return Number.isFinite(monto) ? String(monto) : '';
}