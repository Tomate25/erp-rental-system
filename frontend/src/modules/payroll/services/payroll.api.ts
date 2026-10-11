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
  estado: 'BORRADOR' | 'CALCULADA' | 'REVISADA' | 'APROBADA' | 'PAGADA' | 'ANULADA';
  totalDevengado: number;
  totalDeducciones: number;
  totalNeto: number;
  totalPatronal: number;
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

export const payrollApi = {
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

  approvePayroll: async (id: string) => {
    const res = await api.post<PlanillaResumen>(`/payroll/planillas/${id}/aprobar`);
    return res.data;
  },

  markPaid: async (id: string) => {
    const res = await api.post<PlanillaResumen>(`/payroll/planillas/${id}/pagar`);
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
