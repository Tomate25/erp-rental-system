import { IsArray, IsEmail, IsNumber, IsOptional, IsString, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoCotizacion } from '@prisma/client';
import { QuotationItemDto } from './create-quotation.dto';

export class UpdateQuotationDto {
  @IsEnum(EstadoCotizacion)
  @IsOptional()
  estado?: EstadoCotizacion;

  @IsString()
  @IsOptional()
  clienteId?: string;

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
  @IsOptional()
  subtotal?: number;

  @IsNumber()
  @IsOptional()
  descuento?: number;

  @IsNumber()
  @IsOptional()
  iva?: number;

  @IsNumber()
  @IsOptional()
  total?: number;

  @IsNumber()
  @IsOptional()
  depositoGarantia?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  @IsOptional()
  items?: QuotationItemDto[];
}
