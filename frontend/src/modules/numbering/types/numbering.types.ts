export type TipoDocumentoSerie =
  | 'FACTURA'
  | 'FACTURA_DANIO'
  | 'NOTA_DEBITO'
  | 'RECIBO_CAJA'
  | 'COTIZACION'
  | 'CONTRATO'
  | 'SOL_DESPACHO'
  | 'SOL_RETORNO'
  | 'ACTA_ENTREGA'
  | 'ACTA_RECEPCION'
  | 'OT_TALLER'
  | 'ARREGLO_PAGO'
  | 'NOTA_CREDITO'
  | 'ASIENTO';

export type EstadoSerieDocumento = 'ACTIVA' | 'AGOTADA' | 'VENCIDA' | 'INACTIVA';

export type EstadoUsoDocumento = 'EMITIDO' | 'ANULADO';

export interface SucursalOption {
  id: string;
  nombre: string;
  codigo: string;
  direccion?: string;
}

export interface SerieDocumentoUso {
  id: string;
  serieId: string;
  numero: number;
  codigoFormateado: string;
  tipoDocumento: TipoDocumentoSerie;
  documentoId?: string | null;
  usuarioId?: string | null;
  estado: EstadoUsoDocumento;
  createdAt: string;
}

export interface SerieDocumento {
  id: string;
  empresaId: string;
  sucursalId?: string | null;
  sucursal?: SucursalOption | null;
  tipoDocumento: TipoDocumentoSerie;
  serie: string;
  prefijo?: string | null;
  plantilla?: string | null;
  relleno: number;
  numeroDesde: number;
  numeroHasta: number;
  numeroActual: number;
  reiniciaPorAnio: boolean;
  anioActual?: number | null;
  esFiscal: boolean;
  alertaPorcentaje: number;
  estado: EstadoSerieDocumento;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;

  // Métricas computadas
  foliosEmitidos: number;
  totalRango: number;
  porcentajeConsumo: number;
  foliosDisponibles: number;
  alertaSuperada: boolean;
  siguienteNumero: number;
  siguientePreview: string;

  usos?: SerieDocumentoUso[];
}

export interface NumberingKpis {
  totalSeries: number;
  activas: number;
  agotadas: number;
  enAlerta: number;
}

export interface NumberingListResponse {
  items: SerieDocumento[];
  kpis: NumberingKpis;
}

export interface CreateSerieDto {
  sucursalId?: string | null;
  tipoDocumento: TipoDocumentoSerie;
  serie: string;
  prefijo?: string;
  plantilla?: string;
  relleno?: number;
  numeroDesde: number;
  numeroHasta: number;
  numeroActual?: number;
  reiniciaPorAnio?: boolean;
  esFiscal?: boolean;
  alertaPorcentaje?: number;
  estado?: EstadoSerieDocumento;
}

export interface UpdateSerieDto {
  sucursalId?: string | null;
  serie?: string;
  prefijo?: string;
  plantilla?: string;
  relleno?: number;
  numeroDesde?: number;
  numeroHasta?: number;
  reiniciaPorAnio?: boolean;
  esFiscal?: boolean;
  alertaPorcentaje?: number;
  estado?: EstadoSerieDocumento;
}

export interface PreviewSerieDto {
  prefijo?: string;
  serie?: string;
  plantilla?: string;
  relleno?: number;
  numero?: number;
  anio?: number;
}
