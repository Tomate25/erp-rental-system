import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import {
  AreaContableNomina,
  TipoContratoNomina,
  TipoSalarioNomina,
  MetodoIrNomina,
  FrecuenciaPagoNomina,
  TipoPeriodoNomina,
  OrigenNovedadNomina,
} from '@prisma/client';

export class CreateEmpleadoDto {
  @IsString()
  @IsNotEmpty()
  codigo: string;

  @IsString()
  @IsNotEmpty()
  nombres: string;

  @IsString()
  @IsNotEmpty()
  apellidos: string;

  @IsString()
  @IsNotEmpty()
  cedula: string;

  @IsString()
  @IsNotEmpty()
  numeroInss: string;

  @IsOptional()
  @IsString()
  ruc?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsString()
  @IsNotEmpty()
  sucursalId: string;

  @IsOptional()
  @IsString()
  centroCostoId?: string;

  @IsEnum(AreaContableNomina)
  areaContable: AreaContableNomina;

  @IsString()
  @IsNotEmpty()
  cargo: string;

  @IsOptional()
  @IsEnum(TipoContratoNomina)
  tipoContrato?: TipoContratoNomina = TipoContratoNomina.INDETERMINADO;

  @IsString()
  @IsNotEmpty()
  fechaIngreso: string;

  @IsOptional()
  @IsEnum(TipoSalarioNomina)
  tipoSalario?: TipoSalarioNomina = TipoSalarioNomina.FIJO;

  @IsOptional()
  @IsEnum(MetodoIrNomina)
  metodoIr?: MetodoIrNomina = MetodoIrNomina.FIJO;

  @IsOptional()
  @IsEnum(FrecuenciaPagoNomina)
  frecuenciaPago?: FrecuenciaPagoNomina = FrecuenciaPagoNomina.QUINCENAL;

  @IsNumber()
  @Min(0)
  salarioMensual: number;

  @IsOptional()
  @IsString()
  bancoNombre?: string;

  @IsOptional()
  @IsString()
  numeroCuenta?: string;
}

export class CreatePeriodoNominaDto {
  @IsInt()
  anio: number;

  @IsInt()
  mes: number;

  @IsOptional()
  @IsInt()
  quincena?: number;

  @IsOptional()
  @IsEnum(TipoPeriodoNomina)
  tipo?: TipoPeriodoNomina = TipoPeriodoNomina.ORDINARIA;

  @IsString()
  @IsNotEmpty()
  fechaInicio: string;

  @IsString()
  @IsNotEmpty()
  fechaFin: string;

  @IsString()
  @IsNotEmpty()
  fechaPago: string;
}

export class CreateNovedadNominaDto {
  @IsString()
  @IsNotEmpty()
  empleadoId: string;

  @IsString()
  @IsNotEmpty()
  periodoDestinoId: string;

  @IsString()
  @IsNotEmpty()
  conceptoCodigo: string;

  @IsOptional()
  @IsNumber()
  cantidad?: number;

  @IsNumber()
  monto: number;

  @IsOptional()
  @IsEnum(OrigenNovedadNomina)
  origen?: OrigenNovedadNomina = OrigenNovedadNomina.MANUAL;

  @IsOptional()
  @IsString()
  referenciaId?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class CalcularPlanillaDto {
  @IsString()
  @IsNotEmpty()
  periodoId: string;

  @IsOptional()
  @IsString()
  sucursalId?: string;
}

export class AprobarPlanillaDto {
  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class CalcularLiquidacionDto {
  @IsString()
  @IsNotEmpty()
  empleadoId: string;

  @IsString()
  @IsNotEmpty()
  fechaBaja: string;

  @IsString()
  @IsNotEmpty()
  causa: string;

  @IsBoolean()
  pagaIndemnizacion: boolean;

  @IsOptional()
  @IsNumber()
  diasPendientes?: number;

  @IsOptional()
  @IsNumber()
  diasVacacionesPendientes?: number;

  @IsOptional()
  @IsNumber()
  mesesAguinaldo?: number;

  @IsOptional()
  @IsNumber()
  deduccionPrestamos?: number;

  @IsOptional()
  @IsNumber()
  deduccionOtras?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}

export class DevolverPlanillaDto {
  @IsString()
  @IsNotEmpty()
  motivo: string;
}

export class AnularPlanillaDto {
  @IsString()
  @IsNotEmpty()
  motivo: string;
}

export class FiltroHistorialPlanillasDto {
  @IsOptional()
  anio?: number;

  @IsOptional()
  mes?: number;

  @IsOptional()
  estado?: string;
}

export class InssParamDto {
  @IsNumber()
  @Min(0)
  tasaLaboral: number;

  @IsNumber()
  @Min(0)
  tasaPatronal: number;

  @IsOptional()
  @IsNumber()
  techoMensual?: number | null;

  @IsOptional()
  @IsString()
  tamanoEmpleador?: string;

  @IsOptional()
  @IsString()
  fuenteTexto?: string;

  @IsOptional()
  @IsString()
  fuenteUrl?: string;
}

export class InatecParamDto {
  @IsNumber()
  @Min(0)
  tasa: number;

  @IsOptional()
  @IsString()
  fuenteTexto?: string;

  @IsOptional()
  @IsString()
  fuenteUrl?: string;
}

export class IrTramoDto {
  @IsInt()
  orden: number;

  @IsNumber()
  @Min(0)
  desdeExcl: number;

  @IsOptional()
  @IsNumber()
  hastaIncl?: number | null;

  @IsNumber()
  @Min(0)
  impuestoBase: number;

  @IsNumber()
  @Min(0)
  porcentaje: number;

  @IsNumber()
  @Min(0)
  sobreExceso: number;

  @IsOptional()
  @IsString()
  fuenteTexto?: string;
}

export class UpdateParametrosNominaDto {
  @IsOptional()
  inss?: InssParamDto;

  @IsOptional()
  inatec?: InatecParamDto;

  @IsOptional()
  irTramos?: IrTramoDto[];
}

