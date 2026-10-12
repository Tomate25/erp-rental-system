import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CxcKpiCards } from './components/CxcKpiCards';
import { cxcApi } from './services/cxc.api';
import type { KpiTramoItem } from './types/cxc.types';

describe('CxC Frontend Module - Unit Tests', () => {
  const mockKpis: KpiTramoItem[] = [
    { tramoId: 'corriente', nombre: 'Corriente', min: 0, max: 0, montoCordobas: 50000, montoVisualizado: 50000, porcentaje: 50, cantidadDocumentos: 5 },
    { tramoId: '1_30', nombre: '1-30 días', min: 1, max: 30, montoCordobas: 25000, montoVisualizado: 25000, porcentaje: 25, cantidadDocumentos: 2 },
    { tramoId: '31_60', nombre: '31-60 días', min: 31, max: 60, montoCordobas: 15000, montoVisualizado: 15000, porcentaje: 15, cantidadDocumentos: 1 },
    { tramoId: '61_90', nombre: '61-90 días', min: 61, max: 90, montoCordobas: 5000, montoVisualizado: 5000, porcentaje: 5, cantidadDocumentos: 1 },
    { tramoId: '90_mas', nombre: 'Más de 90 días', min: 91, max: 99999, montoCordobas: 5000, montoVisualizado: 5000, porcentaje: 5, cantidadDocumentos: 1 },
  ];

  it('1. exporta correctamente las funciones del cliente cxcApi', () => {
    expect(typeof cxcApi.getAntiguedad).toBe('function');
    expect(typeof cxcApi.getEstadoCuenta).toBe('function');
    expect(typeof cxcApi.getTipoCambioHoy).toBe('function');
    expect(typeof cxcApi.setTipoCambio).toBe('function');
    expect(typeof cxcApi.getRecibos).toBe('function');
    expect(typeof cxcApi.crearRecibo).toBe('function');
    expect(typeof cxcApi.anularRecibo).toBe('function');
    expect(typeof cxcApi.simularArreglo).toBe('function');
    expect(typeof cxcApi.getArreglos).toBe('function');
    expect(typeof cxcApi.formalizarArreglo).toBe('function');
    expect(typeof cxcApi.anularArreglo).toBe('function');
    expect(typeof cxcApi.getNotas).toBe('function');
    expect(typeof cxcApi.crearNota).toBe('function');
    expect(typeof cxcApi.anularNota).toBe('function');
  });

  it('2. renderiza CxcKpiCards con tasa oficial BCN y tarjetas de tramos en Córdobas', () => {
    const html = renderToStaticMarkup(
      <CxcKpiCards
        kpis={mockKpis}
        totalCartera={100000}
        totalDocumentos={10}
        moneda="NIO"
        onMonedaChange={vi.fn()}
        tipoCambioBcn={36.6243}
      />
    );

    expect(html).toContain('TC Oficial BCN:');
    expect(html).toContain('36.6243 NIO');
    expect(html).toContain('Corriente');
    expect(html).toContain('1-30 días');
    expect(html).toContain('31-60 días');
    expect(html).toContain('61-90 días');
    expect(html).toContain('Más de 90 días');
    expect(html).toContain('Total Cartera');
    expect(html).toContain('C$ 100,000.00');
    expect(html).toContain('10 documentos');
    expect(html).toContain('C$ Córdobas');
    expect(html).toContain('$ Dólares (USD)');
  });

  it('3. renderiza CxcKpiCards con formato en Dólares ($)', () => {
    const html = renderToStaticMarkup(
      <CxcKpiCards
        kpis={mockKpis.map((k) => ({
          ...k,
          montoVisualizado: Math.round((k.montoCordobas / 36.6243) * 100) / 100,
        }))}
        totalCartera={2730.43}
        totalDocumentos={10}
        moneda="USD"
        onMonedaChange={vi.fn()}
        tipoCambioBcn={36.6243}
      />
    );

    expect(html).toContain('$ 2,730.43');
    expect(html).toContain('$ 1,365.21');
  });
});
