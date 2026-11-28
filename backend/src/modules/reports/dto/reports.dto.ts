import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export enum ReportType {
  COTIZACIONES = 'cotizaciones',
  CONTRATOS = 'contratos',
  INVENTARIO = 'inventario',
  MAQUINARIA_USADA = 'maquinaria_usada',
  FACTURACION_CXC = 'facturacion_cxc',
  COMPRAS_INSUMOS = 'compras_insumos',
  MANTENIMIENTO = 'mantenimiento',
  CONTABILIDAD = 'contabilidad',
  NOMINA_COMISIONES = 'nomina_comisiones',
  CLIENTES = 'clientes',
}

export enum TipoDocumentoAnulable {
  FACTURA = 'FACTURA',
  CONTRATO = 'CONTRATO',
  COTIZACION = 'COTIZACION',
  RECIBO_CAJA = 'RECIBO_CAJA',
  COMPRA_INSUMO = 'COMPRA_INSUMO',
  SUBARRIENDO_PROVEEDOR = 'SUBARRIENDO_PROVEEDOR',
  NOTA_CXC = 'NOTA_CXC',
  ASIENTO_MANUAL = 'ASIENTO_MANUAL',
}

export class ReportFilterQueryDto {
  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sucursalId?: string;
}

export class VoidingListQueryDto {
  @IsOptional()
  @IsEnum(TipoDocumentoAnulable)
  tipoDocumento?: TipoDocumentoAnulable;

  @IsOptional()
  @IsString()
  estadoFiltro?: 'ACTIVOS' | 'ANULADOS' | 'TODOS';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  fechaDesde?: string;

  @IsOptional()
  @IsDateString()
  fechaHasta?: string;
}

export class ExecuteVoidingDto {
  @IsEnum(TipoDocumentoAnulable)
  tipoDocumento!: TipoDocumentoAnulable;

  @IsUUID()
  documentoId!: string;

  @IsString()
  @MinLength(5, {
    message:
      'El motivo de anulación es obligatorio y debe tener al menos 5 caracteres.',
  })
  motivo!: string;
}
