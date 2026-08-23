import { IsNotEmpty, IsOptional, IsString, IsUUID, IsNumber, IsEnum, IsDateString, Min } from 'class-validator';
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

  @IsDateString()
  @IsNotEmpty()
  fechaProgramacion: string;

  @IsDateString()
  @IsOptional()
  fechaEjecucion?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  horometroServicio?: number;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  costo?: number;

  @IsString()
  @IsOptional()
  insumosUtilizados?: string;
}
