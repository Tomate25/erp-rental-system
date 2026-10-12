import api from '../../../shared/services/api';

export interface Empleado {
  id: string;
  codigo: string;
  nombres: string;
  apellidos: string;
  cedula: string;
  numeroInss: string;
  cargo: string;
  areaContable: 'OPERACION' | 'ADMINISTRACION' | 'VENTAS';
  tipoSalario: 'FIJO' | 'VARIABLE' | 'MIXTO';
  metodoIr: 'FIJO' | 'VARIABLE';
  salarioMensual: number;
  estado: string;
  sucursal?: { id: string; nombre: string };
  fechaIngreso: string;
}

export interface PeriodoNomina {
  id: string;
  anio: number;
  mes: number;
  quincena?: number;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  fechaPago: string;
  estado: string;
  planillas?: PlanillaResumen[];
}

export interface PlanillaResumen {
  id: string;
  periodoId: string;
  periodo?: PeriodoNomina;
  estado: 'BORRADOR' | 'CALCULADA' | 'REVISADA' | 'APROBADA' | 'PAGADA' | 'ANULADA';
  bloqueada?: boolean;
  totalDevengado: number;
  totalDeducciones: number;
  totalNeto: number;
  totalPatronal: number;
  totalInssPatronal?: number;
  totalInatec?: number;
  asientoDevengoId?: string | null;
  asientoDevengoJson?: any;
  asientoPagoId?: string | null;
  asientoPagoJson?: any;
  creadoPor?: string | null;
  calculadoEn?: string;
  revisadoPor?: string;
  aprobadoPor?: string;
  pagadoEn?: string;
  empleados?: PlanillaEmpleadoItem[];
}

export interface PlanillaEmpleadoItem {
  id: string;
  empleadoId: string;
  salarioMensual: number;
  totalDevengado: number;
  totalDeducciones: number;
  netoPagar: number;
  costoPatronal: number;
  areaContable: string;
  empleado: Empleado;
  lineas: PlanillaLineaItem[];
}

export interface PlanillaLineaItem {
  id: string;
  monto: number;
  cantidad?: number;
  concepto: {
    codigo: string;
    nombre: string;
    tipo: 'DEVENGO' | 'DEDUCCION' | 'APORTE' | 'PROVISION';
  };
}

export interface ColillaData {
  id: string;
  empresa?: {
    nombre: string;
    rfc?: string;
    direccion?: string;
    telefono?: string;
    email?: string;
  };
  empleado: {
    codigo: string;
    nombreCompleto: string;
    nombres?: string;
    apellidos?: string;
    cedula: string;
    numeroInss: string;
    cargo: string;
    sucursal: string;
    areaContable: string;
    fechaIngreso?: string;
    formaPago?: string;
    banco?: string | null;
    numeroCuenta?: string | null;
    diasTrabajados?: number;
  };
  periodo: {
    anio: number;
    mes: number;
    quincena?: number;
    tipo?: string;
    fechaInicio: string;
    fechaFin: string;
    fechaPago: string;
  };
  totales: {
    salarioMensual: number;
    salarioQuincenal?: number;
    totalDevengado: number;
    totalDeducciones: number;
    netoPagar: number;
    costoPatronal: number;
    totalProvisiones?: number;
    costoTotalEmpresa?: number;
  };
  devengos: Array<{ codigo: string; nombre: string; monto: number; cantidad?: number | null }>;
  deducciones: Array<{ codigo: string; nombre: string; monto: number }>;
  aportesPatronales: Array<{ codigo: string; nombre: string; monto: number }>;
  provisiones?: Array<{ codigo: string; nombre: string; monto: number }>;
}

export interface PlanillaHistorialItem {
  id: string;
  periodoId: string;
  periodo?: PeriodoNomina;
  anio: number;
  mes: number;
  quincena?: number;
  fechaInicio: string;
  fechaFin: string;
  fechaPago: string;
  tipo: string;
  estado: 'BORRADOR' | 'CALCULADA' | 'REVISADA' | 'APROBADA' | 'PAGADA' | 'ANULADA';
  bloqueada: boolean;
  totalDevengado: number;
  totalDeducciones: number;
  totalNeto: number;
  totalPatronal: number;
  totalInssPatronal: number;
  totalInatec: number;
  creadoPor?: string | null;
  calculadoEn?: string | null;
  revisadoPor?: string | null;
  revisadoEn?: string | null;
  aprobadoPor?: string | null;
  aprobadoEn?: string | null;
  fechaAprobacion?: string | null;
  pagadoEn?: string | null;
  asientoDevengoId?: string | null;
  asientoDevengoJson?: any;
  asientoPagoId?: string | null;
  asientoPagoJson?: any;
  totalColaboradores?: number;
  totalEmpleados?: number;
  sucursal?: string;
}

export interface PlanillaBitacoraItem {
  id: string;
  planillaId: string;
  accion: string;
  usuario: string;
  fechaHora?: string;
  createdAt?: string;
  comentario?: string | null;
  totalesAntes?: any;
  totalesDespues?: any;
}

