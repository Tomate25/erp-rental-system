import { describe, expect, it } from 'vitest';
import { calculateReturnTiming, returnClassificationLabel } from './returnTiming';

const contract = {
  fechaInicio: '2026-10-01T12:00:00.000Z',
  fechaFin: '2026-10-11T12:00:00.000Z',
  items: [{
    id: 'item-1',
    equipoId: 'eq-1',
    tipoControl: 'SERIALIZADO' as const,
    cantidad: 1,
    precioRenta: 1500,
    dias: 10,
    tipoTarifa: 'DIA' as const,
    horometroInicial: 0,
  }],
};

describe('liquidación preliminar de retorno (returnTiming)', () => {
  it('cobra tiempo efectivo a tarifa pactada y excluye el día de devolución', () => {
    const result = calculateReturnTiming(contract, '2026-10-05T12:00:00.000Z');
    expect(result).toMatchObject({
      contractedDays: 10,
      effectiveDays: 4,
      differenceDays: 6,
      classification: 'ANTICIPADO',
      dailyRate: 1500,
      accruedAmount: 6000,
      unearnedDifference: 9000,
    });
    expect(returnClassificationLabel(result)).toContain('6 día(s) antes');
  });

  it('distingue retorno en fecha y tardío', () => {
    expect(calculateReturnTiming(contract, '2026-10-11T12:00:00.000Z').classification).toBe('EN_FECHA');
    const late = calculateReturnTiming(contract, '2026-10-13T12:00:00.000Z');
    expect(late.classification).toBe('TARDIO');
    expect(late.differenceDays).toBe(2);
    expect(returnClassificationLabel(late)).toContain('2 día(s) después');
  });

  it('respeta fechaFinPactada cuando difiere de fechaFin', () => {
    const extendedContract = {
      ...contract,
      fechaFin: '2026-10-20T12:00:00.000Z',
      fechaFinPactada: '2026-10-11T12:00:00.000Z',
    };
    const result = calculateReturnTiming(extendedContract, '2026-10-06T12:00:00.000Z');
    expect(result.contractedDays).toBe(10);
    expect(result.effectiveDays).toBe(5);
    expect(result.differenceDays).toBe(5);
    expect(result.classification).toBe('ANTICIPADO');
    expect(result.unearnedDifference).toBe(7500);
  });

  it('calcula tarifa agregada con múltiples equipos en contrato', () => {
    const multiContract = {
      fechaInicio: '2026-10-01T12:00:00.000Z',
      fechaFin: '2026-10-06T12:00:00.000Z',
      items: [
        {
          id: 'item-1',
          equipoId: 'eq-1',
          tipoControl: 'SERIALIZADO' as const,
          cantidad: 1,
          precioRenta: 1000,
          dias: 5,
          tipoTarifa: 'DIA' as const,
          horometroInicial: 0,
        },
        {
          id: 'item-2',
          equipoId: 'eq-2',
          tipoControl: 'POR_CANTIDAD' as const,
          cantidad: 2,
          precioRenta: 250,
          dias: 5,
          tipoTarifa: 'DIA' as const,
          horometroInicial: 0,
        },
      ],
    };
    const result = calculateReturnTiming(multiContract, '2026-10-03T12:00:00.000Z');
    // dailyRate: 1000 + (250 * 2) = 1500
    expect(result.dailyRate).toBe(1500);
    expect(result.contractedDays).toBe(5);
    expect(result.effectiveDays).toBe(2);
    expect(result.differenceDays).toBe(3);
    expect(result.contractedAmount).toBe(7500);
    expect(result.accruedAmount).toBe(3000);
    expect(result.unearnedDifference).toBe(4500);
  });
});
