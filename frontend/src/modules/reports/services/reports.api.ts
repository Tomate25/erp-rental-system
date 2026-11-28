import api from '../../../shared/services/api';
import type {
  ConsolidatedReportResponse,
  ExecuteVoidingResult,
  ReportCatalogResponse,
  ReportFilters,
  ReportPayload,
  ReportType,
  TipoDocumentoAnulable,
  VoidingBehaviorMatrixRule,
  VoidingDocumentsListResponse,
  VoidingHistoryResponse,
  VoidingImpactPreview,
} from '../types/reports.types';

export const reportsApi = {
  async getCatalog(): Promise<ReportCatalogResponse> {
    const res = await api.get('/reports/catalog');
    return res.data.data;
  },

  async getReportData(
    tipo: ReportType,
    filters: ReportFilters = {},
  ): Promise<ReportPayload> {
    const params: Record<string, string> = {};
    if (filters.fechaDesde) params.fechaDesde = filters.fechaDesde;
    if (filters.fechaHasta) params.fechaHasta = filters.fechaHasta;
    if (filters.estado) params.estado = filters.estado;
    if (filters.search?.trim()) params.search = filters.search.trim();

    const res = await api.get(`/reports/data/${tipo}`, { params });
    return res.data.data;
  },

  async getConsolidatedReport(
    filters: ReportFilters = {},
  ): Promise<ConsolidatedReportResponse> {
    const params: Record<string, string> = {};
    if (filters.fechaDesde) params.fechaDesde = filters.fechaDesde;
    if (filters.fechaHasta) params.fechaHasta = filters.fechaHasta;
    if (filters.search?.trim()) params.search = filters.search.trim();

    const res = await api.get('/reports/consolidated', { params });
    return res.data.data;
  },

  async getVoidingMatrix(): Promise<VoidingBehaviorMatrixRule[]> {
    const res = await api.get('/reports/voiding/matrix');
    return res.data.data;
  },

  async listVoidableDocuments(params: {
    tipoDocumento?: TipoDocumentoAnulable | '';
    estadoFiltro?: 'ACTIVOS' | 'ANULADOS' | 'TODOS';
    search?: string;
    fechaDesde?: string;
    fechaHasta?: string;
  } = {}): Promise<VoidingDocumentsListResponse> {
    const cleanParams: Record<string, string> = {};
    if (params.tipoDocumento) cleanParams.tipoDocumento = params.tipoDocumento;
    if (params.estadoFiltro) cleanParams.estadoFiltro = params.estadoFiltro;
    if (params.search?.trim()) cleanParams.search = params.search.trim();
    if (params.fechaDesde) cleanParams.fechaDesde = params.fechaDesde;
    if (params.fechaHasta) cleanParams.fechaHasta = params.fechaHasta;

    const res = await api.get('/reports/voiding/documents', {
      params: cleanParams,
    });
    return res.data.data;
  },

  async previewVoiding(
    tipoDocumento: TipoDocumentoAnulable,
    documentoId: string,
  ): Promise<VoidingImpactPreview> {
    const res = await api.get(
      `/reports/voiding/preview/${tipoDocumento}/${documentoId}`,
    );
    return res.data.data;
  },

  async executeVoiding(payload: {
    tipoDocumento: TipoDocumentoAnulable;
    documentoId: string;
    motivo: string;
  }): Promise<ExecuteVoidingResult> {
    const res = await api.post('/reports/voiding/execute', payload);
    return res.data.data;
  },

  async getVoidingHistory(params: {
    tipoDocumento?: TipoDocumentoAnulable | '';
    search?: string;
  } = {}): Promise<VoidingHistoryResponse> {
    const cleanParams: Record<string, string> = {};
    if (params.tipoDocumento) cleanParams.tipoDocumento = params.tipoDocumento;
    if (params.search?.trim()) cleanParams.search = params.search.trim();

    const res = await api.get('/reports/voiding/history', {
      params: cleanParams,
    });
    return res.data.data;
  },
};
