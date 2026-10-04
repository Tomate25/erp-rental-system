import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';

export class RegisterDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  @MaxLength(LIMITS.TEXT.EMAIL)
  email: string;

  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @MaxLength(LIMITS.TEXT.PASSWORD)
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MaxLength(LIMITS.TEXT.NAME)
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  @MaxLength(LIMITS.TEXT.NAME)
  apellido: string;

  @IsUUID('4', { message: 'El ID de la empresa debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de la empresa es requerido' })
  empresaId: string;

  @IsUUID('4', { message: 'El ID de la sucursal debe ser un UUID válido' })
  @IsOptional()
  sucursalId?: string;

  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @IsArray()
  @ArrayMaxSize(20)
  @MaxLength(LIMITS.TEXT.NAME, { each: true })
  roles: string[]; // Ej: ["ADMIN", "COMERCIAL"]
}
