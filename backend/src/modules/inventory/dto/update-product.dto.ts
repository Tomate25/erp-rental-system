import { IsString, IsOptional, IsNumber, IsEnum, IsUUID, Min } from 'class-validator';
import { TipoControlEquipo } from '@prisma/client';

export class UpdateProductDto {
  @IsString()
  @IsOptional()
  nombre?: string;

  @IsString()
  @IsOptional()
  codigo?: string;

  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsUUID()
  @IsOptional()
  categoriaId?: string;

  @IsUUID()
  @IsOptional()
  subcategoriaId?: string;

  @IsUUID()
  @IsOptional()
  marcaId?: string;

  @IsEnum(TipoControlEquipo)
  @IsOptional()
  tipoControl?: TipoControlEquipo;

  @IsNumber()
  @IsOptional()
  @Min(0)
  precioRentaDia?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  precioRentaHora?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  minimoHoras?: number;
}
