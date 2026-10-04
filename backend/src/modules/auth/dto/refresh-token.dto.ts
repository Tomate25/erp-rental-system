import {
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';

export class RefreshTokenDto {
  @IsOptional()
  @IsString({ message: 'El refreshToken debe ser una cadena de texto' })
  @MaxLength(LIMITS.TEXT.TOKEN)
  refreshToken?: string;
}
