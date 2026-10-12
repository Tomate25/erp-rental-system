import { IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MetodoPagoRecibo, TipoDocAplicacionCxc } from '@prisma/client';

export class AplicacionItemDto {
  @IsEnum(TipoDocAplicacionCxc)
  tipoDocumento: TipoDocAplicacionCxc;

  @IsString()
  documentoId: string; // facturaId, notaDebitoId o cuotaArregloId

  @IsNumber()
  @Min(0.01)
  montoAplicar: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  retencionIr?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  retencionImi?: number;
}

export class CreateReciboCajaDto {
  @IsString()
  clienteId: string;

  @IsString()
  sucursalId: string;

  @IsDateString()
  fechaRecibo: string;

  @IsOptional()
  @IsString()
  moneda?: string; // 'NIO' | 'USD'

  @IsOptional()
  @IsNumber()
  @IsPositive()
  tipoCambioBcn?: number;

  @IsNumber()
  @Min(0)
  montoEfectivoBancos: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montoRetencionIr?: number;

  @IsOptional()
  @IsString()
  noConstanciaRetencionIr?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montoRetencionImi?: number;

  @IsOptional()
  @IsString()
  noConstanciaRetencionImi?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otrasRetenciones?: number;

  @IsEnum(MetodoPagoRecibo)
  metodoPago: MetodoPagoRecibo;

  @IsOptional()
  @IsString()
  banco?: string;

  @IsOptional()
  @IsString()
  numeroTransferenciaReferencia?: string;

  @IsOptional()
  @IsString()
  concepto?: string;

  @IsOptional()
  @IsBoolean()
  aplicarAutoFifo?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AplicacionItemDto)
  aplicaciones?: AplicacionItemDto[];
}
