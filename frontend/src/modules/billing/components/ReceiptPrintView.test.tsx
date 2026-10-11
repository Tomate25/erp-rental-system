import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { ReceiptPrintView } from './ReceiptPrintView';
import type { Factura, FacturaPago } from '../types/billing.types';

describe('ReceiptPrintView', () => {
  const baseFactura: Factura = {
    id: 'fac-1',
    folio: 'FAC-CRT-CTR-2026-0003-C1',
    tipo: 'CORTE',
    estado: 'PAGADA',
    total: 391,
    saldoPendiente: 0,
    totalPagado: 391,
    fechaEmision: '2026-10-10',
    cliente: {
      id: 'cli-1',
      nombre: 'AVINICA',
      identificacion: '001-000000-0000A',
    },
    contrato: {
      id: 'ctr-1',
      codigo: 'CTR-2026-0003',
    },
    items: [],
  };

  const basePago: FacturaPago = {
    id: 'pago-1',
    facturaId: 'fac-1',
    monto: 391,
    metodo: 'TARJETA',
    referencia: 'TR-982341',
    fechaPago: '2026-10-10T12:00:00.000Z',
  };

  it('muestra "Cancelación de factura" cuando la factura queda totalmente pagada', () => {
    const html = renderToStaticMarkup(<ReceiptPrintView factura={baseFactura} pago={basePago} onBack={() => undefined} />);

    expect(html).toContain('Cancelación de factura FAC-CRT-CTR-2026-0003-C1');
    expect(html).not.toContain('Abono a factura');
  });

  it('muestra "Pago a cuenta de factura" en pagos parciales donde aún resta saldo pendiente', () => {
    const facturaPendiente: Factura = {
      ...baseFactura,
      estado: 'PENDIENTE',
      saldoPendiente: 191,
      totalPagado: 200,
    };
    const pagoParcial: FacturaPago = {
      ...basePago,
      monto: 200,
    };

    const html = renderToStaticMarkup(<ReceiptPrintView factura={facturaPendiente} pago={pagoParcial} onBack={() => undefined} />);

    expect(html).toContain('Pago a cuenta de factura FAC-CRT-CTR-2026-0003-C1');
    expect(html).not.toContain('Abono a factura');
  });
});
