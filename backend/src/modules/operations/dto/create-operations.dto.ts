import { IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, IsBoolean, IsArray, ValidateNested, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoSolicitudOperativa } from '@prisma/client';

export class CreateSolicitudDespachoDto {
  @IsUUID('4')
  @IsNotEmpty()
  contratoId: string;

  @IsString()
  @IsOptional()
  solicitadoPor?: string;

  @IsDateString()
  @IsNotEmpty()
  fechaProgramada: string;

  @IsString()
  @IsOptional()
  direccionEntrega?: string;

  @IsString()
  @IsOptional()
  comentarios?: string;
}

export class CreateSolicitudRetornoDto {
  @IsUUID('4')
  @IsNotEmpty()
  contratoId: string;

  @IsString()
  @IsOptional()
  solicitadoPor?: string;

  @IsDateString()
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
  cantidadPerdida?: number;

  @IsNumber()
  @IsOptional()
  horometroFinal?: number;

  @IsBoolean()
  @IsOptional()
  daniosDetectados?: boolean;

  @IsString()
  @IsOptional()
  descripcionDanios?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspeccionDanoDto)
  @IsOptional()
  danios?: InspeccionDanoDto[];
}

export class CreateRetornoDto {
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
