import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoCotizacion, TipoCobro } from '@prisma/client';

export class QuotationItemDto {
  @IsString()
  @IsOptional()
  equipoId?: string;

  @IsString()
  @IsOptional()
  productoId?: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsInt()
  @Min(1, { message: 'La cantidad debe ser de al menos 1 unidad' })
  cantidad: number;

  @IsNumber()
  @Min(1, { message: 'El número de días debe ser de al menos 1' })
  dias: number;

  @IsEnum(TipoCobro)
  @IsOptional()
  tipoCobro?: TipoCobro;

  @IsString()
  @IsOptional()
  tipoTarifa?: string;

  @IsNumber()
  @Min(1, { message: 'Las horas deben ser de al menos 1' })
  @IsOptional()
  horas?: number;

  @IsNumber()
  @Min(0, { message: 'El precio unitario no puede ser negativo' })
  @IsOptional()
  precioUnitario?: number;

  @IsNumber()
  @Min(0, { message: 'El descuento no puede ser negativo' })
  @IsOptional()
  descuento?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  subtotal?: number;
}

export class CreateQuotationDto {
  @IsEnum(EstadoCotizacion)
  @IsOptional()
  estado?: EstadoCotizacion;

  @IsString()
  @IsOptional()
  notasRevision?: string;

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
  @Min(1)
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
  @ArrayMinSize(1, { message: 'La cotización debe contener al menos un ítem' })
  @ValidateNested({ each: true })
  @Type(() => QuotationItemDto)
  items: QuotationItemDto[];
}
