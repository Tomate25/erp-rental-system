import {
  ArrayMaxSize,
  IsArray,
  IsString,
  MaxLength,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';

export class UpdateUserRolesDto {
  @IsArray({ message: 'Los roles deben ser una lista de textos (IDs)' })
  @IsString({ each: true, message: 'Cada rol ID debe ser un texto' })
  @ArrayMaxSize(20)
  @MaxLength(LIMITS.TEXT.ID, { each: true })
  rolIds: string[];
}
