import { describe, expect, it } from 'vitest';
import { isContractContado } from './contractCondition';

describe('isContractContado helper', () => {
  it('identifica CONTADO si el contrato tiene "CONTADO" en condiciones', () => {
    expect(isContractContado({ condiciones: 'Condición de pago: CONTADO' })).toBe(true);
    expect(isContractContado({ condiciones: 'Venta de contado inmediato' })).toBe(true);
  });

  it('identifica CREDITO si el contrato tiene "CREDITO" o "CRÉDITO" en condiciones', () => {
    expect(isContractContado({ condiciones: 'Condición de pago: CRÉDITO 30 DÍAS' })).toBe(false);
    expect(isContractContado({ condiciones: 'Venta a credito' })).toBe(false);
  });

  it('identifica CONTADO si la cotización tiene "CONTADO" en condiciones', () => {
    expect(
      isContractContado({
        condiciones: 'Términos generales',
        cotizacion: { condiciones: 'Condición de pago: CONTADO' },
      }),
    ).toBe(true);
  });

  it('identifica CREDITO si la cotización tiene "CREDITO"', () => {
    expect(
      isContractContado({
        condiciones: 'Términos generales',
        cotizacion: { condiciones: 'Condición de pago: CRÉDITO 15 DÍAS' },
      }),
    ).toBe(false);
  });

  it('identifica CREDITO si el cliente tiene "30 Días" o "Crédito" en condicionPago', () => {
    expect(
      isContractContado({
        condiciones: 'Términos estándar',
        cliente: { condicionPago: '30 Días' },
      }),
    ).toBe(false);

    expect(
      isContractContado({
        condiciones: 'Términos estándar',
        cliente: { condicionPago: 'Crédito autorizador' },
      }),
    ).toBe(false);
  });

  it('identifica CONTADO por defecto si no hay estipulación de crédito', () => {
    expect(isContractContado({})).toBe(true);
    expect(isContractContado({ condiciones: 'Contrato estándar' })).toBe(true);
    expect(isContractContado({ cliente: { condicionPago: 'Contado' } })).toBe(true);
  });
});
