import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  multiplyDecimal,
  multiplyToMoney,
  positiveHorasOr,
  toNumberHoras,
  toNumberHorasOrNull,
} from './decimal.util';
import { calculateItemAmount } from './financial-calculator';

describe('decimal.util', () => {
  describe('toNumberHoras', () => {
    it('convierte number, string y Decimal a number con 2 decimales', () => {
      expect(toNumberHoras(8)).toBe(8);
      expect(toNumberHoras('19.5')).toBe(19.5);
      expect(toNumberHoras(new Prisma.Decimal('152'))).toBe(152);
      expect(toNumberHoras(new Prisma.Decimal('6.505'))).toBe(6.51);
      expect(toNumberHoras(6.504)).toBe(6.5);
      expect(typeof toNumberHoras(new Prisma.Decimal('6.5'))).toBe('number');
    });

    it('null/undefined devuelven el valor por defecto (0 si no se indica)', () => {
      expect(toNumberHoras(null)).toBe(0);
      expect(toNumberHoras(undefined)).toBe(0);
      expect(toNumberHoras(null, 1)).toBe(1);
      expect(toNumberHoras(undefined, 30)).toBe(30);
    });

    it('rechaza valores no numericos con 400', () => {
      expect(() => toNumberHoras('abc')).toThrow(BadRequestException);
      expect(() => toNumberHoras(Number.NaN)).toThrow(BadRequestException);
      expect(() => toNumberHoras(Infinity)).toThrow(BadRequestException);
    });
  });

  describe('toNumberHorasOrNull (mappers de respuesta)', () => {
    it('conserva null y devuelve number para Decimal', () => {
      expect(toNumberHorasOrNull(null)).toBeNull();
      expect(toNumberHorasOrNull(undefined)).toBeNull();
      expect(toNumberHorasOrNull(new Prisma.Decimal('24'))).toBe(24);
    });

    it('la serializacion JSON sale como numero y no como texto', () => {
      const decimal = new Prisma.Decimal('19.5');
      expect(JSON.stringify({ dias: decimal })).toBe('{"dias":"19.5"}');
      expect(JSON.stringify({ dias: toNumberHorasOrNull(decimal) })).toBe(
        '{"dias":19.5}',
      );
    });
  });

  describe('positiveHorasOr', () => {
    it('Decimal(0) usa el valor por defecto (en un Decimal "d || 30" daria el objeto)', () => {
      const cero = new Prisma.Decimal(0);
      // Un Decimal es un objeto: siempre truthy, por eso no se usa `||`.
      expect((cero as unknown) ? true : false).toBe(true);
      expect(positiveHorasOr(cero, 30)).toBe(30);
      expect(positiveHorasOr(0, 30)).toBe(30);
      expect(positiveHorasOr(null, 30)).toBe(30);
      expect(positiveHorasOr(new Prisma.Decimal('0.004'), 30)).toBe(30);
      expect(positiveHorasOr(new Prisma.Decimal('12.5'), 30)).toBe(12.5);
    });
  });

  describe('multiplyToMoney', () => {
    it('6.5 x 3 = 19.5 y 24 x 152 = 3648 sin error binario', () => {
      expect(multiplyDecimal(6.5, 3).toString()).toBe('19.5');
      expect(multiplyDecimal(24, 152).toString()).toBe('3648');
      expect(multiplyToMoney(2, 19.5, 100)).toBe(3900);
      expect(multiplyToMoney(24, 152, new Prisma.Decimal('10.25'))).toBe(37392);
    });

    it('redondea half-up a 2 decimales con tarifas de 4 decimales', () => {
      expect(multiplyToMoney(1, 0.5, 0.0101)).toBe(0.01); // 0.00505
      expect(multiplyToMoney(3, 1.005, 1)).toBe(3.02); // 3.015
      expect(multiplyToMoney(1.1, 3, 1)).toBe(3.3);
    });

    it('lanza 400 si el total excede Decimal(12,2)', () => {
      expect(() => multiplyToMoney(100000, 87600, 99999999.99)).toThrow(
        BadRequestException,
      );
      expect(multiplyToMoney(1, 1, 9999999999.99)).toBe(9999999999.99);
    });
  });

  describe('calculateItemAmount con horas decimales', () => {
    it('HORA: cantidad x horas x tarifa usa Decimal', () => {
      const r = calculateItemAmount({
        cantidad: 2,
        dias: 19.5,
        horas: 19.5,
        tipoTarifa: 'HORA',
        precioUnitario: 100,
      });
      expect(r.horas).toBe(19.5);
      expect(r.subtotal).toBe(3900);
    });

    it('HORA 24 x 152 y DIA enteros', () => {
      expect(
        calculateItemAmount({
          cantidad: 1,
          dias: 152,
          horas: 152,
          tipoTarifa: 'HORA',
          precioUnitario: 24,
        }).subtotal,
      ).toBe(3648);
      expect(
        calculateItemAmount({ cantidad: 2, dias: 3, precioUnitario: 50 }).subtotal,
      ).toBe(300);
    });

    it('rechaza con 400 un importe que excede Decimal(12,2)', () => {
      expect(() =>
        calculateItemAmount({
          cantidad: 100000,
          dias: 87600,
          horas: 87600,
          tipoTarifa: 'HORA',
          precioUnitario: 99999999.99,
        }),
      ).toThrow(BadRequestException);
    });
  });
});