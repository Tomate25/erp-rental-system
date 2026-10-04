import { Prisma } from '@prisma/client';
import { LIMITS } from '../../../common/validation/dto-limits';
import { duracionContratoDias, duracionLineaDias } from './contract-duration';

const D = (v: string | number) => new Prisma.Decimal(v);

describe('duracion del contrato derivada de la cotizacion (sin fechaFinRenta)', () => {
  it('HORA con 87600 horas dura 3650 dias, no 240 anos', () => {
    const dias = duracionContratoDias([
      { tipoCobro: 'POR_HORA', dias: D(87600), horas: D(87600) },
    ]);
    expect(dias).toBe(3650);
    expect(dias).toBe(LIMITS.DAYS_MAX);
  });

  it('HORA usa horas/24 redondeado hacia arriba (y dias solo si falta horas)', () => {
    expect(duracionLineaDias({ tipoCobro: 'POR_HORA', horas: D(8) })).toBe(1);
    expect(duracionLineaDias({ tipoCobro: 'POR_HORA', horas: D(24) })).toBe(1);
    expect(duracionLineaDias({ tipoCobro: 'POR_HORA', horas: D('24.01') })).toBe(2);
    expect(duracionLineaDias({ tipoCobro: 'POR_HORA', horas: D(240) })).toBe(10);
    expect(duracionLineaDias({ tipoCobro: 'POR_HORA', horas: null, dias: D(48) })).toBe(2);
    expect(duracionLineaDias({ tipoCobro: 'POR_HORA', horas: 19.5 })).toBe(1);
  });

  it('HORA sin horas ni dias validos cae al valor por defecto de 30 dias', () => {
    expect(duracionLineaDias({ tipoCobro: 'POR_HORA' })).toBe(30);
    expect(duracionLineaDias({ tipoCobro: 'POR_HORA', horas: D(0), dias: D(0) })).toBe(30);
  });

  it('DIA conserva dias como dias (Decimal o number) y 30 por defecto', () => {
    expect(duracionLineaDias({ tipoCobro: 'POR_DIA', dias: D(15) })).toBe(15);
    expect(duracionLineaDias({ dias: 7 })).toBe(7);
    expect(duracionLineaDias({ tipoCobro: 'POR_DIA', dias: D('2.5') })).toBe(2.5);
    expect(duracionLineaDias({ tipoCobro: 'POR_DIA', dias: null })).toBe(30);
  });

  it('toma el maximo entre lineas mixtas DIA/HORA', () => {
    expect(
      duracionContratoDias([
        { tipoCobro: 'POR_DIA', dias: D(5) },
        { tipoCobro: 'POR_HORA', horas: D(240) }, // 10 dias
        { tipoCobro: 'POR_HORA', horas: D(8) }, // 1 dia
      ]),
    ).toBe(10);
  });

  it('aplica el tope de 3650 tambien a lineas DIA fuera de rango (datos heredados)', () => {
    expect(duracionContratoDias([{ tipoCobro: 'POR_DIA', dias: D(99999) }])).toBe(3650);
  });

  it('sin lineas usa validezDias (o 30) con el mismo tope', () => {
    expect(duracionContratoDias([], 15)).toBe(15);
    expect(duracionContratoDias(undefined, null)).toBe(30);
    expect(duracionContratoDias(null, 100000)).toBe(3650);
  });
});
