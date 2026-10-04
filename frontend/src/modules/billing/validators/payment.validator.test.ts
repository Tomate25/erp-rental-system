import { describe, expect, it } from 'vitest';
import {
  MSG_METODO,
  MSG_MONTO_MAXIMO,
  MSG_MONTO_NUMERO,
  MSG_MONTO_POSITIVO,
  buildPaymentPayload,
  montoComoTexto,
  montoInicialAbono,
  paymentSchema,
  quitarRuidoDecimal,
  validatePayment,
} from './payment.validator';

const form = (extra: Partial<Parameters<typeof validatePayment>[0]> = {}) => ({
  monto: '100',
  metodo: 'TRANSFERENCIA',
  referencia: '',
  banco: '',
  ...extra,
});

const error = (resultado: ReturnType<typeof validatePayment>) => (resultado.ok ? null : resultado.error);

describe('paymentSchema (RegisterPaymentDto)', () => {
  it('acepta solo monto', () => {
    expect(paymentSchema.safeParse({ monto: 100 }).success).toBe(true);
  });

  it('acepta el payload completo', () => {
    const r = paymentSchema.safeParse({ monto: 1500.75, metodo: 'CHEQUE', referencia: 'REF-1', banco: 'BAC', comprobanteUrl: 'https://x.com/c.pdf' });
    expect(r.success).toBe(true);
  });

  it.each(['TRANSFERENCIA', 'TARJETA', 'EFECTIVO', 'CHEQUE'])('acepta el método %s', (metodo) => {
    expect(paymentSchema.safeParse({ monto: 1, metodo }).success).toBe(true);
  });

  it.each([['BITCOIN'], ['efectivo'], ['']])('rechaza el método %j', (metodo) => {
    const r = paymentSchema.safeParse({ monto: 1, metodo });
    expect(r.success ? null : r.error.issues[0].message).toBe(MSG_METODO);
  });

  it('monto: 0,01 pasa y 0,009 / 0 / negativo fallan', () => {
    expect(paymentSchema.safeParse({ monto: 0.01 }).success).toBe(true);
    expect(error(validatePayment(form({ monto: '0' })))).toBe(MSG_MONTO_POSITIVO);
    expect(error(validatePayment(form({ monto: '-50' })))).toBe(MSG_MONTO_POSITIVO);
    expect(error(validatePayment(form({ monto: '0.009' })))).toBe(MSG_MONTO_NUMERO);
  });

  it('monto: el tope 9999999999,99 pasa y 10000000000 falla', () => {
    expect(validatePayment(form({ monto: '9999999999.99' })).ok).toBe(true);
    expect(error(validatePayment(form({ monto: '10000000000' })))).toBe(MSG_MONTO_MAXIMO);
    expect(MSG_MONTO_MAXIMO).toBe('El monto no puede superar 9999999999.99');
  });

  it('monto: 2 decimales pasan y 3 fallan', () => {
    expect(validatePayment(form({ monto: '10.12' })).ok).toBe(true);
    expect(error(validatePayment(form({ monto: '10.123' })))).toBe(MSG_MONTO_NUMERO);
  });

  it.each([[''], ['   '], ['abc'], ['1,5']])('monto %j no es un número válido (el vacío no es 0)', (monto) => {
    expect(error(validatePayment(form({ monto })))).toBe(MSG_MONTO_NUMERO);
  });

  it('referencia: 200 caracteres pasan y 201 fallan', () => {
    expect(validatePayment(form({ referencia: 'x'.repeat(200) })).ok).toBe(true);
    expect(error(validatePayment(form({ referencia: 'x'.repeat(201) })))).toBe('La referencia no puede superar 200 caracteres');
  });

  it('banco: 120 caracteres pasan y 121 fallan', () => {
    expect(validatePayment(form({ banco: 'x'.repeat(120) })).ok).toBe(true);
    expect(error(validatePayment(form({ banco: 'x'.repeat(121) })))).toBe('El banco no puede superar 120 caracteres');
  });

  it('comprobanteUrl: 500 caracteres pasan y 501 fallan (solo longitud)', () => {
    expect(paymentSchema.safeParse({ monto: 1, comprobanteUrl: 'x'.repeat(500) }).success).toBe(true);
    const r = paymentSchema.safeParse({ monto: 1, comprobanteUrl: 'x'.repeat(501) });
    expect(r.success ? null : r.error.issues[0].message).toBe('La URL del comprobante no puede superar 500 caracteres');
  });

  it('rechaza propiedades que no están en el DTO (como lo hace el backend)', () => {
    expect(paymentSchema.safeParse({ monto: 10, notas: 'x' }).success).toBe(false);
  });
});

