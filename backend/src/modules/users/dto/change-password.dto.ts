import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';

export class ChangePasswordDto {
  @IsString({ message: 'La contraseña actual debe ser un texto' })
  @IsNotEmpty({ message: 'La contraseña actual es requerida' })
  @MaxLength(LIMITS.TEXT.PASSWORD)
  oldPassword: string;

  @IsString({ message: 'La nueva contraseña debe ser un texto' })
  @MinLength(8, {
    message: 'La nueva contraseña debe tener al menos 8 caracteres',
  })
  @Matches(/[a-z]/, {
    message: 'La nueva contraseña debe incluir una letra minúscula',
  })
  @Matches(/[A-Z]/, {
    message: 'La nueva contraseña debe incluir una letra mayúscula',
  })
  @Matches(/\d/, { message: 'La nueva contraseña debe incluir un número' })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'La nueva contraseña debe incluir un carácter especial',
  })
  @MaxLength(LIMITS.TEXT.PASSWORD)
  newPassword: string;
}
