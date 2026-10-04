import { BadRequestException } from '@nestjs/common';
import { TipoCobro } from '@prisma/client';
import {
  roundMoney,
  assertNonNegative,
  assertPositive,
  assertPositiveHoras,
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

    it('redondea horas a 2 decimales (half-up) ANTES de calcular el dinero', () => {
      // 6.505 h x 100 = 650.5 sin redondear; con horas 6.51 (lo que guarda Decimal(10,2)) = 651
      const res = calculateItemAmount({
        cantidad: 1,
        horas: 6.505,
        tipoCobro: TipoCobro.POR_HORA,
        precioUnitario: 100,
      });
      expect(res.horas).toBe(6.51);
      expect(res.subtotal).toBe(651);
    });

    it('redondea dias a 2 decimales antes de calcular y devuelve el valor redondeado', () => {
      const res = calculateItemAmount({
        cantidad: 3,
        dias: 1.005,
        precioUnitario: 200,
      });
      expect(res.dias).toBe(1.01);
      expect(res.subtotal).toBe(606); // 3 x 1.01 x 200
    });

    it('absorbe el ruido binario (21.900000000000002 -> 21.9) sin cambiar la tolerancia de 1e-6', () => {
      const res = calculateItemAmount({
        cantidad: 1,
        horas: 21.900000000000002,
        tipoCobro: TipoCobro.POR_HORA,
        precioUnitario: 10,
      });
      expect(res.horas).toBe(21.9);
      expect(res.subtotal).toBe(219);
    });

    it('rechaza horas o dias que redondean a 0 (menores que 0,005)', () => {
      expect(() =>
        calculateItemAmount({ cantidad: 1, horas: 0.004, tipoCobro: TipoCobro.POR_HORA, precioUnitario: 100 }),
      ).toThrow(BadRequestException);
      expect(() =>
        calculateItemAmount({ cantidad: 1, dias: 0.004, precioUnitario: 100 }),
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

  describe('assertPositiveHoras', () => {
    it('redondea a 2 decimales y conserva los mensajes de assertPositive', () => {
      expect(assertPositiveHoras(6.505, 'horas')).toBe(6.51);
      expect(assertPositiveHoras(8, 'horas')).toBe(8);
      expect(() => assertPositiveHoras(0, 'horas')).toThrow(
        "El campo 'horas' debe ser estrictamente mayor a 0.",
      );
      expect(() => assertPositiveHoras(NaN, 'horas')).toThrow(BadRequestException);
      expect(() => assertPositiveHoras('8', 'horas')).toThrow(BadRequestException);
      expect(() => assertPositiveHoras(0.004, 'horas')).toThrow(
        "El campo 'horas' debe ser estrictamente mayor a 0.",
      );
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
