import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';

export class CreateRoleDto {
  @IsString({ message: 'El nombre del rol debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre del rol es requerido' })
  @MaxLength(LIMITS.TEXT.NAME)
  nombre: string;

  @IsString({ message: 'La descripción debe ser un texto' })
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SHORT)
  descripcion?: string;
}
