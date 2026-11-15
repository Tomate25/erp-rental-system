import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { RetornoForm } from './RetornoForm';

describe('RetornoForm', () => {
  const mockContract: any = {
    id: 'ctr-test-retorno',
    codigo: 'CTR-2026-0042',
    fechaInicio: '2026-10-01T08:00:00.000Z',
    fechaFin: '2026-10-15T18:00:00.000Z',
    fechaFinPactada: '2026-10-15T18:00:00.000Z',
    estado: 'ACTIVO',
    cliente: {
      id: 'cli-1',
      nombre: 'Desarrollos Urbanos S.A.',
      rfc: 'J0310000123456',
    },
    items: [
      {
        id: 'item-1',
        equipoId: 'eq-retro',
        tipoControl: 'SERIALIZADO',
        cantidad: 1,
        horometroInicial: 1250.5,
        equipo: {
          id: 'eq-retro',
          modelo: 'Retroexcavadora CAT 420F',
          numeroSerie: 'CAT420F-2026',
          tieneHorometro: true,
          horometro: 1250.5,
          tipoControl: 'SERIALIZADO',
          tipoMedicionCombustible: 'PORCENTAJE',
        },
      },
      {
        id: 'item-2',
        equipoId: 'eq-andamios',
        tipoControl: 'POR_CANTIDAD',
        cantidad: 100,
        equipo: {
          id: 'eq-andamios',
          modelo: 'Marco Andamio Estándar',
          numeroSerie: '',
          tieneHorometro: false,
          tipoControl: 'POR_CANTIDAD',
          tipoMedicionCombustible: 'NO_APLICA',
        },
      },
    ],
  };

  it('renderiza selector inteligente de estado para equipos serializados (Operativo, Dañado a taller, No regresó, Extraviado)', () => {
    const html = renderToStaticMarkup(
      <RetornoForm
        contract={mockContract}
        onBack={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Debe contener el código de contrato
    expect(html).toContain('CTR-2026-0042');
    expect(html).toContain('Desarrollos Urbanos S.A.');

    // Maquinaria serializada debe tener los 4 botones de selección de estado
    expect(html).toContain('Llegó Operativo');
    expect(html).toContain('Llegó Dañado');
    expect(html).toContain('No Regresó');
    expect(html).toContain('Extraviado');
    expect(html).toContain('DISPONIBLE');
  });

  it('renderiza desglose volumétrico y botones de acción rápida para equipos por cantidad', () => {
    const html = renderToStaticMarkup(
      <RetornoForm
        contract={{ ...mockContract, items: [mockContract.items[1]] }}
        onBack={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Lotes por cantidad deben tener accesos rápidos
    expect(html).toContain('Llegaron Todos Sanos (100 u.)');
    expect(html).toContain('Reportar Dañados a Taller');
    expect(html).toContain('Ninguno Regresó (En Obra)');

    // Cuatro controles de cantidad con botones accesibles
    expect(html).toContain('Restar Recibidas');
    expect(html).toContain('Sumar A taller');
    expect(html).toContain('Restar En obra');
    expect(html).toContain('Sumar Perdidas');

    // Balance inicial cuadrado
    expect(html).toContain('Balance cuadrado: 100 de 100 u.');
  });

  it('muestra resumen lateral y acciones fijas sin averías para equipos sanos', () => {
    const html = renderToStaticMarkup(
      <RetornoForm
        contract={mockContract}
        onBack={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Resumen consolidado del viaje
    expect(html).toContain('Resumen del viaje');
    expect(html).toContain('Recibidas');
    expect(html).toContain('A taller');
    expect(html).toContain('En obra');
    expect(html).toContain('Perdidas');
    expect(html).toContain('Registrar retorno e imprimir acta');
    expect(html).toContain('Reportar avería');
    expect(html).not.toContain('Control Inmediato de Patio BM');
  });
});
