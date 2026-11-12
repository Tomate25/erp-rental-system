import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';

export class RegistrarMovimientoDto {
  @IsString({ message: 'El insumo es obligatorio' })
  @IsNotEmpty({ message: 'El insumo no puede estar vacío' })
  insumoId: string;

  @IsIn(['ENTRADA', 'SALIDA', 'AJUSTE'], {
    message: 'El tipo de movimiento debe ser ENTRADA, SALIDA o AJUSTE',
  })
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';

  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(0.01, { message: 'La cantidad debe ser mayor que cero' })
  cantidad: number;

  @IsString({ message: 'El motivo del movimiento es obligatorio' })
  @IsNotEmpty({ message: 'El motivo del movimiento no puede estar vacío' })
  @MaxLength(LIMITS.TEXT.SHORT)
  motivo: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SHORT)
  destino?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SHORT)
  referencia?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  costoUnitario?: number;
}
