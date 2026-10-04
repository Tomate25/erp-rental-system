import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';
import { Type } from 'class-transformer';

export class QueryAuditoriaDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsISO8601()
  fechaInicio?: string;

  @IsOptional()
  @IsISO8601()
  fechaFin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(LIMITS.TEXT.NAME)
  accion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(LIMITS.TEXT.NAME)
  modulo?: string;

  @IsOptional()
  @IsIn(['HTTP', 'NEGOCIO'])
  tipoEvento?: 'HTTP' | 'NEGOCIO';

  @IsOptional()
  @IsString()
  @MaxLength(LIMITS.TEXT.NAME)
  entidadTipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(LIMITS.TEXT.ID)
  entidadId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(LIMITS.TEXT.ID)
  usuarioId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  requestId?: string;
}
