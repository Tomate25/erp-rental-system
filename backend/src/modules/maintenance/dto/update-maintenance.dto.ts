import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';
import { Type } from 'class-transformer';
import { TipoMantenimiento, EstadoMantenimiento } from '@prisma/client';

export class GastoReparacionDto {
  @IsBoolean()
  @IsOptional()
  cobrableCliente?: boolean;
  @IsIn(['REPUESTO', 'MANO_OBRA', 'TERCERO'])
  tipo: 'REPUESTO' | 'MANO_OBRA' | 'TERCERO';

  @IsString()
  @MaxLength(LIMITS.TEXT.SHORT)
  descripcion: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(LIMITS.MONEY_MAX)
  monto: number;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.URL)
  comprobanteUrl?: string;
}

export class UpdateMaintenanceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GastoReparacionDto)
  @IsOptional()
  @ArrayMaxSize(LIMITS.ITEMS_MAX)
  gastos?: GastoReparacionDto[];
  @IsEnum(TipoMantenimiento)
  @IsOptional()
  tipo?: TipoMantenimiento;

  @IsEnum(EstadoMantenimiento)
  @IsOptional()
  estado?: EstadoMantenimiento;

  @IsDateString({ strict: true })
  @IsOptional()
  fechaProgramacion?: string;

  @IsDateString({ strict: true })
  @IsOptional()
  fechaEjecucion?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Max(LIMITS.HOROMETRO_MAX)
  horometroServicio?: number;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  descripcion?: string;

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
