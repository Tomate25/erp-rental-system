import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { SwapEquipmentModal } from './SwapEquipmentModal';

describe('SwapEquipmentModal', () => {
  const mockContract: any = {
    id: 'ctr-123',
    codigo: 'CTR-2026-0001',
    fechaInicio: '2026-10-01T12:00:00.000Z',
    fechaFin: '2026-10-10T12:00:00.000Z',
    cliente: {
      id: 'cli-1',
      nombre: 'Constructora Managua S.A.',
      rfc: 'J0310000001234',
    },
    items: [
      {
        id: 'det-1',
        equipoId: 'eq-1',
        cantidad: 1,
        horometroInicial: 100,
        equipo: {
          id: 'eq-1',
          modelo: 'CAT 320 Excavadora',
          numeroSerie: 'CAT-SN-001',
          horometro: 100,
        },
      },
    ],
  };

  it('renderiza la cabecera con código de contrato y cliente', () => {
    const html = renderToStaticMarkup(
      <SwapEquipmentModal
        contract={mockContract}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(html).toContain('Sustitución de Equipo por Avería (Cambio en Caliente)');
    expect(html).toContain('CONTRATO N°: CTR-2026-0001');
    expect(html).toContain('Constructora Managua S.A.');
  });

  it('incluye los pasos operativos: equipo averiado, reemplazo y acta', () => {
    const html = renderToStaticMarkup(
      <SwapEquipmentModal
        contract={mockContract}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(html).toContain('Paso 1: Equipo averiado que se retira');
    expect(html).toContain('Paso 2: Equipo sustituto disponible en almacén');
    expect(html).toContain('Paso 3: Acta de Sustitución y Datos de Entrega');
    expect(html).toContain('Confirmar y Sustituir Equipo');
  });
});
