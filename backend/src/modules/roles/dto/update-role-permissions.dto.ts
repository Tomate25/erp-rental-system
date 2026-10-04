import {
  ArrayMaxSize,
  IsArray,
  IsString,
  MaxLength,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';

export class UpdateRolePermissionsDto {
  @IsArray({ message: 'Los permisos deben ser una lista de textos (IDs)' })
  @IsString({ each: true, message: 'Cada permiso ID debe ser un texto' })
  @ArrayMaxSize(LIMITS.IDS_MAX)
  @MaxLength(LIMITS.TEXT.ID, { each: true })
  permisoIds: string[];
}
