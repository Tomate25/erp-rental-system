import { Prisma } from '@prisma/client';
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

describe('cortes con dias/horas Decimal (lectura de BD Decimal(10,2))', () => {
  const start = new Date('2026-09-26T12:00:00Z');
  const afterTwoDays = new Date('2026-09-28T12:00:00Z');
  const end = new Date('2026-10-17T12:00:00Z');
  const build = (dec: boolean) => {
    const n = (v: number) => (dec ? new Prisma.Decimal(String(v)) : v);
    return {
      fechaInicio: start,
      fechaFin: end,
      items: [
        { equipoId: 'dia', tipoTarifa: 'DIA', precioRenta: 100, cantidad: 1, dias: n(21) },
        { equipoId: 'hora-a', tipoTarifa: 'HORA', precioRenta: 50, cantidad: 2, dias: n(168.5), horasPactadas: n(168.5) },
      ],
      cotizacion: { total: 1150, items: [
        { precioUnitario: 100, cantidad: 1, dias: n(1), tipoCobro: 'POR_DIA' },
        { precioUnitario: 50, cantidad: 2, horas: n(8.5), tipoCobro: 'POR_HORA' },
      ] },
      despachos: [{ fechaDespacho: start, items: [
        { equipoId: 'dia', cantidad: 1 },
        { equipoId: 'hora-a', cantidad: 2 },
      ] }],
      devoluciones: [],
    };
  };

  it('Decimal y number dan exactamente los mismos importes y desgloses', () => {
    const num = build(false);
    const dec = build(true);
    expect(plannedDailyGrossRate(dec)).toBe(plannedDailyGrossRate(num));
    expect(plannedHourlyAmount(dec, start, afterTwoDays)).toBe(plannedHourlyAmount(num, start, afterTwoDays));
    expect(actualDailyRentalAmount(dec, start, afterTwoDays)).toBe(actualDailyRentalAmount(num, start, afterTwoDays));
    expect(hourlyBreakdown(dec, start, afterTwoDays)).toEqual(hourlyBreakdown(num, start, afterTwoDays));
    expect(hourlyBreakdown(dec, start, afterTwoDays)[0].horasPactadasTotalesPorEquipo).toBe(168.5);
    expect(typeof hourlyBreakdown(dec, start, afterTwoDays)[0].horasPactadasTotalesPorEquipo).toBe('number');
  });

  it('Decimal(0) en dias de un item por dia cuenta como 1 (no es truthy-seguro)', () => {
    const base = build(false);
    const withZero = {
      ...base,
      cotizacion: null,
      items: [{ equipoId: 'dia', tipoTarifa: 'DIA', precioRenta: 100, cantidad: 1, dias: new Prisma.Decimal(0) }],
    };
    const withNumberZero = { ...withZero, items: [{ ...withZero.items[0], dias: 0 }] };
    expect(plannedDailyGrossRate(withZero)).toBe(plannedDailyGrossRate(withNumberZero));
  });
});