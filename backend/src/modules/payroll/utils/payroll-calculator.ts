/**
 * Motor de Cálculo de Nómina (Planilla) de Nicaragua
 * BM Construcciones / ERP Rental System
 * Cumple con spec-modulo-nomina-BM.md, Código del Trabajo (Ley 185) y Ley 822 (LCT)
 */

export interface ParamIrTramoInput {
  orden: number;
  desdeExcl: number;
  hastaIncl: number | null;
  impuestoBase: number;
  porcentaje: number;
  sobreExceso: number;
}

export interface ParamInssInput {
  tasaLaboral: number;
  tasaPatronal: number;
  techoMensual?: number | null;
  baseMinima?: number | null;
}

export interface ParamInatecInput {
  tasa: number;
}

export interface ParamLaboralInput {
  diasVacacionesPorMes?: number;
  factorHoraExtra?: number;
  diasBaseMes?: number;
  aguiDiaLimite?: number;
  jornadaHorasDia?: number;
}

export interface ProvisionMesInput {
  tipoSalario: 'FIJO' | 'VARIABLE' | 'MIXTO';
  salarioMes: number;
  promedioUltimos6M: number;
  maxUltimos6M: number;
  antiguedadAnios: number;
  mesesEnPeriodoAguinaldo: number; // 1 a 12
  saldoProvisionAguiPrevio?: number;
  saldoProvisionIndPrevio?: number;
  diasVacacionesPorMes?: number;
}

export interface LiquidacionFinalInput {
  salarioMensual: number;
  baseVacaciones: number;
  baseAguinaldo: number;
  baseIndemnizacion: number;
  diasPendientes: number;
  diasVacacionesPendientes: number;
  mesesAguinaldo: number;
  antiguedadAnios: number;
  pagaIndemnizacion: number | boolean;
  tasaInssLaboral?: number;
  deduccionPrestamos?: number;
  deduccionOtras?: number;
  irOcasional?: number;
}

/** Carga legal inicial oficial (art. 23 Ley 822) */
export const DEFAULT_PARAM_IR_TRAMOS: ParamIrTramoInput[] = [
  { orden: 1, desdeExcl: 0.0, hastaIncl: 100000.0, impuestoBase: 0.0, porcentaje: 0.0, sobreExceso: 0.0 },
  { orden: 2, desdeExcl: 100000.0, hastaIncl: 200000.0, impuestoBase: 0.0, porcentaje: 15.0, sobreExceso: 100000.0 },
  { orden: 3, desdeExcl: 200000.0, hastaIncl: 350000.0, impuestoBase: 15000.0, porcentaje: 20.0, sobreExceso: 200000.0 },
  { orden: 4, desdeExcl: 350000.0, hastaIncl: 500000.0, impuestoBase: 45000.0, porcentaje: 25.0, sobreExceso: 350000.0 },
  { orden: 5, desdeExcl: 500000.0, hastaIncl: null, impuestoBase: 82500.0, porcentaje: 30.0, sobreExceso: 500000.0 },
];

export const DEFAULT_PARAM_INSS: ParamInssInput = {
  tasaLaboral: 0.07,
  tasaPatronal: 0.215, // Empleador pequeño (< 50 trabajadores)
  techoMensual: null,
};

export const DEFAULT_PARAM_INATEC: ParamInatecInput = {
  tasa: 0.02,
};

export const DEFAULT_PARAM_LABORAL: ParamLaboralInput = {
  diasVacacionesPorMes: 2.5,
  factorHoraExtra: 2.0,
  diasBaseMes: 30,
  aguiDiaLimite: 10,
  jornadaHorasDia: 8,
};

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function round4(num: number): number {
  return Math.round((num + Number.EPSILON) * 10000) / 10000;
}

/**
 * T4: Cálculo de hora extra (100% recargo = factor 2.0)
 */
export function calcularHoraExtra(
  salarioMensual: number,
  horas: number,
  diasBaseMes = 30,
  jornadaHorasDia = 8,
  factorHoraExtra = 2.0,
): number {
  if (horas <= 0 || salarioMensual <= 0) return 0;
  const valorHora = salarioMensual / diasBaseMes / jornadaHorasDia;
  return round2(horas * valorHora * factorHoraExtra);
}

/**
 * Calcula el IR anual aplicando la tarifa progresiva del Art. 23 Ley 822
 */
export function calcularIrAnual(
  rentaNetaAnual: number,
  tramos: ParamIrTramoInput[] = DEFAULT_PARAM_IR_TRAMOS,
): number {
  if (rentaNetaAnual <= 0) return 0;

  const tramosSorted = [...tramos].sort((a, b) => a.orden - b.orden);
  const tramo = tramosSorted.find(
    (t) => rentaNetaAnual > t.desdeExcl && (t.hastaIncl === null || rentaNetaAnual <= t.hastaIncl),
  );

  if (!tramo) {
    if (rentaNetaAnual <= (tramosSorted[0]?.desdeExcl ?? 0)) return 0;
    throw new Error(`No se encontró un tramo de IR vigente para renta neta de ${rentaNetaAnual}`);
  }

  const exceso = Math.max(0, rentaNetaAnual - tramo.sobreExceso);
  const impuesto = tramo.impuestoBase + exceso * (tramo.porcentaje / 100);
  return round2(impuesto);
}

