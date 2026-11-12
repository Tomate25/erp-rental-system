import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { UnidadMedidaInsumo } from '@prisma/client';
import { LIMITS } from '../../../common/validation/dto-limits';

export class UpdateInsumoDto {
  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NAME)
  nombre?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.CODE)
  codigo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  descripcion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SHORT)
  categoria?: string;

  @IsEnum(UnidadMedidaInsumo)
  @IsOptional()
  unidadMedida?: UnidadMedidaInsumo;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stockActual?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  stockMinimo?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  costoUnitario?: number;

  @IsBoolean()
  @IsOptional()
  costoIncluyeIva?: boolean;

  @IsBoolean()
  @IsOptional()
  aplicaIva?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  precioVenta?: number | null;

  @IsString()
  @IsOptional()
  proveedorId?: string | null;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
