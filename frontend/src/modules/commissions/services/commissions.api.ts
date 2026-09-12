import api from '../../../shared/services/api';

export interface CommissionUser {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
}

export interface ReglaComision {
  id: string;
  empresaId: string;
  usuarioId?: string | null;
  usuario?: CommissionUser | null;
  desdeMonto: number;
  hastaMonto?: number | null;
  porcentaje: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  /** Compatibilidad con las escalas históricas sembradas por nombre. */
  nombreVendedor?: string | null;
}

export interface CommissionRuleDto {
  usuarioId?: string | null;
  desdeMonto: number;
  hastaMonto?: number | null;
  porcentaje: number;
  activo?: boolean;
}

export type UpdateCommissionRuleDto = Partial<CommissionRuleDto>;

export interface CalculateCommissionDto {
  usuarioId: string;
  montoVentas: number;
}

export interface DesgloseComision {
  desdeMonto: number;
  hastaMonto?: number | null;
  porcentaje: number;
  montoBase: number;
  montoComision: number;
}

export interface ResultadoComision {
  desglose: DesgloseComision[];
  comisionTotal: number;
  porcentaje?: number;
  montoComision?: number;
}

export interface SettlementItem {
  usuarioId: string;
  nombre: string;
  email: string;
  totalCotizaciones: number;
  cotizacionesAprobadas: number;
  contratosGenerados: number;
  totalVendido: number;
  porcentajeAplicado: number;
  comisionTotal: number;
  tramoAplicado: string;
  estado: string;
}

export interface TeamSettlementSummary {
  totalVendidoEquipo: number;
  totalComisionesEquipo: number;
  totalContratos: number;
  vendedoresConVentas: number;
  totalVendedores: number;
  vendedorLider: {
    usuarioId: string;
    nombre: string;
    montoVendido: number;
    comision: number;
  } | null;
  tasaEfectivaPromedio: number;
}

export interface TeamSettlementResponse {
  resumen: TeamSettlementSummary;
  liquidaciones: SettlementItem[];
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface BackendReglaComision {
  id: string;
  empresaId: string;
  usuarioId?: string | null;
  usuario?: CommissionUser | null;
  nombreVendedor?: string | null;
  montoMinimo?: number;
  montoMaximo?: number | null;
  desdeMonto?: number;
  hastaMonto?: number | null;
  porcentaje: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BackendDesgloseComision {
  montoMinimo?: number;
  montoMaximo?: number | null;
  desdeMonto?: number;
  hastaMonto?: number | null;
  porcentaje: number;
  montoBase?: number;
  baseComisionable?: number;
  montoComision: number;
}

interface BackendResultadoComision {
  desglose?: BackendDesgloseComision[];
  comisionTotal?: number;
  porcentaje?: number;
  montoComision?: number;
}

interface BackendCommissionRuleDto {
  usuarioId?: string | null;
  nombreVendedor?: string | null;
  montoMinimo?: number;
  montoMaximo?: number | null;
  porcentaje?: number;
  activo?: boolean;
}

const mapRule = (rule: BackendReglaComision): ReglaComision => ({
  id: rule.id,
  empresaId: rule.empresaId,
  usuarioId: rule.usuarioId,
  usuario: rule.usuario,
  nombreVendedor: rule.nombreVendedor,
  desdeMonto: rule.desdeMonto ?? rule.montoMinimo ?? 0,
  hastaMonto: rule.hastaMonto ?? rule.montoMaximo ?? null,
  porcentaje: rule.porcentaje,
  activo: rule.activo,
  createdAt: rule.createdAt,
  updatedAt: rule.updatedAt,
});

const mapDto = (dto: UpdateCommissionRuleDto): BackendCommissionRuleDto => {
  const payload: BackendCommissionRuleDto = {};

  if ('usuarioId' in dto) {
    payload.usuarioId = dto.usuarioId ?? null;
    // Una regla vinculada por usuario (o global) no debe conservar un nombre histórico.
    payload.nombreVendedor = null;
  }
  if (dto.desdeMonto !== undefined) payload.montoMinimo = dto.desdeMonto;
  if ('hastaMonto' in dto) payload.montoMaximo = dto.hastaMonto ?? null;
  if (dto.porcentaje !== undefined) payload.porcentaje = dto.porcentaje;
  if (dto.activo !== undefined) payload.activo = dto.activo;

  return payload;
};

export const getCommissionRules = async (): Promise<ReglaComision[]> => {
  const response = await api.get<ApiResponse<BackendReglaComision[]>>('/commissions');
  return response.data.data.map(mapRule);
};

export const createCommissionRule = async (dto: CommissionRuleDto): Promise<ReglaComision> => {
  const response = await api.post<ApiResponse<BackendReglaComision>>('/commissions', mapDto(dto));
  return mapRule(response.data.data);
};

export const updateCommissionRule = async (
  id: string,
  dto: UpdateCommissionRuleDto,
): Promise<ReglaComision> => {
  const response = await api.put<ApiResponse<BackendReglaComision>>(
    `/commissions/${id}`,
    mapDto(dto),
  );
  return mapRule(response.data.data);
};

export const deleteCommissionRule = async (id: string): Promise<void> => {
  await api.delete(`/commissions/${id}`);
};

export const seedDefaultCommissionRules = async (): Promise<ReglaComision[]> => {
  const response = await api.post<ApiResponse<BackendReglaComision[]>>(
    '/commissions/seed-defaults',
  );
  return response.data.data.map(mapRule);
};

export const calculateCommission = async (
  dto: CalculateCommissionDto,
): Promise<ResultadoComision> => {
  const response = await api.post<ApiResponse<BackendResultadoComision>>(
    '/commissions/calculate',
    dto,
  );
  const result = response.data.data;
  const total = result.comisionTotal ?? result.montoComision ?? 0;
  const desglose = result.desglose?.map((item) => ({
    desdeMonto: item.desdeMonto ?? item.montoMinimo ?? 0,
    hastaMonto: item.hastaMonto ?? item.montoMaximo ?? null,
    porcentaje: item.porcentaje,
    montoBase: item.montoBase ?? item.baseComisionable ?? dto.montoVentas,
    montoComision: item.montoComision,
  })) ?? (result.porcentaje !== undefined
    ? [{
        desdeMonto: 0,
        hastaMonto: null,
        porcentaje: result.porcentaje,
        montoBase: dto.montoVentas,
        montoComision: total,
      }]
    : []);

  return {
    ...result,
    desglose,
    comisionTotal: total,
  };
};

export const getTeamSettlement = async (): Promise<TeamSettlementResponse> => {
  const response = await api.get<ApiResponse<TeamSettlementResponse>>('/commissions/team-settlement');
  return response.data.data;
};

export const seedRulesForAllSellers = async (): Promise<ReglaComision[]> => {
  const response = await api.post<ApiResponse<BackendReglaComision[]>>(
    '/commissions/seed-all-sellers',
  );
  return response.data.data.map(mapRule);
};
