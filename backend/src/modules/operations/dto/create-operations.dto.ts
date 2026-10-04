import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsDateString,
  IsEnum,
  IsObject,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoSolicitudOperativa } from '@prisma/client';

export class CreateSolicitudDespachoDto {
  @IsUUID('4')
  @IsNotEmpty()
  contratoId: string;

  @IsString()
  @IsOptional()
  solicitadoPor?: string;

  @IsDateString({ strict: true })
  @IsNotEmpty()
  fechaProgramada: string;

  @IsString()
  @IsOptional()
  direccionEntrega?: string;

  @IsString()
  @IsOptional()
  comentarios?: string;
}

export class ScheduleSolicitudDespachoDto {
  @IsDateString({ strict: true })
  @IsNotEmpty()
  fechaProgramada: string;
}

export class CreateSolicitudRetornoDto {
  @IsUUID('4')
  @IsNotEmpty()
  contratoId: string;

  @IsString()
  @IsOptional()
  solicitadoPor?: string;

  @IsDateString({ strict: true })
  @IsNotEmpty()
  fechaProgramada: string;

  @IsString()
  @IsOptional()
  lugarRecoleccion?: string;

  @IsString()
  @IsOptional()
  comentarios?: string;
}

export class UpdateEstadoSolicitudDto {
  @IsEnum(EstadoSolicitudOperativa)
  @IsNotEmpty()
  estado: EstadoSolicitudOperativa;

  @IsString()
  @IsOptional()
  comentarios?: string;
}

export class InspeccionSalidaDto {
  @IsString()
  @IsOptional()
  combustible?: string;

  @IsNumber()
  @IsOptional()
  nivelCombustible?: number;

  @IsBoolean()
  @IsOptional()
  aceiteOk?: boolean;

  @IsBoolean()
  @IsOptional()
  llantasOk?: boolean;

  @IsBoolean()
  @IsOptional()
  hidraulicoOk?: boolean;

  @IsBoolean()
  @IsOptional()
  motorOk?: boolean;

  @IsBoolean()
  @IsOptional()
  fugasDetectadas?: boolean;

  @IsString()
  @IsOptional()
  observaciones?: string;
}

export class ItemDespachoDto {
  @IsUUID('4')
  @IsNotEmpty()
  equipoId: string;

  @IsString()
  @IsOptional()
  numeroSerie?: string;

  @IsNumber()
  @IsOptional()
  cantidad?: number;

  @IsNumber()
  @IsOptional()
  horometroInicial?: number;

  @IsString()
  @IsOptional()
  estadoSalida?: string; // BUENO / REGULAR / DAÑADO

  @IsBoolean()
  @IsOptional()
  checklistOk?: boolean;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @ValidateNested()
  @Type(() => InspeccionSalidaDto)
  @IsOptional()
  inspeccionSalida?: InspeccionSalidaDto;
}

export class CreateDespachoDto {
  @IsUUID('4')
  @IsNotEmpty()
  contratoId: string;

  @IsUUID('4')
  @IsOptional()
  solicitudDespachoId?: string;

  @IsString()
  @IsOptional()
  operadorNombre?: string;

  @IsString()
  @IsOptional()
  vehiculoEnvio?: string;

  @IsString()
  @IsOptional()
  comentarios?: string;

  @IsObject()
  @IsOptional()
  actaEntregaData?: Record<string, unknown>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDespachoDto)
  items: ItemDespachoDto[];
}

export class InspeccionDanoDto {
  @IsString()
  @IsNotEmpty()
  componente: string;

  @IsString()
  @IsNotEmpty()
  tipoDano: string;

  @IsString()
  @IsOptional()
  severidad?: 'BAJA' | 'MEDIA' | 'ALTA' | 'PERDIDA_TOTAL';

  @IsBoolean()
  @IsOptional()
  cobrable?: boolean;

  @IsNumber()
  @IsOptional()
  costoEstimado?: number;

  @IsString()
  @IsOptional()
  observaciones?: string;
}

export class InspeccionEstadoDto {
  @IsIn(['FUNCIONA', 'NO_FUNCIONA', 'NO_VERIFICADO'])
  funcionamiento: 'FUNCIONA' | 'NO_FUNCIONA' | 'NO_VERIFICADO';

  @IsIn(['BUENO', 'DESGASTE_NORMAL', 'DANADO'])
  estadoFisico: 'BUENO' | 'DESGASTE_NORMAL' | 'DANADO';

  @IsBoolean()
  accesoriosCompletos: boolean;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fotosUrls?: string[];
}

export class ItemDevolucionDto {
  @IsUUID('4')
  @IsNotEmpty()
  equipoId: string;

  @IsString()
  @IsOptional()
  numeroSerie?: string;

  @IsNumber()
  @IsOptional()
  cantidadRetornada?: number;

  @IsNumber()
  @IsOptional()
  cantidadDañada?: number;

  @IsNumber()
  @IsOptional()
  cantidadDanada?: number;

  @IsNumber()
  @IsOptional()
  cantidadPerdida?: number;

  @IsNumber()
  @IsOptional()
  horometroFinal?: number;

  @IsString()
  @IsOptional()
  combustibleRetorno?: string;

  @IsNumber()
  @IsOptional()
  nivelCombustible?: number;

  @IsNumber()
  @IsOptional()
  cargoCombustible?: number;

  @IsBoolean()
  @IsOptional()
  daniosDetectados?: boolean;

  @IsString()
  @IsOptional()
  descripcionDanios?: string;

  @ValidateNested()
  @Type(() => InspeccionEstadoDto)
  @IsOptional()
  inspeccionEstado?: InspeccionEstadoDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspeccionDanoDto)
  @IsOptional()
  danios?: InspeccionDanoDto[];
}

export class CreateRetornoDto {
  @IsString()
  @IsOptional()
  entregadoPor?: string;

  @IsString()
  @IsOptional()
  cedulaEntregante?: string;
  @IsUUID('4')
  @IsNotEmpty()
  contratoId: string;

  @IsUUID('4')
  @IsOptional()
  solicitudRetornoId?: string;

  @IsString()
  @IsNotEmpty()
  recibidoPor: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDevolucionDto)
  items: ItemDevolucionDto[];
}
