import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OperationsBoard } from './OperationsBoard';

describe('OperationsBoard', () => {
  const mockContracts: any[] = [
    {
      id: 'ctr-multi',
      codigo: 'CTR-2026-MULTI',
      fechaInicio: '2026-10-12T12:00:00.000Z',
      fechaFin: '2026-10-25T12:00:00.000Z',
      estado: 'ACTIVO',
      cliente: {
        id: 'cli-1',
        nombre: 'Constructora El Bosque',
        direccion: 'Pista Suburbana Km 9, Managua',
      },
      items: [
        {
          id: 'item-1',
          equipoId: 'eq-puntales',
          cantidad: 173,
          equipo: {
            id: 'eq-puntales',
            modelo: 'Puntales Metálicos 3m',
            numeroSerie: '',
          },
        },
        {
          id: 'item-2',
          equipoId: 'eq-andamios',
          cantidad: 20,
          equipo: {
            id: 'eq-andamios',
            modelo: 'Andamios Estándar 1.5x2m',
            numeroSerie: '',
          },
        },
      ],
    },
  ];

  it('agrupa múltiples productos de un mismo contrato en UNA sola tarjeta en lugar de individuales', () => {
    const html = renderToStaticMarkup(
      <OperationsBoard
        contracts={mockContracts}
        despachos={[]}
        retornos={[]}
        solicitudesDespacho={[]}
        onProcessDespacho={vi.fn()}
        onProcessRetorno={vi.fn()}
      />
    );

    // Debe existir la tarjeta con el código de contrato
    expect(html).toContain('CTR-2026-MULTI');
    expect(html).toContain('Constructora El Bosque');
    expect(html).toContain('2 tipos de equipos');
    expect(html).toContain('Faltan 193');
    expect(html).not.toContain('u. por procesar');
  });

  it('muestra el estado de flete parcial en curso cuando parte de las unidades ya salieron en un camión', () => {
    // Simulamos que un primer camión despachó 100 de los 173 puntales
    const despachosPrevios = [
      {
        id: 'desp-1',
        contratoId: 'ctr-multi',
        items: [
          {
            equipoId: 'eq-puntales',
            cantidad: 100,
          },
        ],
      },
    ];

    const html = renderToStaticMarkup(
      <OperationsBoard
        contracts={mockContracts}
        despachos={despachosPrevios}
        retornos={[]}
        solicitudesDespacho={[]}
        onProcessDespacho={vi.fn()}
        onProcessRetorno={vi.fn()}
      />
    );

    // Debe mostrar badge de Flete Parcial en Curso
    expect(html).toContain('Flete parcial en curso');
    // Debe mostrar métricas: 100 salieron, 93 faltan (73 puntales + 20 andamios), total 193
    expect(html).toContain('Salieron 100 de 193 u.');
    expect(html).toContain('Faltan 93');
    expect(html).toContain('1 viaje(s)');
    expect(html).toContain('Flete parcial activo');
    expect(html).toContain('Procesar salida (93 u.)');
  });

  it('muestra una tarjeta compacta sin la nota repetida de camión', () => {
    const html = renderToStaticMarkup(
      <OperationsBoard
        contracts={mockContracts}
        despachos={[]}
        retornos={[]}
        solicitudesDespacho={[]}
        onProcessDespacho={vi.fn()}
        onProcessRetorno={vi.fn()}
      />
    );

    expect(html).toContain('Ver desglose por producto (2)');
    expect(html).toContain('Salieron 0 de 193 u.');
    expect(html).not.toContain('Capacidad de camión');
  });

  it('muestra KPIs claros y programación secundaria', () => {
    const html = renderToStaticMarkup(
      <OperationsBoard
        contracts={mockContracts}
        despachos={[]}
        retornos={[]}
        solicitudesDespacho={[]}
        onProcessDespacho={vi.fn()}
        onProcessRetorno={vi.fn()}
        onScheduleDespacho={vi.fn()}
      />
    );

    // Encabezado del centro de control sin tablero kanban tradicional
    expect(html).toContain('Salidas pendientes');
    expect(html).toContain('Faltan por salir');
    expect(html).toContain('Total despachadas');
    expect(html).toContain('Salidas de hoy');
    expect(html).toContain('Salidas vencidas');
    expect(html).not.toContain('Pasar a que ya salieron');
    expect(html).toContain('Programar');
  });

  it('vacia la cola de despacho y muestra la bandeja al dia cuando todas las unidades salieron', () => {
    // Simulamos que el contrato fue 100% despachado (173 puntales + 20 andamios)
    const despachosTotales = [
      {
        id: 'desp-full',
        contratoId: 'ctr-multi',
        items: [
          { equipoId: 'eq-puntales', cantidad: 173 },
          { equipoId: 'eq-andamios', cantidad: 20 },
        ],
      },
    ];

    const html = renderToStaticMarkup(
      <OperationsBoard
        contracts={mockContracts}
        despachos={despachosTotales}
        retornos={[]}
        solicitudesDespacho={[]}
        onProcessDespacho={vi.fn()}
        onProcessRetorno={vi.fn()}
      />
    );

    // Como ya salieron todas las unidades, la orden se saca de la cola y queda vacia
    expect(html).toContain('Bandeja de despacho al día');
    expect(html).toContain('Salidas');
    expect(html).not.toContain('CTR-2026-MULTI');
  });

  it('separa salidas de hoy y vencidas en los KPI', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-12T18:00:00.000Z'));
    try {
      const overdue = { ...mockContracts[0], fechaInicio: '2026-11-11T18:00:00.000Z' };
      const today = { ...mockContracts[0], id: 'ctr-today', codigo: 'CTR-TODAY', fechaInicio: '2026-11-12T18:00:00.000Z' };
      const html = renderToStaticMarkup(<OperationsBoard contracts={[overdue, today]} despachos={[]} retornos={[]} onProcessDespacho={vi.fn()} onProcessRetorno={vi.fn()} />);
      expect(html).toMatch(/Salidas de hoy.*?text-3xl[^>]*>1<\/div>/s);
      expect(html).toMatch(/Salidas vencidas.*?text-3xl[^>]*>1<\/div>/s);
      expect(html).toContain('Vencido (1d)');
      expect(html).toContain('CTR-TODAY');
    } finally {
      vi.useRealTimers();
    }
  });
});
