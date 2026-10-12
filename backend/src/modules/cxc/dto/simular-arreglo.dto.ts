import { IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { FrecuenciaArreglo, MetodoAmortizacion } from '@prisma/client';

export class SimularArregloDto {
  @IsNumber()
  @Min(0.01)
  montoCapital: number;

  @IsNumber()
  @Min(0)
  tasaInteresAnual: number; // Porcentaje anual (ej: 12%)

  @IsNumber()
  @Min(0)
  porcentajeGastosAdmin: number; // Porcentaje administrativo (ej: 5%)

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
  @IsBoolean()
  aplicaIvaIntereses?: boolean;

  @IsOptional()
  @IsBoolean()
  aplicaIvaGastosAdmin?: boolean;
}
