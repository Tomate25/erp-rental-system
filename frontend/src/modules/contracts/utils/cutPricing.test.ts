import { describe, expect, it } from 'vitest';
import { amountForCumulativeDays, dailyGrossRate, calendarDays, rentalCalendarDay } from './cutPricing';

describe('cortes de renta diaria y mixta', () => {
  it('calcula 22, 22 y 7 días con la tarifa diaria pactada', () => {
    const rate = dailyGrossRate({
      fechaInicio: '2026-09-25T12:00:00.000Z',
      fechaFin: '2026-10-17T12:00:00.000Z',
      items: [{ id: 'item', equipoId: 'eq', tipoControl: 'SERIALIZADO', cantidad: 1, precioRenta: 660, dias: 1, tipoTarifa: 'DIA', horometroInicial: 0 }],
      cotizacion: { numeroCotizacion: 'COT-1', total: 759 },
    });
    expect(rate).toBe(759);
    expect([amountForCumulativeDays(rate!, 0, 22), amountForCumulativeDays(rate!, 22, 22), amountForCumulativeDays(rate!, 44, 7)]).toEqual([16698, 16698, 5313]);
  });

  it('calcula contrato mixto de 21 días con cortes cada 2 días sin convertir días en 24h', () => {
    const days = calendarDays(new Date('2026-10-01T12:00:00.000Z'), new Date('2026-10-22T12:00:00.000Z'));
    expect(days).toBe(21);

    // Item 1: Camión (DIA) -> 1000 C$/día
    // Item 2: Retroexcavadora (HORA) -> 500 C$/hora con 8 horas previstas al día (4,000 C$/día, no 24*500)
    const contract = {
      fechaInicio: '2026-10-01T12:00:00.000Z',
      fechaFin: '2026-10-22T12:00:00.000Z',
      items: [
        { id: 'item-dia', equipoId: 'camion', tipoControl: 'SERIALIZADO' as const, cantidad: 1, precioRenta: 1000, dias: 21, tipoTarifa: 'DIA' as const, horometroInicial: 0 },
        { id: 'item-hora', equipoId: 'retro', tipoControl: 'SERIALIZADO' as const, cantidad: 1, precioRenta: 500, dias: 168, tipoTarifa: 'HORA' as const, horometroInicial: 100 },
      ],
    };

    const horasPorDiaMap = { 'item-hora': 8 };
    const rate = dailyGrossRate(contract, horasPorDiaMap);

    // 1000 (Camión) + 500 * 8 (Retroexcavadora) = 5,000 C$/día combinado
    expect(rate).toBe(5000);

    // Corte regular de 2 días: 2 días * 5000 = 10,000 C$
    // (Retroexcavadora aporta 2d * 8h = 16h * 500 = 8000 C$; Camión aporta 2d * 1000 = 2000 C$)
    const corte2Dias = amountForCumulativeDays(rate!, 0, 2);
    expect(corte2Dias).toBe(10000);

    // Corte final de 1 día (para completar 21 días: 10 cortes de 2d + 1 corte de 1d)
    const corte1Dia = amountForCumulativeDays(rate!, 20, 1);
    expect(corte1Dia).toBe(5000);

    // Total acumulado de los 21 días = 105,000 C$
    const total21Dias = amountForCumulativeDays(rate!, 0, 21);
    expect(total21Dias).toBe(105000);
  });

  it('normaliza fechas de calendario en zona horaria America/Managua', () => {
    const day1 = rentalCalendarDay('2026-09-26T12:00:00.000Z');
    const day2 = rentalCalendarDay(new Date('2026-09-26T18:00:00.000Z'));
    expect(day1).toBe(day2);

    const nextDay = rentalCalendarDay('2026-09-27T12:00:00.000Z');
    expect(nextDay).toBeGreaterThan(day1);
  });
});

