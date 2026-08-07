import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @IsString({ message: 'El nombre del rol debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre del rol es requerido' })
  nombre: string;

  @IsString({ message: 'La descripción debe ser un texto' })
  @IsOptional()
  descripcion?: string;
}
