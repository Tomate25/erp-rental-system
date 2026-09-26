import { plannedDailyGrossRate, plannedHourlyAmount, hourlyBreakdown } from './contract-cut-pricing';
import { actualDailyRentalAmount } from '../../billing/daily-usage';

describe('cortes mixtos por día y por hora', () => {
  const start = new Date('2026-09-26T12:00:00Z');
  const afterTwoDays = new Date('2026-09-28T12:00:00Z');
  const end = new Date('2026-10-17T12:00:00Z');
  const contract = {
    fechaInicio: start,
    fechaFin: end,
    items: [
      { equipoId: 'dia', tipoTarifa: 'DIA', precioRenta: 100, cantidad: 1, dias: 21 },
      { equipoId: 'hora-a', tipoTarifa: 'HORA', precioRenta: 50, cantidad: 2, dias: 8, horasPactadas: 168 },
      { equipoId: 'hora-b', tipoTarifa: 'HORA', precioRenta: 25, cantidad: 1, dias: 4, horasPactadas: 84 },
    ],
    cotizacion: { total: 1150, items: [
      { precioUnitario: 100, cantidad: 1, dias: 1, tipoCobro: 'POR_DIA' },
      { precioUnitario: 50, cantidad: 2, horas: 8, tipoCobro: 'POR_HORA' },
      { precioUnitario: 25, cantidad: 1, horas: 4, tipoCobro: 'POR_HORA' },
    ] },
    despachos: [{ fechaDespacho: start, items: [
      { equipoId: 'dia', cantidad: 1 },
      { equipoId: 'hora-a', cantidad: 2 },
      { equipoId: 'hora-b', cantidad: 1 },
    ] }],
    devoluciones: [],
  };

  it('suma cada producto y cantidad con su unidad para dos días de 21', () => {
    expect(plannedDailyGrossRate(contract)).toBe(1150);
    expect(plannedHourlyAmount(contract, start, afterTwoDays)).toBe(2070);
    expect(actualDailyRentalAmount(contract, start, afterTwoDays)).toBe(2300);
    expect(hourlyBreakdown(contract, start, afterTwoDays)).toEqual([
      expect.objectContaining({ equipoId: 'hora-a', cantidad: 2, horasProyectadasPorEquipo: 16 }),
      expect.objectContaining({ equipoId: 'hora-b', cantidad: 1, horasProyectadasPorEquipo: 8 }),
    ]);
  });

  it('no cobra antes del despacho y respeta el corte final de un día', () => {
    expect(actualDailyRentalAmount({ ...contract, despachos: [] }, start, afterTwoDays)).toBe(0);
    expect(actualDailyRentalAmount(contract, new Date('2026-10-16T12:00:00Z'), end)).toBe(1150);
  });
});
