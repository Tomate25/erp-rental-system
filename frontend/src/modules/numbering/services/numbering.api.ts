import api from '../../../shared/services/api';
import type {
  SerieDocumento,
  NumberingListResponse,
  CreateSerieDto,
  UpdateSerieDto,
  PreviewSerieDto,
  SucursalOption,
  TipoDocumentoSerie,
  EstadoSerieDocumento,
} from '../types/numbering.types';

export interface NumberingFilterParams {
  tipoDocumento?: TipoDocumentoSerie;
  sucursalId?: string;
  estado?: EstadoSerieDocumento;
  esFiscal?: boolean;
  q?: string;
}

export const numberingApi = {
  async getSeries(params?: NumberingFilterParams): Promise<NumberingListResponse> {
    const res = await api.get('/numbering', { params });
    const payload = res.data?.data || res.data;
    return {
      items: payload?.items || [],
      kpis: payload?.kpis || { totalSeries: 0, activas: 0, agotadas: 0, enAlerta: 0 },
    };
  },

  async getSerie(id: string): Promise<SerieDocumento> {
    const res = await api.get(`/numbering/${id}`);
    return res.data?.data || res.data;
  },

  async createSerie(dto: CreateSerieDto): Promise<SerieDocumento> {
    const res = await api.post('/numbering', dto);
    return res.data?.data || res.data;
  },

  async updateSerie(id: string, dto: UpdateSerieDto): Promise<SerieDocumento> {
    const res = await api.put(`/numbering/${id}`, dto);
    return res.data?.data || res.data;
  },

  async activateSerie(id: string): Promise<SerieDocumento> {
    const res = await api.patch(`/numbering/${id}/activate`);
    return res.data?.data || res.data;
  },

  async preview(dto: PreviewSerieDto): Promise<string> {
    const res = await api.post('/numbering/preview', dto);
    return res.data?.data?.preview || res.data?.preview || '';
  },

  async getSucursales(): Promise<SucursalOption[]> {
    const res = await api.get('/numbering/sucursales');
    return res.data?.data || res.data || [];
  },
};
