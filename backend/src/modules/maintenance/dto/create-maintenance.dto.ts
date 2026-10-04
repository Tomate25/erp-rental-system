import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';
import { TipoMantenimiento, EstadoMantenimiento } from '@prisma/client';

export class CreateMaintenanceDto {
  @IsUUID('4')
  @IsNotEmpty()
  equipoId: string;

  @IsEnum(TipoMantenimiento)
  @IsNotEmpty()
  tipo: TipoMantenimiento;

  @IsEnum(EstadoMantenimiento)
  @IsOptional()
  estado?: EstadoMantenimiento;

  @IsDateString({ strict: true })
  @IsNotEmpty()
  fechaProgramacion: string;

  @IsDateString({ strict: true })
  @IsOptional()
  fechaEjecucion?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Max(LIMITS.HOROMETRO_MAX)
  horometroServicio?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(LIMITS.TEXT.NOTES)
  descripcion: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Max(LIMITS.MONEY_MAX)
  costo?: number;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  insumosUtilizados?: string;
}