describe('quitarRuidoDecimal (redondeo a 2 decimales)', () => {
  it.each([
    [100.10000000000001, 100.1],
    [0.1 + 0.2, 0.3],
    [1234.5600000000002, 1234.56],
    [100, 100],
    [0.01, 0.01],
  ])('%j -> %j', (entrada, esperado) => {
    expect(quitarRuidoDecimal(entrada)).toBe(esperado);
  });

  it('no cambia en silencio un valor escrito con más decimales', () => {
    expect(quitarRuidoDecimal(10.126)).toBe(10.126);
    expect(quitarRuidoDecimal(10.123)).toBe(10.123);
  });

  it('NaN e Infinity pasan sin cambios', () => {
    expect(quitarRuidoDecimal(Number.NaN)).toBeNaN();
    expect(quitarRuidoDecimal(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
  });

  it('el ruido de coma flotante daría 400 en el backend y con el redondeo pasa', () => {
    const saldo = 100.10000000000001;
    expect(paymentSchema.safeParse({ monto: saldo }).success).toBe(false);
    expect(validatePayment(form({ monto: saldo })).ok).toBe(true);
  });
});

describe('buildPaymentPayload (cuerpo exacto que se envía)', () => {
  it('solo monto y metodo cuando referencia y banco están vacíos', () => {
    expect(buildPaymentPayload(form({ referencia: '  ', banco: '  ' }))).toEqual({ monto: 100, metodo: 'TRANSFERENCIA' });
  });

  it('recorta referencia y banco, y el banco solo se envía con CHEQUE o TRANSFERENCIA', () => {
    expect(buildPaymentPayload(form({ referencia: ' TR-1 ', banco: ' BAC ' }))).toEqual({
      monto: 100,
      metodo: 'TRANSFERENCIA',
      referencia: 'TR-1',
      banco: 'BAC',
    });
    expect(buildPaymentPayload(form({ metodo: 'CHEQUE', banco: 'BAC' }))).toHaveProperty('banco', 'BAC');
    expect(buildPaymentPayload(form({ metodo: 'EFECTIVO', banco: 'BAC' }))).not.toHaveProperty('banco');
    expect(buildPaymentPayload(form({ metodo: 'TARJETA', banco: 'BAC' }))).not.toHaveProperty('banco');
  });

  it('nunca incluye campos fuera del DTO (no hay notas)', () => {
    const cuerpo = buildPaymentPayload(form({ metodo: 'CHEQUE', referencia: 'R', banco: 'B' }));
    expect(Object.keys(cuerpo).sort()).toEqual(['banco', 'metodo', 'monto', 'referencia']);
    expect(paymentSchema.safeParse(cuerpo).success).toBe(true);
  });

  it('el monto precargado con ruido sale redondeado', () => {
    expect(buildPaymentPayload(form({ monto: 100.10000000000001 })).monto).toBe(100.1);
  });
});

describe('validatePayment', () => {
  it('devuelve el cuerpo a enviar', () => {
    const r = validatePayment(form({ monto: '250.5', metodo: 'EFECTIVO', referencia: 'R-9' }));
    expect(r).toEqual({ ok: true, payload: { monto: 250.5, metodo: 'EFECTIVO', referencia: 'R-9' } });
  });

  it('devuelve un mensaje de error visible cuando el monto es 0 (antes salía en silencio)', () => {
    expect(validatePayment(form({ monto: '0' }))).toEqual({ ok: false, error: MSG_MONTO_POSITIVO });
  });
});

describe('montoInicialAbono (precarga del modal)', () => {
  it('usa el saldo pendiente', () => {
    expect(montoInicialAbono({ total: 500, totalPagado: 100, saldoPendiente: 400 })).toBe(400);
  });

  it('calcula total - pagado si no viene el saldo y quita el ruido de coma flotante', () => {
    expect(montoInicialAbono({ total: 200.2, totalPagado: 100.1 })).toBe(100.1);
    expect(montoInicialAbono({ total: 300.3, totalPagado: 200.2 })).toBe(100.1);
    expect(montoInicialAbono({ total: 500 })).toBe(500);
  });

  it('acepta importes como texto decimal', () => {
    expect(montoInicialAbono({ total: '1500.00', totalPagado: '500.10', saldoPendiente: '999.90' })).toBe(999.9);
    expect(montoInicialAbono({ total: '1500.00' })).toBe(1500);
  });

  it('si el saldo no es positivo usa el total', () => {
    expect(montoInicialAbono({ total: 500, totalPagado: 500, saldoPendiente: 0 })).toBe(500);
  });

  it('importes inválidos dan NaN (el campo queda vacío, no 0)', () => {
    expect(montoInicialAbono({ total: 'abc' })).toBeNaN();
    expect(montoComoTexto(montoInicialAbono({ total: null }))).toBe('');
  });
});

describe('montoComoTexto', () => {
  it.each([
    [100.1, '100.1'],
    [100, '100'],
    [0.01, '0.01'],
  ])('%j -> %j', (entrada, esperado) => {
    expect(montoComoTexto(entrada)).toBe(esperado);
  });

  it('NaN da texto vacío', () => {
    expect(montoComoTexto(Number.NaN)).toBe('');
  });
});