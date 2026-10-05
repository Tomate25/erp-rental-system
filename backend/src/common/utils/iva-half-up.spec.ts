import { calculateTotals, roundMoney } from './financial-calculator';

/**
 * IVA 15% con redondeo half-up exacto. La referencia se calcula con ENTEROS
 * (centavos), sin coma flotante ni Decimal, para no repetir la implementacion.
 *   iva_centavos = floor((base_centavos * 15 + 50) / 100)
 */
const ivaExactoCentavos = (baseCentavos: number) => Math.floor((baseCentavos * 15 + 50) / 100);
// Implementacion anterior (flotante), solo para documentar el defecto.
const ivaFlotante = (base: number) => roundMoney(base * 0.15);

describe('calculateTotals: IVA half-up exacto', () => {
  it('base 13.70 -> IVA 2.06 y total 15.76 (antes 2.05 / 15.75)', () => {
    const t = calculateTotals([{ subtotal: 13.7 }], 0);
    expect(t.iva).toBe(2.06);
    expect(t.total).toBe(15.76);
    expect(ivaFlotante(13.7)).toBe(2.05); // el defecto que se corrige
  });

  it('recorre todas las bases 0.01..1000.00 contra el calculo exacto en centavos', () => {
    const malos: number[] = [];
    for (let c = 1; c <= 100_000; c++) {
      const base = c / 100;
      const t = calculateTotals([{ subtotal: base }], 0);
      const ivaC = ivaExactoCentavos(c);
      if (Math.round(t.iva * 100) !== ivaC || Math.round(t.total * 100) !== c + ivaC) malos.push(base);
    }
    expect(malos).toEqual([]);
  });

  it('con descuento global: la base imponible tambien es exacta', () => {
    for (let c = 1; c <= 20_000; c++) {
      const subtotal = (c + 500) / 100;
      const descuento = 5; // C$ 5.00
      const t = calculateTotals([{ subtotal }], descuento);
      const baseC = Math.round(subtotal * 100) - 500;
      expect(Math.round(t.iva * 100)).toBe(ivaExactoCentavos(baseC));
      expect(Math.round(t.total * 100)).toBe(baseC + ivaExactoCentavos(baseC));
    }
  });

  it('la correccion solo SUBE el IVA un centavo respecto al flotante, nunca lo baja', () => {
    let difieren = 0;
    for (let c = 1; c <= 100_000; c++) {
      const base = c / 100;
      const nuevo = Math.round(calculateTotals([{ subtotal: base }], 0).iva * 100);
      const viejo = Math.round(ivaFlotante(base) * 100);
      expect([0, 1]).toContain(nuevo - viejo);
      if (nuevo !== viejo) difieren++;
    }
    // Documentado en pendiente_aprobacion/IVA-REDONDEO.md
    expect(difieren).toBeGreaterThan(0);
    console.info(`bases 0.01..1000.00 cuyo IVA cambia 1 centavo: ${difieren} de 100000`);
  });

  it('tasa distinta y cero siguen funcionando', () => {
    expect(calculateTotals([{ subtotal: 100 }], 0, 0).iva).toBe(0);
    expect(calculateTotals([{ subtotal: 100 }], 0, 0.1).iva).toBe(10);
    expect(calculateTotals([{ subtotal: 100 }], 0, 0).total).toBe(100);
  });

  it('mantiene los topes: total sobre Decimal(12,2) sigue dando 400', () => {
    expect(() => calculateTotals([{ subtotal: 9_000_000_000 }], 0)).toThrow(/excede el maximo permitido/);
  });
});
