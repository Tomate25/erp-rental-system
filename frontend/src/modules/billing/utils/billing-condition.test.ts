import { describe, it, expect } from 'vitest';
import {
  extraerDiasCredito,
  formatCondicionPagoLabel,
  resolveContratoCondicion,
  resolveInvoiceCondicion,
} from './billing-condition';

describe('billing-condition helpers', () => {
  it('detecta CONTADO aunque el cliente tenga crédito configurado por defecto', () => {
    const res = resolveContratoCondicion({
      condiciones: 'Condición de pago: CONTADO.',
      cotizacion: { condiciones: 'Condición de pago: CONTADO.' },
      cliente: { condicionPago: 'CRÉDITO 30 DIAS', diasCreditoPactados: 30 },
    });
    expect(res).toEqual({ condicionPago: 'CONTADO', plazoCreditoDias: undefined });
    expect(formatCondicionPagoLabel(res.condicionPago, res.plazoCreditoDias)).toBe('CONTADO');
  });

  it('respeta CONTADO en el contrato aunque la cotización original mencionara crédito', () => {
    const res = resolveContratoCondicion({
      condiciones: 'Condición de pago: CONTADO',
      cotizacion: { condiciones: 'Condición de pago: CRÉDITO 30 DIAS' },
      cliente: { condicionPago: 'CRÉDITO 30 DIAS', diasCreditoPactados: 30 },
    });
    expect(res).toEqual({ condicionPago: 'CONTADO', plazoCreditoDias: undefined });
  });

  it('extrae el plazo exacto en contratos a crédito (ej. 15 días o 30 días)', () => {
    expect(extraerDiasCredito('Condición de pago: CRÉDITO (15 días).')).toBe(15);
    expect(extraerDiasCredito('CREDITO_30_DIAS')).toBe(30);

    const ctr15 = resolveContratoCondicion({
      condiciones: 'Condición de pago: CRÉDITO (15 días).',
      cliente: { condicionPago: 'CRÉDITO 30 DIAS', diasCreditoPactados: 30 },
    });
    expect(ctr15).toEqual({ condicionPago: 'CREDITO', plazoCreditoDias: 15 });
    expect(formatCondicionPagoLabel(ctr15.condicionPago, ctr15.plazoCreditoDias)).toBe(
      'CRÉDITO (15 días)',
    );

    const ctrCliente = resolveContratoCondicion({
      condiciones: 'Contrato generado por aceptación de cotización.',
      cotizacion: { condiciones: null },
      cliente: { condicionPago: 'CREDITO_30_DIAS', diasCreditoPactados: 30 },
    });
    expect(ctrCliente).toEqual({ condicionPago: 'CREDITO', plazoCreditoDias: 30 });
    expect(formatCondicionPagoLabel(ctrCliente.condicionPago, ctrCliente.plazoCreditoDias)).toBe(
      'CRÉDITO (30 días)',
    );
  });

  it('nunca agrega días de plazo en facturas de CONTADO', () => {
    const invContado = resolveInvoiceCondicion({ condicionPago: 'CONTADO', plazoCreditoDias: 30 });
    expect(invContado).toEqual({ condicionPago: 'CONTADO', plazoCreditoDias: undefined });
    expect(formatCondicionPagoLabel('CONTADO', 30)).toBe('CONTADO');
  });
});
