import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';
import { EstadoEquipo } from './create-equipment.dto';
import {
  ModalidadRenta,
  TipoControlEquipo,
  TipoMedicionCombustible,
} from '@prisma/client';

export class UpdateEquipmentDto {
  @IsString({ message: 'El modelo debe ser un texto' })
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SHORT)
  modelo?: string;

  @IsString({ message: 'El código debe ser un texto' })
  @IsOptional()
  @MaxLength(LIMITS.TEXT.CODE)
  codigo?: string;

  @IsString({ message: 'El número de serie debe ser un texto' })
  @IsOptional()
  @MaxLength(LIMITS.TEXT.SERIAL)
  numeroSerie?: string;

  @IsInt({ message: 'La cantidad total debe ser un número' })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.STOCK_MAX)
  cantidadTotal?: number;

  @IsInt({ message: 'La cantidad disponible debe ser un número' })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.STOCK_MAX)
  cantidadDisponible?: number;

  @IsUUID('4', { message: 'El ID de la categoría debe ser un UUID válido' })
  @IsOptional()
  categoriaId?: string;

  @IsUUID('4', { message: 'El ID de la subcategoría debe ser un UUID válido' })
  @IsOptional()
  subcategoriaId?: string;

  @IsUUID('4', { message: 'El ID de la marca debe ser un UUID válido' })
  @IsOptional()
  marcaId?: string;

  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'El precio de renta por día debe ser un número' })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioRentaDia?: number;

  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'El precio de renta por día B debe ser un número' })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioDiaB?: number;

  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'El precio de renta por día C debe ser un número' })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioDiaC?: number;

  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'El precio de renta por hora debe ser un número' })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioRentaHora?: number;

  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'El precio de renta por hora B debe ser un número' })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioHoraB?: number;

  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'El precio de renta por hora C debe ser un número' })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.UNIT_PRICE_MAX)
  precioHoraC?: number;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El mínimo de horas debe ser un número' })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.HOURS_MAX)
  minimoHoras?: number;

  @IsEnum(TipoControlEquipo, { message: 'El tipo de control no es válido' })
  @IsOptional()
  tipoControl?: TipoControlEquipo;

  @IsEnum(ModalidadRenta, {
    message: 'La modalidad de renta no es válida',
  })
  @IsOptional()
  modalidadRenta?: ModalidadRenta;

  @IsEnum(TipoMedicionCombustible, {
    message: 'El tipo de medición de combustible no es válido',
  })
  @IsOptional()
  tipoMedicionCombustible?: TipoMedicionCombustible | null;

  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El costo de adquisición debe ser un número' })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.MONEY_MAX)
  costoAdquisicion?: number;

  @IsDateString(
    { strict: true },
    { message: 'La fecha de adquisición debe ser una fecha válida' },
  )
  @IsOptional()
  fechaAdquisicion?: string;

  @IsNumber({}, { message: 'El horómetro debe ser un número' })
  @IsOptional()
  @Min(0)
  @Max(LIMITS.HOROMETRO_MAX)
  horometro?: number;

  @IsBoolean({ message: 'tieneHorometro debe ser booleano' })
  @IsOptional()
  tieneHorometro?: boolean;

  @IsUUID('4', { message: 'El ID de la sucursal debe ser un UUID válido' })
  @IsOptional()
  sucursalId?: string;

  @IsString({ message: 'La descripción debe ser un texto' })
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  descripcion?: string;

  @IsEnum(EstadoEquipo, { message: 'El estado del equipo no es válido' })
  @IsOptional()
  estado?: EstadoEquipo;
}