export interface HistorialPagosEmpleadoData {
  empleado: {
    id: string;
    codigo: string;
    nombreCompleto: string;
    cedula: string;
    numeroInss: string;
    cargo: string;
    sucursal: string;
    salarioMensual: number;
    tipoSalario: string;
    fechaIngreso: string;
  };
  resumenLegal: {
    anio: number;
    acumuladoAnual: {
      devengado: number;
      inssLaboral: number;
      irSalarial: number;
      netoRecibido: number;
    };
    articulo78Vacaciones: {
      promedioMensual6Meses: number;
      quincenasConsideradas: number;
      baseCalculoDiario: number;
    };
    articulo94Aguinaldo: {
      salarioMaximo6Meses: number;
      esVariable: boolean;
    };
  };
  historialQuincenas: Array<{
    planillaId: string;
    periodo: string;
    quincena?: number;
    fechaPago: string;
    estado: string;
    salarioBase: number;
    horasExtra: number;
    comisiones: number;
    otrosIngresos: number;
    totalDevengado: number;
    inssLaboral: number;
    irSalarial: number;
    otrasDeducciones: number;
    totalDeducciones: number;
    netoPagar: number;
  }>;
}

export interface ParamInssData {
  id?: string;
  regimen?: string;
  tamanoEmpleador?: string;
  tasaLaboral: number;
  tasaPatronal: number;
  techoMensual?: number | null;
  vigenteDesde?: string;
  fuenteTexto?: string;
  fuenteUrl?: string;
}

export interface ParamInatecData {
  id?: string;
  tasa: number;
  vigenteDesde?: string;
  fuenteTexto?: string;
  fuenteUrl?: string;
}

export interface ParamIrTramoData {
  id?: string;
  orden: number;
  desdeExcl: number;
  hastaIncl: number | null;
  impuestoBase: number;
  porcentaje: number;
  sobreExceso: number;
  vigenteDesde?: string;
  fuenteTexto?: string;
}

export interface ParametrosLegalesData {
  inss: ParamInssData | null;
  inatec: ParamInatecData | null;
  irTramos: ParamIrTramoData[];
  reglasIndemnizacion?: any[];
}

export interface UpdateParametrosDto {
  inss?: {
    tasaLaboral: number;
    tasaPatronal: number;
    techoMensual?: number | null;
    tamanoEmpleador?: string;
    fuenteTexto?: string;
  };
  inatec?: {
    tasa: number;
    fuenteTexto?: string;
  };
  irTramos?: Array<{
    orden: number;
    desdeExcl: number;
    hastaIncl?: number | null;
    impuestoBase: number;
    porcentaje: number;
    sobreExceso: number;
    fuenteTexto?: string;
  }>;
}

export const payrollApi = {
  getParameters: async () => {
    const res = await api.get<ParametrosLegalesData>('/payroll/parameters');
    return res.data;
  },

  updateParameters: async (data: UpdateParametrosDto) => {
    const res = await api.put<ParametrosLegalesData>('/payroll/parameters', data);
    return res.data;
  },

  resetParameters: async () => {
    const res = await api.post<ParametrosLegalesData>('/payroll/parameters/reset');
    return res.data;
  },

  seedDefaults: async () => {
    const res = await api.post('/payroll/seed-defaults');
    return res.data;
  },

  getEmployees: async (params?: { estado?: string; sucursalId?: string }) => {
    const res = await api.get<Empleado[]>('/payroll/employees', { params });
    return res.data;
  },

  createEmployee: async (data: any) => {
    const res = await api.post<Empleado>('/payroll/employees', data);
    return res.data;
  },

  getEmployeePaymentHistory: async (empleadoId: string) => {
    const res = await api.get<HistorialPagosEmpleadoData>(`/payroll/employees/${empleadoId}/historial-pagos`);
    return res.data;
  },

  getPeriods: async () => {
    const res = await api.get<PeriodoNomina[]>('/payroll/periods');
    return res.data;
  },

  createPeriod: async (data: any) => {
    const res = await api.post<PeriodoNomina>('/payroll/periods', data);
    return res.data;
  },

  createNovedad: async (data: any) => {
    const res = await api.post('/payroll/novedades', data);
    return res.data;
  },

  calculatePayroll: async (data: { periodoId: string; sucursalId?: string }) => {
    const res = await api.post<PlanillaResumen>('/payroll/planillas/calcular', data);
    return res.data;
  },

  reviewPayroll: async (id: string) => {
    const res = await api.post<PlanillaResumen>(`/payroll/planillas/${id}/revisar`);
    return res.data;
  },

  returnPayroll: async (id: string, motivo: string) => {
    const res = await api.post<PlanillaResumen>(`/payroll/planillas/${id}/devolver`, { motivo });
    return res.data;
  },

  approvePayroll: async (id: string) => {
    const res = await api.post<PlanillaResumen>(`/payroll/planillas/${id}/aprobar`);
    return res.data;
  },

  markPaid: async (id: string) => {
    const res = await api.post<PlanillaResumen>(`/payroll/planillas/${id}/pagar`);
    return res.data;
  },

  cancelPayroll: async (id: string, motivo: string) => {
    const res = await api.post<PlanillaResumen>(`/payroll/planillas/${id}/anular`, { motivo });
    return res.data;
  },

  getPayrollHistory: async (params?: { anio?: number; mes?: number; estado?: string }) => {
    const res = await api.get<PlanillaHistorialItem[]>('/payroll/planillas/historial', { params });
    return res.data;
  },

  getPayrollDetail: async (id: string) => {
    const res = await api.get<any>(`/payroll/planillas/${id}`);
    return res.data;
  },

  getPayrollAuditLog: async (id: string) => {
    const res = await api.get<PlanillaBitacoraItem[]>(`/payroll/planillas/${id}/bitacora`);
    return res.data;
  },

  calculateSettlement: async (data: any) => {
    const res = await api.post('/payroll/liquidaciones', data);
    return res.data;
  },

  getPayslip: async (planillaEmpleadoId: string) => {
    const res = await api.get<ColillaData>(`/payroll/colilla/${planillaEmpleadoId}`);
    return res.data;
  },
};
