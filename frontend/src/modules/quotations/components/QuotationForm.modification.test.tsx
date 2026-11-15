import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuotationForm } from './QuotationForm';
import { EstadoCotizacionValues, type Cotizacion } from '../types/quotation.types';

const mocks = vi.hoisted(() => ({
  createQuotation: vi.fn(),
  updateQuotation: vi.fn(),
  createNewVersion: vi.fn(),
  getQuotationVersions: vi.fn(),
  acceptQuotationOnBehalf: vi.fn(),
  approveInternalQuotation: vi.fn(),
  getEquipmentPeriodAvailability: vi.fn(),
}));

vi.mock('../services/quotations.api', () => ({
  createQuotation: mocks.createQuotation,
  updateQuotation: mocks.updateQuotation,
  createNewVersion: mocks.createNewVersion,
  getQuotationVersions: mocks.getQuotationVersions,
  acceptQuotationOnBehalf: mocks.acceptQuotationOnBehalf,
  approveInternalQuotation: mocks.approveInternalQuotation,
}));

vi.mock('../../availability/services/availability.api', () => ({
  getEquipmentPeriodAvailability: mocks.getEquipmentPeriodAvailability,
}));

vi.mock('../../../shared/utils/auth-storage', () => ({
  getStoredUser: () => ({
    id: 'user-admin',
    nombre: 'Admin',
    roles: [{ nombre: 'ADMIN' }],
  }),
}));

const sampleQuotation: Cotizacion = {
  id: 'cot-v1',
  numeroCotizacion: 'COT-0001',
  version: 1,
  estado: EstadoCotizacionValues.ENVIADA,
  clienteId: 'cli-1',
  cliente: {
    id: 'cli-1',
    empresaId: 'emp-1',
    nombre: 'Constructora Norte S.A.',
    whatsappHabilitado: false,
    createdAt: '2026-11-14T00:00:00.000Z',
    updatedAt: '2026-11-14T00:00:00.000Z',
  },
  proyecto: 'Ampliación Nave',
  condiciones: 'Condición de pago: CONTADO.',
  validezDias: 15,
  fechaInicioRenta: '2026-11-15T00:00:00.000Z',
  fechaFinRenta: '2026-12-15T00:00:00.000Z',
  descuento: 0,
  subtotal: 1000,
  iva: 150,
  total: 1150,
  tokenPublico: 'tok-publico-1',
  fechaEmision: '2026-11-14T12:00:00.000Z',
  fechaVence: '2026-11-29T12:00:00.000Z',
  createdAt: '2026-11-14T12:00:00.000Z',
  updatedAt: '2026-11-14T12:00:00.000Z',
  items: [
    {
      descripcion: 'Andamio estándar',
      tipoCobro: 'POR_DIA',
      cantidad: 2,
      dias: 30,
      precioUnitario: 10,
      descuento: 0,
      subtotal: 600,
    },
  ],
};

describe('QuotationForm — modo modificación diferida (sin crear v2 prematuramente)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getQuotationVersions.mockResolvedValue([sampleQuotation]);
    mocks.getEquipmentPeriodAvailability.mockResolvedValue([]);
  });

  it('en visualización normal de ENVIADA muestra Sugerir Modificación (v2) y no llama a createNewVersion', () => {
    const html = renderToStaticMarkup(
      <QuotationForm
        initialData={sampleQuotation}
        startModification={false}
        onCancel={() => {}}
        onSubmitSuccess={() => {}}
      />,
    );

    expect(mocks.createNewVersion).not.toHaveBeenCalled();
    expect(html).toContain('Sugerir Modificación (v2)');
    expect(html).toContain('Aceptar y Generar Contrato');
    expect(html).not.toContain('Cancelar Modificación');
    expect(html).not.toContain('Guardar Borrador (v2)');
  });

  it('al abrir con startModification=true entra en modo modificación local sin invocar createNewVersion hasta confirmar', () => {
    const html = renderToStaticMarkup(
      <QuotationForm
        initialData={sampleQuotation}
        startModification={true}
        onCancel={() => {}}
        onSubmitSuccess={() => {}}
      />,
    );

    expect(mocks.createNewVersion).not.toHaveBeenCalled();
    expect(html).toContain('Modo modificación activo');
    expect(html).toContain('Cancelar Modificación');
    expect(html).toContain('Guardar Borrador (v2)');
    expect(html).toContain('Confirmar y Enviar (v2)');
    expect(html).not.toContain('Aceptar y Generar Contrato');
    expect(html).not.toContain('Sugerir Modificación (v2)');
  });
});
