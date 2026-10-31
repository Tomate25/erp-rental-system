import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NumberingSeriesPage } from './pages/NumberingSeriesPage';
import { numberingApi } from './services/numbering.api';
import type { SerieDocumento } from './types/numbering.types';

const mockSeries: SerieDocumento[] = [
  {
    id: 'serie-1',
    empresaId: 'emp-1',
    sucursalId: 'suc-km10',
    sucursal: {
      id: 'suc-km10',
      nombre: 'Sucursal Km 10.5',
      codigo: 'KM10',
    },
    tipoDocumento: 'FACTURA',
    serie: 'KM10',
    prefijo: 'FAC',
    plantilla: '{prefijo}-{serie}-{numero}',
    relleno: 6,
    numeroDesde: 1,
    numeroHasta: 999999,
    numeroActual: 125,
    reiniciaPorAnio: false,
    esFiscal: true,
    alertaPorcentaje: 80,
    estado: 'ACTIVA',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    foliosEmitidos: 125,
    totalRango: 999999,
    porcentajeConsumo: 1,
    foliosDisponibles: 999874,
    alertaSuperada: false,
    siguienteNumero: 126,
    siguientePreview: 'FAC-KM10-000126',
  },
];

describe('Numbering Module - Frontend Unit Tests', () => {
  it('1. exporta correctamente las funciones del cliente numberingApi', () => {
    expect(typeof numberingApi.getSeries).toBe('function');
    expect(typeof numberingApi.getSerie).toBe('function');
    expect(typeof numberingApi.createSerie).toBe('function');
    expect(typeof numberingApi.updateSerie).toBe('function');
    expect(typeof numberingApi.activateSerie).toBe('function');
    expect(typeof numberingApi.preview).toBe('function');
    expect(typeof numberingApi.getSucursales).toBe('function');
  });

  it('2. renderiza la vista NumberingSeriesPage con estructura oficial', () => {
    vi.spyOn(numberingApi, 'getSucursales').mockResolvedValue([]);
    vi.spyOn(numberingApi, 'getSeries').mockResolvedValue({
      items: mockSeries,
      kpis: {
        totalSeries: 1,
        activas: 1,
        agotadas: 0,
        enAlerta: 0,
      },
    });

    const html = renderToStaticMarkup(<NumberingSeriesPage canManage={true} />);

    expect(html).toContain('Series y Folios de Documentos');
    expect(html).toContain('Total Series');
    expect(html).toContain('Series Activas');
    expect(html).toContain('Nueva Serie de Folios');
  });

  it('3. oculta botón de creación si canManage es false', () => {
    const html = renderToStaticMarkup(<NumberingSeriesPage canManage={false} />);
    expect(html).toContain('Series y Folios de Documentos');
    expect(html).not.toContain('Nueva Serie de Folios');
  });
});
