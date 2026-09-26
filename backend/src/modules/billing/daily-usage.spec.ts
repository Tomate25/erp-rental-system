import { actualDailyRentalAmount } from './daily-usage';

describe('facturación por días físicamente utilizados', () => {
  const base = {
    items: [{ equipoId: 'EQ-1', cantidad: 1, precioRenta: 660, dias: 1, tipoTarifa: 'DIA' }],
    cotizacion: { total: 759 },
    despachos: [{ fechaDespacho: new Date('2026-09-25T15:00:00Z'), items: [{ equipoId: 'EQ-1', cantidad: 1 }] }],
    devoluciones: [],
  };

  it('cobra 22 días desde el despacho, no desde la apertura del contrato', () => {
    expect(actualDailyRentalAmount(base, new Date('2026-09-25T12:00:00Z'), new Date('2026-10-17T12:00:00Z'))).toBe(16698);
  });

  it('descuenta días antes del despacho y después de la devolución', () => {
    const actual = {
      ...base,
      despachos: [{ fechaDespacho: new Date('2026-09-28T15:00:00Z'), items: [{ equipoId: 'EQ-1', cantidad: 1 }] }],
      devoluciones: [{ fechaDevolucion: new Date('2026-10-10T15:00:00Z'), items: [{ equipoId: 'EQ-1', cantidadRetornada: 1 }] }],
    };
    expect(actualDailyRentalAmount(actual, new Date('2026-09-25T12:00:00Z'), new Date('2026-10-17T12:00:00Z'))).toBe(12 * 759);
  });
});
