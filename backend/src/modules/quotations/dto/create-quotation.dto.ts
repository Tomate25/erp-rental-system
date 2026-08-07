import { IsArray, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoCotizacion } from '@prisma/client';

export class QuotationItemDto {
  @IsString()
  @IsOptional()
  equipoId?: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsNumber()
  cantidad: number;

  @IsNumber()
  dias: number;

  @IsNumber()
  precioUnitario: number;

  @IsNumber()
  @IsOptional()
  descuento?: number;

  @IsNumber()
  subtotal: number;
}

export class CreateQuotationDto {
  @IsEnum(EstadoCotizacion)
  @IsOptional()
  estado?: EstadoCotizacion;

  @IsString()
  @IsNotEmpty()
  clienteId: string;

  @IsString()
  @IsOptional()
  proyecto?: string;

  @IsString()
  @IsOptional()
  atencion?: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  referencia?: string;

  @IsString()
  @IsOptional()
  asesorId?: string;

  @IsNumber()
  @IsOptional()
  validezDias?: number;

  @IsString()
  @IsOptional()
  condiciones?: string;

  @IsNumber()
  subtotal: number;

  @IsNumber()
  @IsOptional()
  descuento?: number;

  @IsNumber()
  iva: number;

  @IsNumber()
  total: number;

  @IsNumber()
  @IsOptional()
  depositoGarantia?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items: QuotationItemDto[];
}
