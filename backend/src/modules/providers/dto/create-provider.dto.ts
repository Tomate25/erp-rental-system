import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { TipoProveedor } from '@prisma/client';
import { LIMITS } from '../../../common/validation/dto-limits';

export class CreateProviderDto {
  @IsString({ message: 'El nombre comercial del proveedor es requerido' })
  @IsNotEmpty({ message: 'El nombre comercial del proveedor es requerido' })
  @MaxLength(LIMITS.TEXT.SHORT)
  nombre: string;

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
  @MaxLength(LIMITS.TEXT.OBSERVATIONS)
  notas?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;
}
