import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';

export class UpdatePricingDto {
  @IsUUID()
  @IsOptional()
  productoId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  equipoIds?: string[];

  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioRentaDia: number;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioDiaB?: number | null;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioDiaC?: number | null;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioRentaHora?: number | null;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioHoraB?: number | null;

  @IsNumber({ maxDecimalPlaces: 4 })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioHoraC?: number | null;
}
