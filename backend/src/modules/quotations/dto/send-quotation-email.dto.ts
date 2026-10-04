import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';

export class SendQuotationEmailDto {
  @IsOptional()
  @IsEmail(
    {},
    { message: 'El correo de destino debe tener un formato válido.' },
  )
  @MaxLength(LIMITS.TEXT.EMAIL)
  emailDestino?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notasAdicionales?: string;
}
