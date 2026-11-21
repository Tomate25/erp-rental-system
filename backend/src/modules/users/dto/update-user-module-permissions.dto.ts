import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ERP_MODULE_IDS } from '../../auth/constants/modules.constant';
import type {
  ErpModuleId,
  ModuleAccessLevel,
} from '../../auth/constants/modules.constant';
import { LIMITS } from '../../../common/validation/dto-limits';

export class ModulePermissionItemDto {
  @IsString({ message: 'El identificador de módulo debe ser texto' })
  @IsIn([...ERP_MODULE_IDS], {
    message: 'El módulo especificado no existe en el sistema',
  })
  modulo: ErpModuleId;

  @IsString({ message: 'El nivel de acceso debe ser texto' })
  @IsIn(['LECTURA', 'ESCRITURA'], {
    message: 'El nivel de acceso debe ser LECTURA o ESCRITURA',
  })
  nivel: ModuleAccessLevel;
}

export class UpdateUserModulePermissionsDto {
  @IsBoolean({
    message: 'El indicador de permisos personalizados debe ser booleano',
  })
  personalizado: boolean;

  @IsArray({ message: 'Los permisos por módulo deben ser una lista' })
  @ArrayMaxSize(ERP_MODULE_IDS.length)
  @ValidateNested({ each: true })
  @Type(() => ModulePermissionItemDto)
  permisosModulos: ModulePermissionItemDto[];

  @IsOptional()
  @IsArray({ message: 'Los roles deben ser una lista de IDs' })
  @IsString({ each: true, message: 'Cada rol ID debe ser texto' })
  @ArrayMaxSize(20)
  @MaxLength(LIMITS.TEXT.ID, { each: true })
  rolIds?: string[];
}