/**
 * T1 & T3: IR método fijo (Art. 19 num. 1 Reglamento LCT)
 */
export function calcularIrMensualFijo(
  salarioBrutoGravable: number,
  inssLaboral: number,
  tramos: ParamIrTramoInput[] = DEFAULT_PARAM_IR_TRAMOS,
): { rentaNetaAnual: number; irAnual: number; irMes: number } {
  const rentaNetaMes = Math.max(0, salarioBrutoGravable - inssLaboral);
  const rentaNetaAnual = round2(rentaNetaMes * 12);
  const irAnual = calcularIrAnual(rentaNetaAnual, tramos);
  const irMes = round2(irAnual / 12);
  return { rentaNetaAnual, irAnual, irMes };
}

/**
 * T5: IR método variable (Art. 19 num. 6 Reglamento LCT)
 * Renta neta acumulada ÷ meses transcurridos × 12 → tarifa → ÷ 12 × meses transcurridos − retenciones previas
 */
export function calcularIrMensualVariable(
  salarioBrutoMes: number,
  inssLaboralMes: number,
  rentaNetaAcumuladaPrevia: number,
  mesesTranscurridos: number,
  irRetenidoPrevio: number,
  tramos: ParamIrTramoInput[] = DEFAULT_PARAM_IR_TRAMOS,
): {
  rentaNetaMes: number;
  rentaNetaAcumulada: number;
  expectativaAnual: number;
  irAnual: number;
  irAcumuladoDebido: number;
  irMes: number;
} {
  const rentaNetaMes = Math.max(0, salarioBrutoMes - inssLaboralMes);
  const rentaNetaAcumulada = round2(rentaNetaAcumuladaPrevia + rentaNetaMes);
  const m = Math.max(1, mesesTranscurridos);
  const expectativaAnual = round2((rentaNetaAcumulada / m) * 12);
  const irAnual = calcularIrAnual(expectativaAnual, tramos);
  const irAcumuladoDebido = round2((irAnual / 12) * m);
  let irMes = round2(irAcumuladoDebido - irRetenidoPrevio);
  if (irMes < 0) irMes = 0;

  return {
    rentaNetaMes,
    rentaNetaAcumulada,
    expectativaAnual,
    irAnual,
    irAcumuladoDebido,
    irMes,
  };
}

/**
 * T2 & T6: Prorrateo o distribución de IR en quincenas
 * Por defecto modo proporcional en Q1 y ajuste exacto en Q2
 */
export function calcularIrQuincenal(
  irMes: number,
  gravableQ1: number,
  gravableTotalMes: number,
): { irQ1: number; irQ2: number } {
  if (irMes <= 0 || gravableTotalMes <= 0) {
    return { irQ1: 0, irQ2: Math.max(0, irMes) };
  }
  const factorQ1 = gravableQ1 / gravableTotalMes;
  const irQ1 = round2(irMes * factorQ1);
  const irQ2 = round2(irMes - irQ1);
  return { irQ1, irQ2 };
}

/**
 * Cálculo de INSS laboral (7.00%)
 */
export function calcularInssLaboral(
  baseGravable: number,
  tasaLaboral = 0.07,
  techoMensual: number | null = null,
): number {
  if (baseGravable <= 0) return 0;
  const base = techoMensual ? Math.min(baseGravable, techoMensual) : baseGravable;
  return round2(base * tasaLaboral);
}

/**
 * T9: Cálculo de aportes patronales (INSS patronal 21.5% e INATEC 2%)
 */
export function calcularAportesPatronales(
  baseGravable: number,
  tasaPatronal = 0.215,
  tasaInatec = 0.02,
): { inssPatronal: number; inatec: number; totalPatronal: number } {
  if (baseGravable <= 0) {
    return { inssPatronal: 0, inatec: 0, totalPatronal: 0 };
  }
  const inssPatronal = round2(baseGravable * tasaPatronal);
  const inatec = round2(baseGravable * tasaInatec);
  const totalPatronal = round2(inssPatronal + inatec);
  return { inssPatronal, inatec, totalPatronal };
}

/**
 * T10, T11, T12, T13: Provisiones mensuales con true-up
 */
