import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ModalidadSubarriendoProveedor } from '@prisma/client';
import { LIMITS } from '../../../common/validation/dto-limits';

export class NuevoEquipoExternoDto {
  @IsString({ message: 'El modelo/nombre de la maquinaria es requerido' })
  @IsNotEmpty({ message: 'El modelo/nombre de la maquinaria es requerido' })
  @MaxLength(LIMITS.TEXT.SHORT)
  modelo: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.CODE)
  codigo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.CODE)
  numeroSerie?: string;

  @IsUUID('4')
  @IsOptional()
  categoriaId?: string;

  @IsUUID('4')
  @IsOptional()
  marcaId?: string;

  @IsUUID('4')
  @IsOptional()
  sucursalId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  precioRentaDia?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  precioRentaHora?: number;
}

export class CreateSubarriendoDto {
  @IsUUID('4', { message: 'El equipo debe ser un UUID válido' })
  @IsOptional()
  equipoId?: string;

  @ValidateNested()
  @Type(() => NuevoEquipoExternoDto)
  @IsOptional()
  nuevoEquipo?: NuevoEquipoExternoDto;

  @IsUUID('4')
  @IsOptional()
  proveedorId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SHORT)
  proveedorNombre?: string;

  @IsEnum(ModalidadSubarriendoProveedor, {
    message: 'La modalidad de subarriendo no es válida',
  })
  @IsOptional()
  modalidad?: ModalidadSubarriendoProveedor;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'La tarifa del proveedor no puede ser negativa' })
  tarifaProveedor: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  cantidadUnidades?: number;

  @IsDateString({}, { message: 'La fecha de inicio es requerida' })
  fechaInicio: string;

  @IsDateString({}, { message: 'La fecha fin estimada es requerida' })
  fechaFinEstimada: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  duracionEstimadaValor?: number;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.CODE)
  referenciaDocumento?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  observaciones?: string;
}
