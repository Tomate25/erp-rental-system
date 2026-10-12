import { IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { CondicionPagoNota, OrigenNotaCxc, TipoNotaCxc } from '@prisma/client';

export class CreateNotaDto {
  @IsString()
  clienteId: string;

  @IsString()
  sucursalId: string;

  @IsEnum(TipoNotaCxc)
  tipoNota: TipoNotaCxc;

  @IsEnum(OrigenNotaCxc)
  origen: OrigenNotaCxc;

  @IsNumber()
  @Min(0.01)
  subtotal: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  iva?: number;

  @IsNumber()
  @Min(0.01)
  total: number;

  @IsString()
  concepto: string;

  @IsOptional()
  @IsEnum(CondicionPagoNota)
  condicionPago?: CondicionPagoNota;

  @IsOptional()
  @IsDateString()
  fechaVence?: string;

  @IsOptional()
  @IsString()
  moneda?: string; // 'NIO' | 'USD'

  @IsOptional()
  @IsNumber()
  @IsPositive()
  tipoCambioEmision?: number;

  @IsOptional()
  @IsString()
  devolucionId?: string;

  @IsOptional()
  @IsString()
  facturaReferenciaId?: string;
}
