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
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TipoCobro } from '@prisma/client';

export class PublicQuotationItemDto {
  @IsString()
  @IsOptional()
  equipoId?: string;

  @IsString()
  @IsOptional()
  productoId?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser de al menos 1 unidad' })
  cantidad: number;

  @IsNumber({}, { message: 'Los días deben ser un número válido' })
  @Min(1, { message: 'El número de días debe ser de al menos 1' })
  @IsOptional()
  dias?: number;

  @IsEnum(TipoCobro, { message: 'Tipo de cobro no válido' })
  @IsOptional()
  tipoCobro?: TipoCobro;

  @IsString()
  @IsOptional()
  tipoTarifa?: string;

  @IsNumber({}, { message: 'Las horas deben ser un número válido' })
  @Min(1, { message: 'Las horas deben ser de al menos 1' })
  @IsOptional()
  horas?: number;
}

export class CreatePublicQuotationDto {
  @IsEmail(
    {},
    { message: 'Debe ingresar un correo electrónico de contacto válido' },
  )
  @IsNotEmpty({
    message: 'El correo electrónico es requerido para la cotización',
  })
  email: string;

  @IsString({ message: 'El nombre o persona de atención debe ser texto' })
  @IsNotEmpty({ message: 'El nombre de atención o contacto es requerido' })
  atencion: string;

  @IsString()
  @IsOptional()
  telefono?: string;

  @IsString()
  @IsOptional()
  proyecto?: string;

  @IsString()
  @IsOptional()
  empresaId?: string;

  @IsString()
  @IsOptional()
  sucursalId?: string;

  @IsInt({ message: 'La validez en días debe ser un número entero' })
  @Min(1, { message: 'La validez de la cotización debe ser de al menos 1 día' })
  @Max(60, {
    message: 'La validez de la cotización pública no puede exceder 60 días',
  })
  @IsOptional()
  validezDias?: number;

  @IsString()
  @IsOptional()
  condiciones?: string;

  @IsArray({ message: 'Debe especificar una lista de ítems a cotizar' })
  @ArrayMinSize(1, {
    message: 'Debe incluir al menos un ítem de maquinaria o producto',
  })
  @ValidateNested({ each: true })
  @Type(() => PublicQuotationItemDto)
  items: PublicQuotationItemDto[];
}
