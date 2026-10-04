import {
  IsNumber,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';

export class CalculateCommissionDto {
  @IsUUID('4', { message: 'El usuario debe tener un ID válido' })
  usuarioId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(LIMITS.MONEY_MAX)
  montoVentas: number;
}
