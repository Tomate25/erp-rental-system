import { IsOptional, IsString, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';
import { TipoMantenimiento, EstadoMantenimiento } from '@prisma/client';

export class UpdateMaintenanceDto {
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
