import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { UnidadMedidaInsumo } from '@prisma/client';
import { LIMITS } from '../../../common/validation/dto-limits';

export class CreateInsumoDto {
  @IsString({ message: 'El nombre del insumo es requerido' })
  @IsNotEmpty({ message: 'El nombre del insumo no puede estar vacío' })
  @MaxLength(LIMITS.TEXT.NAME)
  nombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.CODE)
  codigo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  descripcion?: string;

  @IsString({ message: 'La categoría del insumo debe ser texto' })
  @MaxLength(LIMITS.TEXT.SHORT)
  @IsOptional()
  categoria?: string;

  @IsEnum(UnidadMedidaInsumo, { message: 'La unidad de medida no es válida' })
  @IsOptional()
  unidadMedida?: UnidadMedidaInsumo;

  @IsNumber({}, { message: 'El stock inicial debe ser un número' })
  @Min(0, { message: 'El stock no puede ser negativo' })
  @IsOptional()
  stockActual?: number;

  @IsNumber({}, { message: 'El stock mínimo debe ser un número' })
  @Min(0, { message: 'El stock mínimo no puede ser negativo' })
  @IsOptional()
  stockMinimo?: number;

  @IsNumber({}, { message: 'El costo unitario debe ser un número' })
  @Min(0, { message: 'El costo unitario no puede ser negativo' })
  @IsOptional()
  costoUnitario?: number;

  @IsBoolean()
  @IsOptional()
  costoIncluyeIva?: boolean;

  @IsBoolean()
  @IsOptional()
  aplicaIva?: boolean;

  @IsNumber({}, { message: 'El precio de venta debe ser un número' })
  @Min(0, { message: 'El precio de venta no puede ser negativo' })
  @IsOptional()
  precioVenta?: number;

  @IsString()
  @IsOptional()
  proveedorId?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
