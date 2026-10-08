import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Cotizacion } from '../types/quotation.types';

import { AcceptOnBehalfModal } from './AcceptOnBehalfModal';

describe('AcceptOnBehalfModal', () => {
  const mockQuotation = {
    id: 'cot-123',
    numeroCotizacion: 'COT-2026-0099',
    version: 1,
    clienteId: 'cli-1',
    cliente: {
      id: 'cli-1',
      codigo: 'CLI-001',
      nombre: 'Constructora M&M S.A.',
    } as any,
    total: 2500,
    subtotal: 2173.91,
    iva: 326.09,
    validezDias: 15,
    estado: 'ENVIADA' as any,
    fechaEmision: new Date().toISOString(),
    fechaVence: new Date(Date.now() + 86400000).toISOString(),
    items: [
      {
        id: 'item-1',
        cotizacionId: 'cot-123',
        descripcion: 'Generador Eléctrico 5kVA',
        cantidad: 1,
        dias: 5,
        precioUnitario: 500,
        subtotal: 2500,
        tipoCobro: 'POR_DIA',
      } as any,
    ],
  } as unknown as Cotizacion;

  it('no renderiza nada cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <AcceptOnBehalfModal
        isOpen={false}
        onClose={vi.fn()}
        quotation={mockQuotation}
        onConfirm={vi.fn()}
      />,
    );
    expect(html).toBe('');
  });

  it('no renderiza nada cuando quotation es null', () => {
    const html = renderToStaticMarkup(
      <AcceptOnBehalfModal
        isOpen={true}
        onClose={vi.fn()}
        quotation={null}
        onConfirm={vi.fn()}
      />,
    );
    expect(html).toBe('');
  });

  it('renderiza título, cliente, número de cotización y opciones de confirmación', () => {
    const html = renderToStaticMarkup(
      <AcceptOnBehalfModal
        isOpen={true}
        onClose={vi.fn()}
        quotation={mockQuotation}
        onConfirm={vi.fn()}
      />,
    );

    expect(html).toContain('Aceptar Cotización en Nombre del Cliente');
    expect(html).toContain('COT-2026-0099');
    expect(html).toContain('Constructora M&amp;M S.A.');
    expect(html).toContain('Llamada telefónica');
    expect(html).toContain('WhatsApp / Mensajería');
    expect(html).toContain('Acuerdo presencial / En obra');
    expect(html).toContain('Aceptar y Generar Contrato');
  });
});
