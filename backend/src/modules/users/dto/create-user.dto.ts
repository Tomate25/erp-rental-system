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

export class CreateUserDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  @MaxLength(LIMITS.TEXT.EMAIL)
  email: string;

  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @MaxLength(LIMITS.TEXT.PASSWORD)
  password: string;

  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MaxLength(LIMITS.TEXT.NAME)
  nombre: string;

  @IsString({ message: 'El apellido debe ser un texto' })
  @IsNotEmpty({ message: 'El apellido es requerido' })
  @MaxLength(LIMITS.TEXT.NAME)
  apellido: string;

  @IsUUID('4', { message: 'El ID de la sucursal debe ser un UUID válido' })
  @IsOptional()
  sucursalId?: string;

  @IsArray({ message: 'Los roles deben ser una lista' })
  @IsString({ each: true, message: 'Cada rol debe ser un texto (ID o nombre)' })
  @ArrayMaxSize(20)
  @MaxLength(LIMITS.TEXT.NAME, { each: true })
  roles: string[]; // Arreglo de IDs de roles a asignar
}
