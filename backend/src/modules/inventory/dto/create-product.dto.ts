import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsUUID,
  Min,
} from 'class-validator';
import { ModalidadRenta, TipoControlEquipo } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  nombre: string;

  @IsString()
  @IsOptional()
  codigo?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsUUID()
  categoriaId: string;

  @IsUUID()
  @IsOptional()
  subcategoriaId?: string;

  @IsUUID()
  marcaId: string;

  @IsEnum(TipoControlEquipo)
  @IsOptional()
  tipoControl?: TipoControlEquipo;

  @IsEnum(ModalidadRenta, {
    message: 'La modalidad de renta no es válida',
  })
  @IsOptional()
  modalidadRenta?: ModalidadRenta;

  @IsNumber()
  @Min(0)
  precioRentaDia: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  precioRentaHora?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  minimoHoras?: number;
}
