import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { LIMITS } from '../../../common/validation/dto-limits';

export class CreateCategoriaInsumoDto {
  @IsString({ message: 'El nombre de la categoría es obligatorio' })
  @IsNotEmpty({ message: 'El nombre de la categoría no puede estar vacío' })
  @MaxLength(LIMITS.TEXT.NAME)
  nombre: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.NOTES)
  descripcion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(LIMITS.TEXT.CODE)
  color?: string;
}
