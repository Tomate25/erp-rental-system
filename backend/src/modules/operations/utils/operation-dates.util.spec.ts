import { BadRequestException } from '@nestjs/common';
import {
  assertReceptionDate,
  assertScheduledDate,
  parseValidDate,
} from './operation-dates.util';

describe('operation-dates.util', () => {
  const ahora = new Date('2026-10-04T12:00:00.000Z');
  const inicio = new Date('2026-09-01T00:00:00.000Z');

  describe('parseValidDate', () => {
    it.each(['', 'no-es-fecha', undefined, null, '2026-02-30T00:00:00Z'.replace('2026', 'xxxx')])(
      'rechaza Invalid Date (%p)',
      (valor) => {
        expect(() => parseValidDate(valor as any, 'Campo')).toThrow(BadRequestException);
      },
    );
    it('acepta ISO válido', () => {
      expect(parseValidDate('2026-10-01T10:00:00Z', 'Campo').toISOString()).toBe('2026-10-01T10:00:00.000Z');
    });
  });

  describe('assertReceptionDate', () => {
    it('acepta ahora y fechas pasadas dentro del contrato', () => {
      expect(assertReceptionDate('2026-10-04T12:00:00Z', { ahora, desde: inicio })).toBeInstanceOf(Date);
      expect(assertReceptionDate('2026-09-15T08:00:00Z', { ahora, desde: inicio })).toBeInstanceOf(Date);
    });
    it('tolera hasta 5 minutos de desfase de reloj hacia el futuro', () => {
      expect(() => assertReceptionDate('2026-10-04T12:04:00Z', { ahora })).not.toThrow();
    });
    it('rechaza fechas futuras', () => {
      expect(() => assertReceptionDate('2026-10-05T12:00:00Z', { ahora })).toThrow(/futura/);
    });
    it('rechaza fechas anteriores al primer despacho/inicio', () => {
      expect(() => assertReceptionDate('2026-08-31T23:59:00Z', { ahora, desde: inicio })).toThrow(/anterior/);
    });
    it('rechaza Invalid Date', () => {
      expect(() => assertReceptionDate('basura', { ahora })).toThrow(BadRequestException);
    });
  });

  describe('assertScheduledDate', () => {
    it('acepta fechas futuras razonables', () => {
      expect(assertScheduledDate('2026-12-01T00:00:00Z', { ahora, desde: inicio })).toBeInstanceOf(Date);
    });
    it('rechaza anteriores al inicio del contrato', () => {
      expect(() => assertScheduledDate('2026-08-01T00:00:00Z', { ahora, desde: inicio })).toThrow(/anterior/);
    });
    it('rechaza más de un año hacia adelante', () => {
      expect(() => assertScheduledDate('2028-01-01T00:00:00Z', { ahora })).toThrow(/un año/);
    });
    it('rechaza Invalid Date', () => {
      expect(() => assertScheduledDate('x', { ahora })).toThrow(BadRequestException);
    });
  });
});