import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CancelQuotationModal } from './CancelQuotationModal';
import type { Cotizacion } from '../types/quotation.types';

const sampleQuotation: Cotizacion = {
  id: 'cot-1',
  numeroCotizacion: 'COT-0025',
  version: 2,
  clienteId: 'cli-1',
  cliente: { id: 'cli-1', nombre: 'Constructora Norte S.A.' } as any,
  estado: 'ACEPTADA',
  fechaEmision: '2026-11-20T00:00:00.000Z',
  fechaVence: '2026-12-05T00:00:00.000Z',
  validezDias: 15,
  subtotal: 1000,
  descuento: 0,
  iva: 150,
  total: 1150,
  tokenPublico: 'tok-1',
  createdAt: '2026-11-20T00:00:00.000Z',
  updatedAt: '2026-11-20T00:00:00.000Z',
};

describe('CancelQuotationModal', () => {
  it('renderiza el formulario de cancelación y avisa la liberación del contrato cuando está ACEPTADA', () => {
    const html = renderToStaticMarkup(
      <CancelQuotationModal
        isOpen={true}
        quotation={sampleQuotation}
        onClose={() => undefined}
        onConfirm={async () => undefined}
      />,
    );

    expect(html).toContain('Cancelar Cotización');
    expect(html).toContain('COT-0025');
    expect(html).toContain('Constructora Norte S.A.');
    expect(html).toContain('equipos reservados volverán a estar disponibles');
    expect(html).toContain('Confirmar Cancelación');
  });
});
