import { IsNumber, IsUUID, Min } from 'class-validator';

export class CalculateCommissionDto {
  @IsUUID('4', { message: 'El usuario debe tener un ID válido' })
  usuarioId: string;

  @IsNumber()
  @Min(0)
  montoVentas: number;
}
