import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LIMITS } from '../../../common/validation/dto-limits';

export class DevolverSubarriendoDto {
  @IsDateString()
  @IsOptional()
  fechaDevolucionReal?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  montoFinal?: number;

  @IsBoolean()
  @IsOptional()
  deshabilitarParaRenta?: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  observaciones?: string;
}
