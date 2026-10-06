import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';
import { ModalidadRenta, TipoControlEquipo } from '@prisma/client';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SHORT)
  nombre?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.CODE)
  codigo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  descripcion?: string;

  @IsUUID()
  @IsOptional()
  categoriaId?: string;

  @IsUUID()
  @IsOptional()
  subcategoriaId?: string;

  @IsUUID()
  @IsOptional()
  marcaId?: string;

  @IsEnum(TipoControlEquipo)
  @IsOptional()
  tipoControl?: TipoControlEquipo;

  @IsEnum(ModalidadRenta, {
    message: 'La modalidad de renta no es válida',
  })
  @IsOptional()
  modalidadRenta?: ModalidadRenta;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioRentaDia?: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioDiaB?: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioDiaC?: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioRentaHora?: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioHoraB?: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioHoraC?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(1)
  @Max(LIMITS.HOURS_MAX)
  minimoHoras?: number;
}
