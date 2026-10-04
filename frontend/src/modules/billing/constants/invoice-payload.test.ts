import { describe, expect, it } from 'vitest';
import { LIMITS } from '../../../shared/validation/limits';
import { FACTURA_CORTE_CREDITO_30 } from './invoice-payload';

/** Propiedades de `CreateInvoiceDto` (backend eba295c); cualquier otra da 400 por `forbidNonWhitelisted`. */
const CAMPOS_CREATE_INVOICE_DTO = ['sucursalId', 'tipoFactura', 'condicionPago', 'plazoCreditoDias', 'retencionIva', 'estado'];

describe('FACTURA_CORTE_CREDITO_30 (payload de facturar un corte)', () => {
  it('es exactamente { tipoFactura, condicionPago, plazoCreditoDias, estado }', () => {
    expect(FACTURA_CORTE_CREDITO_30).toEqual({
      tipoFactura: 'ESTANDAR',
      condicionPago: 'CREDITO',
      plazoCreditoDias: 30,
      estado: 'PENDIENTE',
    });
    expect(Object.keys(FACTURA_CORTE_CREDITO_30).sort()).toEqual(['condicionPago', 'estado', 'plazoCreditoDias', 'tipoFactura']);
  });

  it('no trae campos fuera del DTO', () => {
    for (const campo of Object.keys(FACTURA_CORTE_CREDITO_30)) expect(CAMPOS_CREATE_INVOICE_DTO).toContain(campo);
  });

  it('cumple los límites del DTO', () => {
    const { plazoCreditoDias, estado } = FACTURA_CORTE_CREDITO_30;
    expect(Number.isInteger(plazoCreditoDias)).toBe(true);
    expect(plazoCreditoDias).toBeGreaterThanOrEqual(LIMITS.factura.plazoCreditoDias.min);
    expect(plazoCreditoDias).toBeLessThanOrEqual(LIMITS.factura.plazoCreditoDias.max);
    expect(['PENDIENTE', 'PAGADA']).toContain(estado);
  });
});