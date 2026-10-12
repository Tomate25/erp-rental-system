import { IsArray, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { FrecuenciaArreglo, MetodoAmortizacion } from '@prisma/client';

export class CreateArregloPagoDto {
  @IsString()
  clienteId: string;

  @IsString()
  sucursalId: string;

  @IsArray()
  @IsString({ each: true })
  facturasIds: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notasDebitoIds?: string[];

  @IsNumber()
  @Min(0)
  porcentajeGastosAdmin: number;

  @IsNumber()
  @Min(0)
  tasaInteresAnual: number;

  @IsInt()
  @Min(1)
  numeroCuotas: number;

  @IsEnum(FrecuenciaArreglo)
  frecuencia: FrecuenciaArreglo;

  @IsDateString()
  fechaPrimeraCuota: string;

  @IsOptional()
  @IsEnum(MetodoAmortizacion)
  metodoAmortizacion?: MetodoAmortizacion;

  @IsOptional()
  @IsNumber()
  @Min(0)
  penalidadIncumplimientoUsd?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
