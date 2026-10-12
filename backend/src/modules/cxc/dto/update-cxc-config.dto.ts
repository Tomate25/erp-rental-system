import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MetodoAmortizacion } from '@prisma/client';

export class UpdateCxcConfigDto {
  @IsOptional()
  @IsArray()
  tramosAntiguedadJson?: Array<{ id: string; nombre: string; min: number; max: number }>;

  @IsOptional()
  @IsEnum(MetodoAmortizacion)
  metodoAmortizacionDefault?: MetodoAmortizacion;

  @IsOptional()
  @IsString()
  rolAprobacionArreglo?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  diasGraciaAlertaMora?: number;

  @IsOptional()
  @IsBoolean()
  aplicaIvaIntereses?: boolean;

  @IsOptional()
  @IsNumber()
  tasaIvaIntereses?: number;

  @IsOptional()
  @IsBoolean()
  aplicaIvaGastosAdmin?: boolean;

  @IsOptional()
  @IsNumber()
  tasaIvaGastosAdmin?: number;

  @IsOptional()
  @IsBoolean()
  serieReciboPorSucursal?: boolean;

  @IsOptional()
  @IsBoolean()
  aplicaRetencionImi?: boolean;

  @IsOptional()
  @IsNumber()
  tasaRetencionIrDefault?: number;

  @IsOptional()
  @IsNumber()
  tasaRetencionImiDefault?: number;

  @IsOptional()
  @IsBoolean()
  comisionesSoloFacturasPagadas?: boolean;

  @IsOptional()
  @IsString()
  cuentaMayorClientes?: string;

  @IsOptional()
  @IsString()
  cuentaAnticiposClientes?: string;

  @IsOptional()
  @IsString()
  cuentaInteresesMoratorios?: string;

  @IsOptional()
  @IsString()
  cuentaGastosAdministrativos?: string;

  @IsOptional()
  @IsString()
  cuentaRetencionIrFavor?: string;

  @IsOptional()
  @IsString()
  cuentaRetencionImiFavor?: string;
}
