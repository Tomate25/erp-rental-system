import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';

export class AjustarStockDto {
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(0.01, { message: 'La cantidad debe ser mayor que cero' })
  cantidad: number;

  @IsIn(['ENTRADA', 'SALIDA', 'AJUSTE_DIRECTO'], {
    message: 'El tipo de ajuste debe ser ENTRADA, SALIDA o AJUSTE_DIRECTO',
  })
  tipoAjuste: 'ENTRADA' | 'SALIDA' | 'AJUSTE_DIRECTO';

  @IsString({ message: 'El motivo del ajuste es obligatorio' })
  @IsNotEmpty({ message: 'El motivo del ajuste no puede estar vacío' })
  @MaxLength(LIMITS.TEXT.SHORT)
  motivo: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  costoUnitario?: number;
}
