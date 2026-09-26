import {
  IsOptional,
  IsString,
  IsIn,
  IsISO8601,
  IsInt,
  Min,
  Max,
} from 'class-validator';
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
  accion?: string;

  @IsOptional()
  @IsString()
  modulo?: string;

  @IsOptional()
  @IsIn(['HTTP', 'NEGOCIO'])
  tipoEvento?: 'HTTP' | 'NEGOCIO';

  @IsOptional()
  @IsString()
  entidadTipo?: string;

  @IsOptional()
  @IsString()
  entidadId?: string;

  @IsOptional()
  @IsString()
  usuarioId?: string;

  @IsOptional()
  @IsString()
  requestId?: string;
}
