import { IsDateString, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateTipoCambioDto {
  @IsDateString()
  fecha: string;

  @IsNumber()
  @IsPositive()
  tasa: number;

  @IsOptional()
  @IsString()
  fuente?: string;
}
