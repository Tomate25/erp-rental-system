import { BadRequestException } from '@nestjs/common';
import { TipoCobro } from '@prisma/client';
import {
  roundMoney,
  assertNonNegative,
  assertPositive,
  calculateItemAmount,
  calculateTotals,
  DEFAULT_IVA_RATE,
} from './financial-calculator';

describe('FinancialCalculator', () => {
  describe('roundMoney', () => {
    it('redondea a 2 decimales según reglas financieras estándar', () => {
      expect(roundMoney(10.555)).toBe(10.56);
      expect(roundMoney(10.554)).toBe(10.55);
      expect(roundMoney(100.1)).toBe(100.1);
      expect(roundMoney(0)).toBe(0);
    });

    it('rechaza NaN, Infinity y tipos no numéricos', () => {
      expect(() => roundMoney(NaN)).toThrow(BadRequestException);
      expect(() => roundMoney(Infinity)).toThrow(BadRequestException);
      expect(() => roundMoney(-Infinity)).toThrow(BadRequestException);
      expect(() => roundMoney('100' as any)).toThrow(BadRequestException);
    });
  });

  describe('assertNonNegative & assertPositive', () => {
    it('permite 0 en assertNonNegative pero lo rechaza en assertPositive', () => {
      expect(assertNonNegative(0, 'campo')).toBe(0);
      expect(() => assertPositive(0, 'campo')).toThrow(BadRequestException);
    });

    it('rechaza números negativos', () => {
      expect(() => assertNonNegative(-5, 'monto')).toThrow(BadRequestException);
      expect(() => assertPositive(-0.01, 'monto')).toThrow(BadRequestException);
    });

    it('rechaza valores no finitos o nulos', () => {
      expect(() => assertNonNegative(null, 'test')).toThrow(
        BadRequestException,
      );
      expect(() => assertNonNegative(undefined, 'test')).toThrow(
        BadRequestException,
      );
      expect(() => assertPositive(NaN, 'test')).toThrow(BadRequestException);
    });
  });

  describe('calculateItemAmount', () => {
    it('calcula subtotal para cobro por día correctamente', () => {
      const res = calculateItemAmount({
        cantidad: 2,
        dias: 5,
        precioUnitario: 100,
        descuento: 50,
      });

      expect(res.tipoCobro).toBe(TipoCobro.POR_DIA);
      expect(res.cantidad).toBe(2);
      expect(res.dias).toBe(5);
      expect(res.precioUnitario).toBe(100);
      expect(res.descuento).toBe(50);
      // 2 * 5 * 100 = 1000 - 50 = 950
      expect(res.subtotal).toBe(950);
    });

    it('calcula subtotal para cobro por hora usando horas', () => {
      const res = calculateItemAmount({
        cantidad: 1,
        dias: 1,
        horas: 8,
        tipoCobro: TipoCobro.POR_HORA,
        precioUnitario: 75.5,
      });

      expect(res.tipoCobro).toBe(TipoCobro.POR_HORA);
      expect(res.horas).toBe(8);
      // 1 * 8 * 75.5 = 604
      expect(res.subtotal).toBe(604);
    });

    it('rechaza descuento superior al importe bruto del ítem', () => {
      expect(() =>
        calculateItemAmount({
          cantidad: 1,
          dias: 1,
          precioUnitario: 100,
          descuento: 150,
        }),
      ).toThrow(BadRequestException);
    });

    it('rechaza cantidades o días <= 0', () => {
      expect(() =>
        calculateItemAmount({
          cantidad: 0,
          dias: 5,
          precioUnitario: 100,
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        calculateItemAmount({
          cantidad: 1,
          dias: -1,
          precioUnitario: 100,
        }),
      ).toThrow(BadRequestException);
    });

    it('rechaza cantidades fraccionarias', () => {
      expect(() =>
        calculateItemAmount({
          cantidad: 1.5,
          dias: 1,
          precioUnitario: 100,
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('calculateTotals', () => {
    it('reconstruye subtotal, descuento, base imponible, IVA 15% y total fiscal', () => {
      const items = [{ subtotal: 1000 }, { subtotal: 500 }];
      const res = calculateTotals(items, 100, DEFAULT_IVA_RATE);

      expect(res.subtotal).toBe(1500);
      expect(res.descuento).toBe(100);
      expect(res.baseImponible).toBe(1400);
      // 1400 * 0.15 = 210
      expect(res.iva).toBe(210);
      // 1400 + 210 = 1610
      expect(res.total).toBe(1610);
    });

    it('rechaza descuentos globales mayores al subtotal', () => {
      const items = [{ subtotal: 200 }];
      expect(() => calculateTotals(items, 250)).toThrow(BadRequestException);
    });

    it('maneja con precisión decimales complejos con redondeo fiscal', () => {
      const items = [{ subtotal: 33.33 }, { subtotal: 66.66 }];
      const res = calculateTotals(items, 0, 0.15);

      expect(res.subtotal).toBe(99.99);
      // 99.99 * 0.15 = 14.9985 -> redondeo a 15.00
      expect(res.iva).toBe(15.0);
      // 99.99 + 15.00 = 114.99
      expect(res.total).toBe(114.99);
    });
  });
});
