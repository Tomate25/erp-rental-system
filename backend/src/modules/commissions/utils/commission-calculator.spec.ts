import {
  calcularComision,
  validateTramos,
  TramoConfig,
  roundHalfUp2,
} from './commission-calculator';

describe('Commission Calculator Engine (spec-modulo-comisiones-BM.md)', () => {
  // Plan David:
  // 1: 0 a 800,000 -> 3%
  // 2: 800,000 a 1,200,000 -> 2%
  // 3: 1,200,000 a null -> 1%
  const tramosDavid: TramoConfig[] = [
    { orden: 1, desdeExcl: 0, hastaIncl: 800000, porcentaje: 3 },
    { orden: 2, desdeExcl: 800000, hastaIncl: 1200000, porcentaje: 2 },
    { orden: 3, desdeExcl: 1200000, hastaIncl: null, porcentaje: 1 },
  ];

  // Plan Nylska:
  // 1: 0 a 300,000 -> 2%
  // 2: 300,000 a null -> 1%
  const tramosNylska: TramoConfig[] = [
    { orden: 1, desdeExcl: 0, hastaIncl: 300000, porcentaje: 2 },
    { orden: 2, desdeExcl: 300000, hastaIncl: null, porcentaje: 1 },
  ];

  describe('T1: Escalonado dentro del tramo 1', () => {
    it('David con base 500,000 devuelve 15,000.00', () => {
      const res = calcularComision(500000, tramosDavid, 'ESCALONADO');
      expect(res.comisionCalculada).toBe(15000);
      expect(res.tramos).toHaveLength(1);
      expect(res.tramos[0].montoEnTramo).toBe(500000);
      expect(res.tramos[0].comisionTramo).toBe(15000);
    });
  });

  describe('T2: Límite exacto de tramo 1', () => {
    it('David con base 800,000 devuelve 24,000.00 en ambos métodos', () => {
      const resEsc = calcularComision(800000, tramosDavid, 'ESCALONADO');
      expect(resEsc.comisionCalculada).toBe(24000);

      const resUni = calcularComision(800000, tramosDavid, 'TRAMO_UNICO');
      expect(resUni.comisionCalculada).toBe(24000);
    });
  });

  describe('T3: Salto del tramo único (Cliff effect)', () => {
    it('David con base 801,000: único paga 16,020.00 y escalonado paga 24,020.00', () => {
      const resUni = calcularComision(801000, tramosDavid, 'TRAMO_UNICO');
      expect(resUni.comisionCalculada).toBe(16020);

      const resEsc = calcularComision(801000, tramosDavid, 'ESCALONADO');
      expect(resEsc.comisionCalculada).toBe(24020);
      expect(resEsc.tramos).toHaveLength(2);
      expect(resEsc.tramos[0].montoEnTramo).toBe(800000);
      expect(resEsc.tramos[0].comisionTramo).toBe(24000);
      expect(resEsc.tramos[1].montoEnTramo).toBe(1000);
      expect(resEsc.tramos[1].comisionTramo).toBe(20);
    });
  });

  describe('T4: Tres tramos completos', () => {
    it('David con base 1,500,000: único paga 15,000.00 y escalonado paga 35,000.00', () => {
      const resUni = calcularComision(1500000, tramosDavid, 'TRAMO_UNICO');
      expect(resUni.comisionCalculada).toBe(15000);

      const resEsc = calcularComision(1500000, tramosDavid, 'ESCALONADO');
      // 800k x 3% = 24k; 400k x 2% = 8k; 300k x 1% = 3k => total 35k
      expect(resEsc.comisionCalculada).toBe(35000);
      expect(resEsc.tramos).toHaveLength(3);
      expect(resEsc.tramos[0].comisionTramo).toBe(24000);
      expect(resEsc.tramos[1].comisionTramo).toBe(8000);
      expect(resEsc.tramos[2].comisionTramo).toBe(3000);
    });
  });

  describe('T5: Centavos en el límite', () => {
    it('David con base 800,000.50: escalonado 24,000.01 y único 16,000.01', () => {
      const resEsc = calcularComision(800000.5, tramosDavid, 'ESCALONADO');
      // 800,000 x 3% = 24,000; 0.50 x 2% = 0.01 => total 24,000.01
      expect(resEsc.comisionCalculada).toBe(24000.01);

      const resUni = calcularComision(800000.5, tramosDavid, 'TRAMO_UNICO');
      // 800,000.50 x 2% = 16,000.01
      expect(resUni.comisionCalculada).toBe(16000.01);
    });
  });

  describe('T6: Escenarios de Nylska', () => {
    it('Nylska con base 301,000: único 3,010.00 y escalonado 6,010.00', () => {
      const resUni = calcularComision(301000, tramosNylska, 'TRAMO_UNICO');
      expect(resUni.comisionCalculada).toBe(3010);

      const resEsc = calcularComision(301000, tramosNylska, 'ESCALONADO');
      // 300k x 2% = 6k; 1k x 1% = 10 => total 6,010.00
      expect(resEsc.comisionCalculada).toBe(6010);
    });

    it('Nylska con base 450,000: único 4,500.00 y escalonado 7,500.00', () => {
      const resUni = calcularComision(450000, tramosNylska, 'TRAMO_UNICO');
      expect(resUni.comisionCalculada).toBe(4500);

      const resEsc = calcularComision(450000, tramosNylska, 'ESCALONADO');
      // 300k x 2% = 6k; 150k x 1% = 1,500 => total 7,500.00
      expect(resEsc.comisionCalculada).toBe(7500);
    });
  });

  describe('Casos límite y bases no positivas', () => {
    it('base 0 devuelve comisión 0 sin tramos', () => {
      const res = calcularComision(0, tramosDavid, 'ESCALONADO');
      expect(res.comisionCalculada).toBe(0);
      expect(res.tramos).toEqual([]);
    });

    it('base negativa devuelve comisión 0', () => {
      const res = calcularComision(-5000, tramosDavid, 'ESCALONADO');
      expect(res.comisionCalculada).toBe(0);
      expect(res.tramos).toEqual([]);
    });
  });

  describe('Validación de tramos (V1 a V4 y T23)', () => {
    it('rechaza lista vacía de tramos (V1)', () => {
      expect(() => validateTramos([])).toThrow(
        /El plan debe tener al menos un tramo configurado/i,
      );
    });

    it('rechaza si el primer tramo no empieza en 0 (V1)', () => {
      const invalid: TramoConfig[] = [
        { orden: 1, desdeExcl: 100, hastaIncl: null, porcentaje: 5 },
      ];
      expect(() => validateTramos(invalid)).toThrow(
        /El primer tramo debe iniciar en 0\.00/i,
      );
    });

    it('rechaza hueco entre tramos (T23 / V2)', () => {
      const invalid: TramoConfig[] = [
        { orden: 1, desdeExcl: 0, hastaIncl: 800000, porcentaje: 3 },
        { orden: 2, desdeExcl: 801000, hastaIncl: null, porcentaje: 2 }, // Hueco de 1,000
      ];
      expect(() => validateTramos(invalid)).toThrow(
        /Existe un hueco o traslape entre el tramo 1.*y el tramo 2/i,
      );
    });

    it('rechaza si el último tramo no es abierto (V3)', () => {
      const invalid: TramoConfig[] = [
        { orden: 1, desdeExcl: 0, hastaIncl: 500000, porcentaje: 3 },
      ];
      expect(() => validateTramos(invalid)).toThrow(
        /El último tramo.*debe ser abierto/i,
      );
    });

    it('rechaza porcentaje fuera de rango (V4)', () => {
      const invalid: TramoConfig[] = [
        { orden: 1, desdeExcl: 0, hastaIncl: null, porcentaje: 150 },
      ];
      expect(() => validateTramos(invalid)).toThrow(
        /El porcentaje del tramo 1 debe estar entre 0% y 100%/i,
      );
    });
  });
});
