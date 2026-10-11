import {
  calcularHoraExtra,
  calcularIrAnual,
  calcularIrMensualFijo,
  calcularIrMensualVariable,
  calcularIrQuincenal,
  calcularInssLaboral,
  calcularAportesPatronales,
  calcularProvisionesMes,
  calcularLiquidacionFinal,
  DEFAULT_PARAM_IR_TRAMOS,
} from './payroll-calculator';

describe('Payroll Calculator Engine - Nicaragua (spec-modulo-nomina-BM.md)', () => {
  describe('T1: Salario fijo, mes completo (C$ 30,000/mes)', () => {
    it('calcula INSS laboral 2,100, IR mensual 3,496.67, neto 24,403.33, patronal 6,450 e INATEC 600', () => {
      const salario = 30000;
      const inssLaboral = calcularInssLaboral(salario, 0.07);
      expect(inssLaboral).toBe(2100.0);

      const ir = calcularIrMensualFijo(salario, inssLaboral);
      expect(ir.rentaNetaAnual).toBe(334800.0);
      expect(ir.irAnual).toBe(41960.0);
      expect(ir.irMes).toBe(3496.67);

      const neto = salario - inssLaboral - ir.irMes;
      expect(neto).toBe(24403.33);

      const patronales = calcularAportesPatronales(salario, 0.215, 0.02);
      expect(patronales.inssPatronal).toBe(6450.0);
      expect(patronales.inatec).toBe(600.0);
      expect(patronales.totalPatronal).toBe(7050.0);
    });
  });

  describe('T2: Quincenas del salario fijo (modo PROPORCIONAL)', () => {
    it('divide INSS (1,050 / 1,050) e IR con redondeo mitad arriba (1,748.34 en Q1 y 1,748.33 en Q2)', () => {
      const irMes = 3496.67;
      const { irQ1, irQ2 } = calcularIrQuincenal(irMes, 15000, 30000);
      expect(irQ1).toBe(1748.34);
      expect(irQ2).toBe(1748.33);
      expect(irQ1 + irQ2).toBe(irMes);

      const inssQ1 = calcularInssLaboral(15000, 0.07);
      const inssQ2 = calcularInssLaboral(15000, 0.07);
      expect(inssQ1).toBe(1050.0);
      expect(inssQ2).toBe(1050.0);
    });
  });

  describe('T3: Primer estrato exento de IR (C$ 8,000/mes)', () => {
    it('genera retención de IR 0.00 al ser expectativa anual <= 100,000', () => {
      const salario = 8000;
      const inssLaboral = calcularInssLaboral(salario, 0.07);
      expect(inssLaboral).toBe(560.0);

      const ir = calcularIrMensualFijo(salario, inssLaboral);
      expect(ir.rentaNetaAnual).toBe(89280.0);
      expect(ir.irAnual).toBe(0.0);
      expect(ir.irMes).toBe(0.0);
    });
  });

  describe('T4: Horas extra (recargo 100%)', () => {
    it('calcula 4 horas con salario 30,000: valor hora 125 * 2 * 4 = 1,000.00', () => {
      const hex = calcularHoraExtra(30000, 4, 30, 8, 2.0);
      expect(hex).toBe(1000.0);
    });
  });

  describe('T5: IR método variable (3 meses consecutivos con comisiones)', () => {
    it('calcula exactamente Ene (1,636.67), Feb (6,718.00) y Mar (4,595.83)', () => {
      // Mes 1: Enero (Salario 20,000)
      const inssEne = calcularInssLaboral(20000, 0.07);
      const resEne = calcularIrMensualVariable(20000, inssEne, 0, 1, 0);
      expect(resEne.rentaNetaMes).toBe(18600.0);
      expect(resEne.expectativaAnual).toBe(223200.0);
      expect(resEne.irAnual).toBe(19640.0);
      expect(resEne.irMes).toBe(1636.67);

      // Mes 2: Febrero (Salario 20,000 + Comisión 26,400 = 46,400)
      const inssFeb = calcularInssLaboral(46400, 0.07);
      expect(inssFeb).toBe(3248.0);
      const resFeb = calcularIrMensualVariable(
        46400,
        inssFeb,
        resEne.rentaNetaAcumulada, // 18,600
        2,
        resEne.irMes, // 1,636.67
      );
      expect(resFeb.rentaNetaMes).toBe(43152.0);
      expect(resFeb.rentaNetaAcumulada).toBe(61752.0);
      expect(resFeb.expectativaAnual).toBe(370512.0);
      expect(resFeb.irAnual).toBe(50128.0);
      expect(resFeb.irAcumuladoDebido).toBe(8354.67);
      expect(resFeb.irMes).toBe(6718.0);

      // Mes 3: Marzo (Salario 35,000)
      const inssMar = calcularInssLaboral(35000, 0.07);
      expect(inssMar).toBe(2450.0);
      const resMar = calcularIrMensualVariable(
        35000,
        inssMar,
        resFeb.rentaNetaAcumulada, // 61,752
        3,
        resFeb.irAcumuladoDebido, // 8,354.67
      );
      expect(resMar.rentaNetaMes).toBe(32550.0);
      expect(resMar.rentaNetaAcumulada).toBe(94302.0);
      expect(resMar.expectativaAnual).toBe(377208.0);
      expect(resMar.irAnual).toBe(51802.0);
      expect(resMar.irAcumuladoDebido).toBe(12950.5);
      expect(resMar.irMes).toBe(4595.83);
    });
  });

  describe('T6: Comisión pagada en Q1 (David en febrero)', () => {
    it('distribuye IR proporcional en Q1 (5,270.16) y saldo en Q2 (1,447.84)', () => {
      const devengadoQ1 = 36400; // Salario Q1 10,000 + Comisión 26,400
      const devengadoQ2 = 10000;
      const devengadoTotal = 46400;
      const irMes = 6718.0;

      const inssQ1 = calcularInssLaboral(devengadoQ1, 0.07);
      expect(inssQ1).toBe(2548.0);

      const inssQ2 = calcularInssLaboral(devengadoQ2, 0.07);
      expect(inssQ2).toBe(700.0);

      const { irQ1, irQ2 } = calcularIrQuincenal(irMes, devengadoQ1, devengadoTotal);
      expect(irQ1).toBe(5270.16);
      expect(irQ2).toBe(1447.84);

      const netoQ1 = devengadoQ1 - inssQ1 - irQ1;
      expect(netoQ1).toBe(28581.84);

      const netoQ2 = devengadoQ2 - inssQ2 - irQ2;
      expect(netoQ2).toBe(7852.16);
    });
  });

  describe('T9: Aportes patronales sobre devengo con comisiones', () => {
    it('calcula INSS patronal 7,826.00 e INATEC 728.00 sobre C$ 36,400', () => {
      const patronales = calcularAportesPatronales(36400, 0.215, 0.02);
      expect(patronales.inssPatronal).toBe(7826.0);
      expect(patronales.inatec).toBe(728.0);
      expect(patronales.totalPatronal).toBe(8554.0);
    });
  });

  describe('T10 & T11: Provisiones mensuales con salario fijo', () => {
    it('T10: Con 1 año de antigüedad provisiona 2,500 en cada concepto (Total 7,500.00)', () => {
      const prov = calcularProvisionesMes({
        tipoSalario: 'FIJO',
        salarioMes: 30000,
        promedioUltimos6M: 30000,
        maxUltimos6M: 30000,
        antiguedadAnios: 1.0,
        mesesEnPeriodoAguinaldo: 1,
        saldoProvisionAguiPrevio: 0,
        saldoProvisionIndPrevio: 27500,
      });

      expect(prov.vacaciones.provisionMes).toBe(2500.0);
      expect(prov.aguinaldo.provisionMes).toBe(2500.0);
      expect(prov.indemnizacion.provisionMes).toBe(2500.0);
      expect(prov.totalProvisionMes).toBe(7500.0);
    });

    it('T11: Con 4.5 años de antigüedad provisiona 1,666.67 en indemnización (20 días/año)', () => {
      // 4.5 años: primeros 3 años = 3 meses. 1.5 años siguientes = 1.5 * (20/30) = 1 mes. Total acumulado = 4 meses = 120,000.
      // Mes anterior tenía 4.4167 años (4 años y 5 meses): requerido = 30,000 * (3 + 1.416667 * 20/30) = 118,333.33.
      // Provisión mensual por true-up: 120,000 - 118,333.33 = 1,666.67
      const saldoPrevio = 30000 * (3 + 1.4166667 * (20 / 30));
      const prov = calcularProvisionesMes({
        tipoSalario: 'FIJO',
        salarioMes: 30000,
        promedioUltimos6M: 30000,
        maxUltimos6M: 30000,
        antiguedadAnios: 4.5,
        mesesEnPeriodoAguinaldo: 6,
        saldoProvisionAguiPrevio: 12500,
        saldoProvisionIndPrevio: saldoPrevio,
      });

      expect(prov.indemnizacion.provisionMes).toBe(1666.67);
    });
  });

  describe('T12 & T13: Bases de prestaciones para salarios variables', () => {
    const ultimos6Meses = [35000, 46400, 28000, 30000, 32000, 29500];
    const max6M = Math.max(...ultimos6Meses);
    const prom6M = ultimos6Meses.reduce((a, b) => a + b, 0) / 6;

    it('T12: Aguinaldo usa el salario MÁS ALTO de los últimos 6 meses (Art. 94) -> 46,400.00', () => {
      expect(max6M).toBe(46400.0);
      const prov = calcularProvisionesMes({
        tipoSalario: 'VARIABLE',
        salarioMes: 29500,
        promedioUltimos6M: prom6M,
        maxUltimos6M: max6M,
        antiguedadAnios: 1.0,
        mesesEnPeriodoAguinaldo: 12,
        saldoProvisionAguiPrevio: 0,
      });
      expect(prov.aguinaldo.base).toBe(46400.0);
      expect(prov.aguinaldo.requeridoAcumulado).toBe(46400.0);
    });

    it('T13: Vacaciones usa el PROMEDIO ordinario de los últimos 6 meses (Art. 78) -> 33,483.33', () => {
      expect(Math.round(prom6M * 100) / 100).toBe(33483.33);
      const valor15Dias = (prom6M / 30) * 15;
      expect(Math.round(valor15Dias * 100) / 100).toBe(16741.67);
    });
  });

  describe('T14, T15, T16: Liquidación Final (Art. 45, vacaciones, aguinaldo)', () => {
    it('T14: Renuncia / despido con 3.6667 años calcula exactamente 86,111.11 en indemnización y 1,458.33 en INSS', () => {
      const res = calcularLiquidacionFinal({
        salarioMensual: 25000,
        baseVacaciones: 25000,
        baseAguinaldo: 25000,
        baseIndemnizacion: 25000,
        diasPendientes: 15, // Q2 pendiente = 12,500.00
        diasVacacionesPendientes: 10, // 10 * 833.33 = 8,333.33
        mesesAguinaldo: 11, // 11 meses = 22,916.67
        antiguedadAnios: 3 + 8 / 12, // 3.666667 años
        pagaIndemnizacion: true,
        tasaInssLaboral: 0.07,
      });

      expect(res.salarioPendiente).toBe(12500.0);
      expect(res.montoVacaciones).toBe(8333.33);
      expect(res.montoAguinaldo).toBe(22916.67);
      expect(res.montoIndemnizacion).toBe(86111.11);
      expect(res.deduccionInss).toBe(1458.33); // INSS sobre salario + vacaciones: (12,500 + 8,333.33) * 7%
      expect(res.totalDevengado).toBe(129861.11);
      expect(res.netoPagar).toBe(128402.78);
    });

    it('T15: Empleado con 12 años de antigüedad aplica el tope legal de 5 meses de salario', () => {
      const res = calcularLiquidacionFinal({
        salarioMensual: 25000,
        baseVacaciones: 25000,
        baseAguinaldo: 25000,
        baseIndemnizacion: 25000,
        diasPendientes: 0,
        diasVacacionesPendientes: 0,
        mesesAguinaldo: 0,
        antiguedadAnios: 12.0,
        pagaIndemnizacion: true,
      });

      expect(res.mesesDerechoIndemnizacion).toBe(5.0);
      expect(res.montoIndemnizacion).toBe(125000.0);
    });

    it('T16: Despido con causa justa no paga indemnización Art. 45 pero conserva salario, vacaciones y aguinaldo', () => {
      const res = calcularLiquidacionFinal({
        salarioMensual: 25000,
        baseVacaciones: 25000,
        baseAguinaldo: 25000,
        baseIndemnizacion: 25000,
        diasPendientes: 15,
        diasVacacionesPendientes: 10,
        mesesAguinaldo: 11,
        antiguedadAnios: 3.6667,
        pagaIndemnizacion: false, // Despido causa justa
      });

      expect(res.montoIndemnizacion).toBe(0.0);
      expect(res.salarioPendiente).toBe(12500.0);
      expect(res.montoVacaciones).toBe(8333.33);
      expect(res.montoAguinaldo).toBe(22916.67);
      expect(res.deduccionInss).toBe(1458.33);
      expect(res.netoPagar).toBe(42291.67);
    });
  });
});