export function calcularProvisionesMes(params: ProvisionMesInput): {
  vacaciones: { base: number; provisionMes: number };
  aguinaldo: { base: number; requeridoAcumulado: number; provisionMes: number };
  indemnizacion: { base: number; antiguedadAnios: number; mesesDerecho: number; requeridoAcumulado: number; provisionMes: number };
  totalProvisionMes: number;
} {
  const {
    tipoSalario,
    salarioMes,
    promedioUltimos6M,
    maxUltimos6M,
    antiguedadAnios,
    mesesEnPeriodoAguinaldo,
    saldoProvisionAguiPrevio = 0,
    saldoProvisionIndPrevio = 0,
    diasVacacionesPorMes = 2.5,
  } = params;

  // 1. Vacaciones (Art. 76 & 78)
  const baseVac = tipoSalario === 'FIJO' ? salarioMes : promedioUltimos6M;
  const provisionMesVac = round2((baseVac / 30) * diasVacacionesPorMes);

  // 2. Décimo tercer mes / Aguinaldo (Art. 93 & 94)
  const baseAgui = tipoSalario === 'FIJO' ? salarioMes : maxUltimos6M;
  const mesesAguiClamped = Math.min(12, Math.max(0, mesesEnPeriodoAguinaldo));
  const requeridoAcumuladoAgui = round2((baseAgui * mesesAguiClamped) / 12);
  const provisionMesAgui = round2(requeridoAcumuladoAgui - saldoProvisionAguiPrevio);

  // 3. Indemnización por antigüedad (Art. 45)
  // Primeros 3 años: 1 mes por año. A partir del 4to año: 20 días por año (20/30 mes por año). Tope: 5 meses.
  const baseInd = tipoSalario === 'FIJO' ? salarioMes : promedioUltimos6M;
  const anios = Math.max(0, antiguedadAnios);
  const mesesDerecho = Math.min(5, Math.min(anios, 3) * 1 + Math.max(anios - 3, 0) * (20 / 30));
  const requeridoAcumuladoInd = round2(baseInd * mesesDerecho);
  const provisionMesInd = round2(requeridoAcumuladoInd - saldoProvisionIndPrevio);

  const totalProvisionMes = round2(provisionMesVac + provisionMesAgui + provisionMesInd);

  return {
    vacaciones: { base: baseVac, provisionMes: provisionMesVac },
    aguinaldo: { base: baseAgui, requeridoAcumulado: requeridoAcumuladoAgui, provisionMes: provisionMesAgui },
    indemnizacion: {
      base: baseInd,
      antiguedadAnios: round4(anios),
      mesesDerecho: round4(mesesDerecho),
      requeridoAcumulado: requeridoAcumuladoInd,
      provisionMes: provisionMesInd,
    },
    totalProvisionMes,
  };
}

/**
 * T14, T15, T16: Liquidación final al terminar la relación laboral
 */
export function calcularLiquidacionFinal(params: LiquidacionFinalInput): {
  salarioPendiente: number;
  montoVacaciones: number;
  montoAguinaldo: number;
  montoIndemnizacion: number;
  mesesDerechoIndemnizacion: number;
  totalDevengado: number;
  deduccionInss: number;
  deduccionIr: number;
  deduccionPrestamos: number;
  deduccionOtras: number;
  totalDeducciones: number;
  netoPagar: number;
} {
  const {
    salarioMensual,
    baseVacaciones,
    baseAguinaldo,
    baseIndemnizacion,
    diasPendientes,
    diasVacacionesPendientes,
    mesesAguinaldo,
    antiguedadAnios,
    pagaIndemnizacion,
    tasaInssLaboral = 0.07,
    deduccionPrestamos = 0,
    deduccionOtras = 0,
    irOcasional = 0,
  } = params;

  // 1. Salario pendiente
  const salarioPendiente = round2((salarioMensual / 30) * Math.max(0, diasPendientes));

  // 2. Vacaciones proporcionales / pendientes
  const montoVacaciones = round2(Math.max(0, diasVacacionesPendientes) * (baseVacaciones / 30));

  // 3. Aguinaldo proporcional (exento de INSS e IR, Art. 97)
  const montoAguinaldo = round2(baseAguinaldo * (Math.max(0, mesesAguinaldo) / 12));

  // 4. Indemnización por antigüedad (Art. 45)
  let mesesDerechoIndemnizacion = 0;
  let montoIndemnizacion = 0;

  const aplicaIndem = Boolean(pagaIndemnizacion);
  if (aplicaIndem && antiguedadAnios > 0) {
    const anios = antiguedadAnios;
    mesesDerechoIndemnizacion = Math.min(5, Math.min(anios, 3) * 1 + Math.max(anios - 3, 0) * (20 / 30));
    montoIndemnizacion = round2(baseIndemnizacion * mesesDerechoIndemnizacion);
  }

  // 5. Deducciones: INSS cotiza sobre salario ordinario y vacaciones remuneradas
  const baseCotizableInss = round2(salarioPendiente + montoVacaciones);
  const deduccionInss = round2(baseCotizableInss * tasaInssLaboral);

  const totalDevengado = round2(salarioPendiente + montoVacaciones + montoAguinaldo + montoIndemnizacion);
  const totalDeducciones = round2(deduccionInss + irOcasional + deduccionPrestamos + deduccionOtras);
  const netoPagar = round2(totalDevengado - totalDeducciones);

  return {
    salarioPendiente,
    montoVacaciones,
    montoAguinaldo,
    montoIndemnizacion,
    mesesDerechoIndemnizacion: round4(mesesDerechoIndemnizacion),
    totalDevengado,
    deduccionInss,
    deduccionIr: irOcasional,
    deduccionPrestamos,
    deduccionOtras,
    totalDeducciones,
    netoPagar,
  };
}
