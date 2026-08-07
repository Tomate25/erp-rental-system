import { IsArray, IsString } from 'class-validator';

export class UpdateUserRolesDto {
  @IsArray({ message: 'Los roles deben ser una lista de textos (IDs)' })
  @IsString({ each: true, message: 'Cada rol ID debe ser un texto' })
  rolIds: string[];
}
