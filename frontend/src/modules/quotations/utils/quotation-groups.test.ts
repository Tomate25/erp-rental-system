import { describe, it, expect } from 'vitest';
import { groupQuotationsByNumber } from './quotation-groups';
import { EstadoCotizacionValues, type Cotizacion } from '../types/quotation.types';

const makeQuote = (overrides: Partial<Cotizacion>): Cotizacion => ({
  id: 'id-1',
  numeroCotizacion: 'COT-0001',
  version: 1,
  estado: EstadoCotizacionValues.ENVIADA,
  clienteId: 'cli-1',
  condiciones: 'Condición de pago: CONTADO.',
  validezDias: 15,
  descuento: 0,
  subtotal: 100,
  iva: 15,
  total: 115,
  tokenPublico: 'tok-1',
  items: [],
  fechaEmision: '2026-11-14T12:00:00.000Z',
  fechaVence: '2026-11-29T12:00:00.000Z',
  createdAt: '2026-11-14T12:00:00.000Z',
  updatedAt: '2026-11-14T12:00:00.000Z',
  ...overrides,
});

describe('groupQuotationsByNumber', () => {
  it('agrupa versiones del mismo numeroCotizacion y oculta v1 CANCELADA dentro de la carpeta de v2', () => {
    const v1 = makeQuote({
      id: 'q1',
      numeroCotizacion: 'COT-0001',
      version: 1,
      estado: EstadoCotizacionValues.CANCELADA,
      fechaEmision: '2026-11-14T10:00:00.000Z',
      createdAt: '2026-11-14T10:00:00.000Z',
    });
    const v2 = makeQuote({
      id: 'q2',
      numeroCotizacion: 'COT-0001',
      version: 2,
      estado: EstadoCotizacionValues.BORRADOR,
      fechaEmision: '2026-11-14T11:00:00.000Z',
      createdAt: '2026-11-14T11:00:00.000Z',
    });
    const otra = makeQuote({
      id: 'q3',
      numeroCotizacion: 'COT-0002',
      version: 1,
      estado: EstadoCotizacionValues.ENVIADA,
      fechaEmision: '2026-11-14T12:00:00.000Z',
      createdAt: '2026-11-14T12:00:00.000Z',
    });

    const groups = groupQuotationsByNumber([v1, v2, otra]);

    expect(groups).toHaveLength(2);
    expect(groups[0].key).toBe('COT-0002');
    expect(groups[1].key).toBe('COT-0001');
    expect(groups[1].latest.id).toBe('q2');
    expect(groups[1].archivedVersions.map((v) => v.id)).toEqual(['q1']);
  });
});
