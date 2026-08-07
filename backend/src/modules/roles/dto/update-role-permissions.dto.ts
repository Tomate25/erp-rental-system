import { IsArray, IsString } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsArray({ message: 'Los permisos deben ser una lista de textos (IDs)' })
  @IsString({ each: true, message: 'Cada permiso ID debe ser un texto' })
  permisoIds: string[];
}
