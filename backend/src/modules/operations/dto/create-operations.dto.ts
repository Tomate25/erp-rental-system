import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
  IsDefined,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';
import { Type } from 'class-transformer';
import { EstadoSolicitudOperativa } from '@prisma/client';
import {
  ACTA_MAX_JSON_CHARS,
  ActaEntregaDataDto,
  MaxJsonSize,
} from './acta-entrega.dto';

export class CreateSolicitudDespachoDto {
  @IsUUID('4')
  @IsNotEmpty()
  contratoId: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NAME)
  solicitadoPor?: string;

  @IsDateString({ strict: true })
  @IsNotEmpty()
  fechaProgramada: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.ADDRESS)
  direccionEntrega?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
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
  @MaxLength(LIMITS.TEXT.NAME)
  solicitadoPor?: string;

  @IsDateString({ strict: true })
  @IsNotEmpty()
  fechaProgramada: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.ADDRESS)
  lugarRecoleccion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  comentarios?: string;
}

export class UpdateEstadoSolicitudDto {
  @IsEnum(EstadoSolicitudOperativa)
  @IsNotEmpty()
  estado: EstadoSolicitudOperativa;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  comentarios?: string;
}

export class InspeccionSalidaDto {
  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.CODE)
  combustible?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(LIMITS.FUEL_MAX)
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
  @MaxLength(LIMITS.TEXT.NOTES)
  observaciones?: string;
}

export class ItemDespachoDto {
  @IsUUID('4')
  @IsNotEmpty()
  equipoId: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SERIAL)
  numeroSerie?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(LIMITS.QTY_MAX)
  cantidad?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(LIMITS.HOROMETRO_MAX)
  horometroInicial?: number;

  @IsString()
  @IsOptional()
  @IsIn(['BUENO', 'REGULAR', 'DANADO', 'DAÑADO'])
  estadoSalida?: string; // BUENO / REGULAR / DAÑADO

  @IsBoolean()
  @IsOptional()
  checklistOk?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
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
  @MaxLength(LIMITS.TEXT.NAME)
  operadorNombre?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NAME)
  vehiculoEnvio?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  comentarios?: string;

  @IsOptional()
  @IsObject({ message: 'actaEntregaData debe ser un objeto' })
  @MaxJsonSize(ACTA_MAX_JSON_CHARS, {
    message: `actaEntregaData no puede superar ${ACTA_MAX_JSON_CHARS} caracteres`,
  })
  @ValidateNested()
  @Type(() => ActaEntregaDataDto)
  actaEntregaData?: ActaEntregaDataDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDespachoDto)
  @ArrayMaxSize(LIMITS.ITEMS_MAX)
  items: ItemDespachoDto[];
}

export class InspeccionDanoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(LIMITS.TEXT.NAME)
  componente: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(LIMITS.TEXT.NAME)
  tipoDano: string;

  @IsString()
  @IsOptional()
  @IsIn(['BAJA', 'MEDIA', 'ALTA', 'PERDIDA_TOTAL'])
  severidad?: 'BAJA' | 'MEDIA' | 'ALTA' | 'PERDIDA_TOTAL';

  @IsBoolean()
  @IsOptional()
  cobrable?: boolean;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.MONEY_MAX)
  costoEstimado?: number;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
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
  @MaxLength(LIMITS.TEXT.NOTES)
  observaciones?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @ArrayMaxSize(LIMITS.PHOTOS_MAX)
  @MaxLength(LIMITS.TEXT.URL, { each: true })
  fotosUrls?: string[];
}

export class ItemDevolucionDto {
  @IsUUID('4')
  @IsNotEmpty()
  equipoId: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SERIAL)
  numeroSerie?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(LIMITS.QTY_MAX)
  cantidadRetornada?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(LIMITS.QTY_MAX)
  cantidadDañada?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(LIMITS.QTY_MAX)
  cantidadDanada?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(LIMITS.QTY_MAX)
  cantidadPerdida?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(LIMITS.HOROMETRO_MAX)
  horometroFinal?: number;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.CODE)
  combustibleRetorno?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(LIMITS.FUEL_MAX)
  nivelCombustible?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.MONEY_MAX)
  cargoCombustible?: number;

  @IsBoolean()
  @IsOptional()
  daniosDetectados?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  descripcionDanios?: string;

  @ValidateNested()
  @Type(() => InspeccionEstadoDto)
  @IsDefined()
  inspeccionEstado: InspeccionEstadoDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InspeccionDanoDto)
  @IsOptional()
  @ArrayMaxSize(LIMITS.ITEMS_MAX)
  danios?: InspeccionDanoDto[];
}

export class CreateRetornoDto {
  @IsDateString()
  @IsOptional()
  fechaDevolucion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NAME)
  entregadoPor?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.PHONE)
  cedulaEntregante?: string;
  @IsUUID('4')
  @IsNotEmpty()
  contratoId: string;

  @IsUUID('4')
  @IsOptional()
  solicitudRetornoId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(LIMITS.TEXT.NAME)
  recibidoPor: string;

  @IsObject()
  @IsOptional()
  actaRetornoData?: Record<string, unknown>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemDevolucionDto)
  @ArrayMaxSize(LIMITS.ITEMS_MAX)
  items: ItemDevolucionDto[];
}

export class SeleccionarDestinoCreditoDto {
  @IsIn(['REEMBOLSO', 'SALDO_FAVOR'])
  destinoCredito: 'REEMBOLSO' | 'SALDO_FAVOR';
}

export class SwapEquipmentDto {
  @IsUUID('4')
  @IsNotEmpty()
  contratoId: string;

  @IsUUID('4')
  @IsNotEmpty()
  equipoActualId: string;

  @IsUUID('4')
  @IsNotEmpty()
  equipoNuevoId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(LIMITS.TEXT.NOTES)
  motivo: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(LIMITS.HOROMETRO_MAX)
  horometroFinalActual?: number;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.CODE)
  combustibleRetornoActual?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  observaciones?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NAME)
  responsableEntrega?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NAME)
  responsableRecepcion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  cedulaReceptor?: string;
}

