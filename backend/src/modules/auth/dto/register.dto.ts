import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty({ message: 'El correo electrónico es requerido' })
  email: string;

  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'El nombre es requerido' })
  nombre: string;

  @IsString()
  @IsNotEmpty({ message: 'El apellido es requerido' })
  apellido: string;

  @IsUUID('4', { message: 'El ID de la empresa debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de la empresa es requerido' })
  empresaId: string;

  @IsUUID('4', { message: 'El ID de la sucursal debe ser un UUID válido' })
  @IsOptional()
  sucursalId?: string;

  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  roles: string[]; // Ej: ["ADMIN", "COMERCIAL"]
}
