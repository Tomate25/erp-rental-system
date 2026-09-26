import {
  IsArray,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  IsEnum,
  Min,
} from 'class-validator';
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
  fechaInicioRenta?: string;

  @IsString()
  @IsOptional()
  fechaFinRenta?: string;

  @IsString()
  @IsOptional()
  condiciones?: string;

  @IsString()
  @IsOptional()
  notasRevision?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  subtotal?: number;

  @IsNumber()
  @Min(0, { message: 'El descuento no puede ser negativo' })
  @IsOptional()
  descuento?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  iva?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  total?: number;

  @IsNumber()
  @Min(0, { message: 'El depósito en garantía no puede ser negativo' })
  @IsOptional()
  depositoGarantia?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  @IsOptional()
  items?: QuotationItemDto[];
}
