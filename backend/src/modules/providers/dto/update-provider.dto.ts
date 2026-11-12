import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TipoProveedor } from '@prisma/client';
import { LIMITS } from '../../../common/validation/dto-limits';

export class UpdateProviderDto {
  @IsString({ message: 'El nombre comercial del proveedor debe ser un texto' })
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SHORT)
  nombre?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SHORT)
  razonSocial?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.PHONE)
  identificacion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.PHONE)
  telefono?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.EMAIL)
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.ADDRESS)
  direccion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SHORT)
  contacto?: string;

  @IsEnum(TipoProveedor, { message: 'El tipo de proveedor no es válido' })
  @IsOptional()
  tipo?: TipoProveedor;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.CODE)
  condicionPago?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  plazoCreditoDias?: number;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  notas?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
