import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoSerieDocumento } from '@prisma/client';

export class UpdateSerieDto {
  @IsOptional()
  @IsUUID('4', { message: 'sucursalId debe ser un UUID válido' })
  sucursalId?: string;

  @IsOptional()
  @IsString()
  serie?: string;

  @IsOptional()
  @IsString()
  prefijo?: string;

  @IsOptional()
  @IsString()
  plantilla?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  relleno?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numeroDesde?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numeroHasta?: number;

  @IsOptional()
  @IsBoolean()
  reiniciaPorAnio?: boolean;

  @IsOptional()
  @IsBoolean()
  esFiscal?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  alertaPorcentaje?: number;

  @IsOptional()
  @IsEnum(EstadoSerieDocumento)
  estado?: EstadoSerieDocumento;
}
