import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';

export class UpdateReglaComisionDto {
  @IsUUID('4', { message: 'El usuario debe tener un ID válido' })
  @IsOptional()
  usuarioId?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NAME)
  nombreVendedor?: string | null;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Max(LIMITS.MONEY_MAX)
  montoMinimo?: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Max(LIMITS.MONEY_MAX)
  montoMaximo?: number | null;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Max(LIMITS.PERCENT_MAX)
  porcentaje?: number;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
