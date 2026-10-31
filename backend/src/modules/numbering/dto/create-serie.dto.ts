import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoDocumentoSerie, EstadoSerieDocumento } from '@prisma/client';

export class CreateSerieDto {
  @IsOptional()
  @IsUUID('4', { message: 'sucursalId debe ser un UUID válido' })
  sucursalId?: string;

  @IsNotEmpty({ message: 'El tipo de documento es obligatorio' })
  @IsEnum(TipoDocumentoSerie, {
    message: `tipoDocumento debe ser uno de los valores válidos: ${Object.values(
      TipoDocumentoSerie,
    ).join(', ')}`,
  })
  tipoDocumento: TipoDocumentoSerie;

  @IsNotEmpty({ message: 'La serie es obligatoria' })
  @IsString({ message: 'La serie debe ser una cadena de texto' })
  serie: string;

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

  @IsNotEmpty({ message: 'El número inicial es obligatorio' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numeroDesde: number;

  @IsNotEmpty({ message: 'El número final es obligatorio' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  numeroHasta: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  numeroActual?: number;

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
