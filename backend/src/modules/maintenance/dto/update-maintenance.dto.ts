import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  IsArray,
  ValidateNested,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoMantenimiento, EstadoMantenimiento } from '@prisma/client';

export class GastoReparacionDto {
  @IsBoolean()
  @IsOptional()
  cobrableCliente?: boolean;
  @IsIn(['REPUESTO', 'MANO_OBRA', 'TERCERO'])
  tipo: 'REPUESTO' | 'MANO_OBRA' | 'TERCERO';

  @IsString()
  descripcion: string;

  @IsNumber()
  @Min(0.01)
  monto: number;

  @IsString()
  @IsOptional()
  comprobanteUrl?: string;
}

export class UpdateMaintenanceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GastoReparacionDto)
  @IsOptional()
  gastos?: GastoReparacionDto[];
  @IsEnum(TipoMantenimiento)
  @IsOptional()
  tipo?: TipoMantenimiento;

  @IsEnum(EstadoMantenimiento)
  @IsOptional()
  estado?: EstadoMantenimiento;

  @IsDateString()
  @IsOptional()
  fechaProgramacion?: string;

  @IsDateString()
  @IsOptional()
  fechaEjecucion?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  horometroServicio?: number;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  costo?: number;

  @IsString()
  @IsOptional()
  insumosUtilizados?: string;
}
