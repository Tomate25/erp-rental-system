import { IsOptional, IsString, IsNumber, IsUUID, IsEnum } from 'class-validator';
import { EstadoEquipo } from './create-equipment.dto';

export class UpdateEquipmentDto {
  @IsString({ message: 'El modelo debe ser un texto' })
  @IsOptional()
  modelo?: string;

  @IsString({ message: 'El código debe ser un texto' })
  @IsOptional()
  codigo?: string;

  @IsString({ message: 'El número de serie debe ser un texto' })
  @IsOptional()
  numeroSerie?: string;

  @IsNumber({}, { message: 'La cantidad total debe ser un número' })
  @IsOptional()
  cantidadTotal?: number;

  @IsNumber({}, { message: 'La cantidad disponible debe ser un número' })
  @IsOptional()
  cantidadDisponible?: number;

  @IsUUID('4', { message: 'El ID de la categoría debe ser un UUID válido' })
  @IsOptional()
  categoriaId?: string;

  @IsUUID('4', { message: 'El ID de la marca debe ser un UUID válido' })
  @IsOptional()
  marcaId?: string;

  @IsNumber({}, { message: 'El precio de renta por día debe ser un número' })
  @IsOptional()
  precioRentaDia?: number;

  @IsNumber({}, { message: 'El horómetro debe ser un número' })
  @IsOptional()
  horometro?: number;

  @IsUUID('4', { message: 'El ID de la sucursal debe ser un UUID válido' })
  @IsOptional()
  sucursalId?: string;

  @IsString({ message: 'La descripción debe ser un texto' })
  @IsOptional()
  descripcion?: string;

  @IsEnum(EstadoEquipo, { message: 'El estado del equipo no es válido' })
  @IsOptional()
  estado?: EstadoEquipo;
}
