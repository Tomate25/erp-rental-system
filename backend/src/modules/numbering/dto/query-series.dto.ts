import { IsEnum, IsOptional, IsString, IsBoolean, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { TipoDocumentoSerie, EstadoSerieDocumento } from '@prisma/client';

export class QuerySeriesDto {
  @IsOptional()
  @IsEnum(TipoDocumentoSerie)
  tipoDocumento?: TipoDocumentoSerie;

  @IsOptional()
  @IsUUID('4')
  sucursalId?: string;

  @IsOptional()
  @IsEnum(EstadoSerieDocumento)
  estado?: EstadoSerieDocumento;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  esFiscal?: boolean;

  @IsOptional()
  @IsString()
  q?: string;
}
