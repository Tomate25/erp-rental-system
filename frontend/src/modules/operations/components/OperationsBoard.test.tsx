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
    // Indicador multiequipo agrupado
    expect(html).toContain('Contrato multiequipo: 2 productos combinados');
    // En lugar de dos tarjetas sueltas, muestra el total agregado (173 + 20 = 193)
    expect(html).toContain('193 u. por procesar');
    expect(html).toContain('193 u.'); // Total contrato
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
    expect(html).toContain('FLETE PARCIAL EN CURSO');
    // Debe mostrar métricas: 100 salieron, 93 faltan (73 puntales + 20 andamios), total 193
    expect(html).toContain('100 u.');
    expect(html).toContain('93 u.');
    expect(html).toContain('193 u.');
    expect(html).toContain('1 flete(s)');
    expect(html).toContain('Flete parcial activo');
    expect(html).toContain('Procesar Salida en Camión (93 u.)');
  });

  it('incluye el apartado de control de camiones y desglose de unidades por producto', () => {
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

    expect(html).toContain('Control de Fletes y Capacidad de Camión');
    expect(html).toContain('Faltan x Salir');
    expect(html).toContain('Ya Salieron');
    expect(html).toContain('Total Contrato');
    expect(html).toContain('Capacidad de camión');
  });
});
