import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, IsArray, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  nombre: string;

  @IsString({ message: 'El apellido debe ser un texto' })
  @IsNotEmpty({ message: 'El apellido es requerido' })
  apellido: string;

  @IsUUID('4', { message: 'El ID de la sucursal debe ser un UUID válido' })
  @IsOptional()
  sucursalId?: string;

  @IsArray({ message: 'Los roles deben ser una lista' })
  @IsString({ each: true, message: 'Cada rol debe ser un texto (ID o nombre)' })
  roles: string[]; // Arreglo de IDs de roles a asignar
}
