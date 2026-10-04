import { describe, expect, it } from 'vitest';
import { countDecimals, isoDate, isValidIsoDate, maxLen, money, qty } from './helpers';
import { GLOBAL_LIMITS, LIMITS } from './limits';

describe('limits: constantes copiadas de la tabla del backend', () => {
  it('conserva los valores globales', () => {
    expect(GLOBAL_LIMITS.MONEY_MAX).toBe(999999999.99);
    expect(GLOBAL_LIMITS.UNIT_PRICE_MAX).toBe(99999999.99);
    expect(GLOBAL_LIMITS.QTY_MAX).toBe(100000);
    expect(GLOBAL_LIMITS.STOCK_MAX).toBe(1000000);
    expect(GLOBAL_LIMITS.HOROMETRO_MAX).toBe(1000000);
  });

  it('agrupa los límites por entidad', () => {
    expect(LIMITS.cliente.nombre).toBe(200);
    expect(LIMITS.cliente.rfc).toBe(30);
    expect(LIMITS.cliente.direccion).toBe(300);
    expect(LIMITS.cliente.limiteCredito).toEqual({ min: 0, max: 999999999.99, decimales: 2 });
    expect(LIMITS.equipo.modelo).toBe(200);
    expect(LIMITS.equipo.precioRentaDia.decimales).toBe(4);
    expect(LIMITS.usuario.nombre).toBe(120);
    expect(LIMITS.usuario.password).toEqual({ min: 6, max: 128 });
    expect(LIMITS.usuario.cambioPassword.newPassword.min).toBe(8);
  });
});

describe('money()', () => {
  it('acepta 0, enteros y hasta 2 decimales', () => {
    const schema = money();
    expect(schema.safeParse(0).success).toBe(true);
    expect(schema.safeParse(1500).success).toBe(true);
    expect(schema.safeParse(10.5).success).toBe(true);
    expect(schema.safeParse(10.55).success).toBe(true);
    expect(schema.safeParse(999999999.99).success).toBe(true);
  });

  it('rechaza negativos con mensaje en español', () => {
    const r = money({ label: 'El límite de crédito' }).safeParse(-1);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe('El límite de crédito no puede ser negativo');
  });

  it('rechaza importes por encima del máximo', () => {
    const r = money().safeParse(1000000000);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toContain('no puede ser mayor a');
  });

  it('rechaza 3 decimales', () => {
    const r = money().safeParse(10.123);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe('El importe admite como máximo 2 decimales');
  });

  it('rechaza NaN, Infinity y valores que no son número', () => {
    expect(money().safeParse(Number.NaN).success).toBe(false);
    expect(money().safeParse(Number.POSITIVE_INFINITY).success).toBe(false);
    expect(money().safeParse('10').success).toBe(false);
    expect(money().safeParse(undefined).success).toBe(false);
  });

  it('respeta mínimo, máximo y decimales personalizados', () => {
    const precio = money({ max: GLOBAL_LIMITS.UNIT_PRICE_MAX, decimals: 4, label: 'El precio' });
    expect(precio.safeParse(12.3456).success).toBe(true);
    expect(precio.safeParse(12.34567).success).toBe(false);
    expect(precio.safeParse(100000000).success).toBe(false);

    const gasto = money({ min: 0.01 });
    expect(gasto.safeParse(0).success).toBe(false);
    expect(gasto.safeParse(0.01).success).toBe(true);
  });

  it('permite desactivar el límite de decimales', () => {
    const horometro = money({ max: GLOBAL_LIMITS.HOROMETRO_MAX, decimals: null });
    expect(horometro.safeParse(0.1 * 3).success).toBe(true);
    expect(horometro.safeParse(1000001).success).toBe(false);
  });
});

describe('countDecimals()', () => {
  it('cuenta decimales como el backend', () => {
    expect(countDecimals(10)).toBe(0);
    expect(countDecimals(10.5)).toBe(1);
    expect(countDecimals(-10.25)).toBe(2);
    expect(countDecimals(1e-7)).toBe(7);
    expect(countDecimals(1e21)).toBe(0);
  });
});

describe('qty()', () => {
  it('acepta enteros entre 1 y el tope', () => {
    const schema = qty();
    expect(schema.safeParse(1).success).toBe(true);
    expect(schema.safeParse(100000).success).toBe(true);
  });

  it('rechaza 0, negativos, decimales y valores sobre el tope', () => {
    const schema = qty();
    expect(schema.safeParse(0).success).toBe(false);
    expect(schema.safeParse(-3).success).toBe(false);
    expect(schema.safeParse(2.5).success).toBe(false);
    expect(schema.safeParse(100001).success).toBe(false);
    expect(schema.safeParse(Number.NaN).success).toBe(false);
  });

  it('mensajes en español', () => {
    expect(qty().safeParse(0).error?.issues[0].message).toBe('La cantidad debe ser al menos 1');
    expect(qty().safeParse(1.5).error?.issues[0].message).toBe('La cantidad debe ser un número entero');
    expect(qty({ label: 'Los días', max: 3650 }).safeParse(4000).error?.issues[0].message).toContain('Los días no puede ser mayor a');
  });

  it('permite topes y mínimos personalizados (existencias)', () => {
    const stock = qty({ min: 0, max: GLOBAL_LIMITS.STOCK_MAX });
    expect(stock.safeParse(0).success).toBe(true);
    expect(stock.safeParse(1000000).success).toBe(true);
    expect(stock.safeParse(1000001).success).toBe(false);
  });
});

describe('isoDate()', () => {
  it('acepta fechas reales, incluido 29 de febrero bisiesto', () => {
    const schema = isoDate();
    expect(schema.safeParse('2026-10-04').success).toBe(true);
    expect(schema.safeParse('2028-02-29').success).toBe(true);
    expect(schema.safeParse('2026-12-31').success).toBe(true);
  });

  it('rechaza fechas imposibles', () => {
    const schema = isoDate();
    expect(schema.safeParse('2026-02-30').success).toBe(false);
    expect(schema.safeParse('2027-02-29').success).toBe(false);
    expect(schema.safeParse('2026-04-31').success).toBe(false);
    expect(schema.safeParse('2026-13-01').success).toBe(false);
    expect(schema.safeParse('2026-00-10').success).toBe(false);
    expect(schema.safeParse('2026-01-00').success).toBe(false);
  });

  it('rechaza formatos distintos de AAAA-MM-DD', () => {
    const schema = isoDate('La fecha de inicio');
    const r = schema.safeParse('04/10/2026');
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe('La fecha de inicio debe tener el formato AAAA-MM-DD');
    expect(schema.safeParse('2026-10-04T10:00:00Z').success).toBe(false);
    expect(schema.safeParse('').success).toBe(false);
    expect(schema.safeParse(undefined).success).toBe(false);
  });

  it('isValidIsoDate valida años bajos sin desplazarlos a 1900', () => {
    expect(isValidIsoDate('0099-02-28')).toBe(true);
    expect(isValidIsoDate('0099-02-29')).toBe(false);
  });
});

describe('maxLen()', () => {
  it('genera el mensaje estándar de longitud', () => {
    expect(maxLen('El nombre', 200)).toEqual({ message: 'El nombre no puede superar 200 caracteres' });
  });
});
