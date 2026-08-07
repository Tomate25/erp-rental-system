import { IsNotEmpty, IsOptional, IsString, IsNumber, IsUUID, IsEnum } from 'class-validator';

export enum EstadoEquipo {
  DISPONIBLE = 'DISPONIBLE',
  RESERVADO = 'RESERVADO',
  RENTADO = 'RENTADO',
  RETORNO = 'RETORNO',
  MANTENIMIENTO = 'MANTENIMIENTO',
  BAJA = 'BAJA',
}

export class CreateEquipmentDto {
  @IsString({ message: 'El modelo debe ser un texto' })
  @IsNotEmpty({ message: 'El modelo es requerido' })
  modelo: string;

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
  @IsNotEmpty({ message: 'La categoría es requerida' })
  categoriaId: string;

  @IsUUID('4', { message: 'El ID de la marca debe ser un UUID válido' })
  @IsNotEmpty({ message: 'La marca es requerida' })
  marcaId: string;

  @IsNumber({}, { message: 'El precio de renta por día debe ser un número' })
  @IsNotEmpty({ message: 'El precio de renta por día es requerido' })
  precioRentaDia: number;

  @IsNumber({}, { message: 'El horómetro debe ser un número de horas' })
  @IsOptional()
  horometro?: number;

  @IsUUID('4', { message: 'El ID de la sucursal debe ser un UUID válido' })
  @IsNotEmpty({ message: 'La sucursal de asignación es requerida' })
  sucursalId: string;

  @IsString({ message: 'La descripción debe ser un texto' })
  @IsOptional()
  descripcion?: string;

  @IsEnum(EstadoEquipo, { message: 'El estado del equipo no es válido' })
  @IsOptional()
  estado?: EstadoEquipo;
}
