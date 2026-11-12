import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
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
import { CreatePromocionItemDto } from './create-promocion.dto';

export class UpdatePromocionDto {
  @IsString({ message: 'El código de promoción debe ser una cadena' })
  @IsOptional()
  @MaxLength(LIMITS.TEXT.CODE)
  codigo?: string;

  @IsString({ message: 'El nombre de la promoción debe ser una cadena' })
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NAME)
  nombre?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  descripcion?: string;

  @IsNumber({}, { message: 'El precio combo debe ser un valor numérico' })
  @Min(0, { message: 'El precio combo no puede ser negativo' })
  @IsOptional()
  precioCombo?: number;

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
