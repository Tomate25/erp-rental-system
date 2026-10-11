import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReceiptPrintView } from './ReceiptPrintView';
import type { Factura, FacturaPago } from '../types/billing.types';

describe('ReceiptPrintView', () => {
  const baseFactura = {
    id: 'fac-1',
    clienteId: 'cli-1',
    folio: 'FAC-CRT-CTR-2026-0003-C1',
    tipoFactura: 'ESTANDAR',
    condicionPago: 'CONTADO',
    estado: 'PAGADA',
    subtotal: 340,
    descuentoGlobal: 0,
    retencionIva: 0,
    iva: 51,
    total: 391,
    saldoPendiente: 0,
    totalPagado: 391,
    fechaEmision: '2026-10-10',
    fechaVence: '2026-10-10',
    cliente: {
      id: 'cli-1',
      empresaId: 'emp-1',
      nombre: 'AVINICA',
      cedula: '001-000000-0000A',
      whatsappHabilitado: false,
      createdAt: '2026-10-10',
      updatedAt: '2026-10-10',
    },
    contrato: {
      id: 'ctr-1',
      codigo: 'CTR-2026-0003',
    },
  } as unknown as Factura;

  const basePago: FacturaPago = {
    id: 'pago-1',
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
