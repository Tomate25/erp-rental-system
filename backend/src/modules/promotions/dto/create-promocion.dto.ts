import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoCobro } from '@prisma/client';
import { LIMITS } from '../../../common/validation/dto-limits';

export class CreatePromocionItemDto {
  @IsString({ message: 'El ID del producto debe ser una cadena válida' })
  @IsOptional()
  productoId?: string;

  @IsString({ message: 'El ID del equipo debe ser una cadena válida' })
  @IsOptional()
  equipoId?: string;

  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad mínima es 1' })
  cantidad: number;

  @IsNumber({}, { message: 'El precio unitario sugerido debe ser un número' })
  @Min(0, { message: 'El precio unitario no puede ser negativo' })
  @IsOptional()
  precioUnitarioSugerido?: number;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  notas?: string;
}

export class CreatePromocionDto {
  @IsString({ message: 'El código de promoción es requerido' })
  @IsNotEmpty({ message: 'El código no puede estar vacío' })
  @MaxLength(LIMITS.TEXT.CODE)
  codigo: string;

  @IsString({ message: 'El nombre de la promoción es requerido' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MaxLength(LIMITS.TEXT.NAME)
  nombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  descripcion?: string;

  @IsNumber({}, { message: 'El precio combo debe ser un valor numérico' })
  @Min(0, { message: 'El precio combo no puede ser negativo' })
  precioCombo: number;

  @IsEnum(TipoCobro, { message: 'El tipo de cobro no es válido' })
  @IsOptional()
  tipoCobro?: TipoCobro;

  @IsInt({ message: 'Los días mínimos deben ser un entero' })
  @Min(1, { message: 'Los días mínimos deben ser al menos 1' })
  @IsOptional()
  diasMinimos?: number;

  @IsString()
  @IsOptional()
  fechaInicio?: string;

  @IsString()
  @IsOptional()
  fechaFin?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsArray({ message: 'Los items del combo deben ser una lista' })
  @ValidateNested({ each: true })
  @Type(() => CreatePromocionItemDto)
  @IsOptional()
  items?: CreatePromocionItemDto[];
}
