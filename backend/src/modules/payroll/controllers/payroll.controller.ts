import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { PayrollService } from '../services/payroll.service';
import {
  CreateEmpleadoDto,
  CreatePeriodoNominaDto,
  CreateNovedadNominaDto,
  CalcularPlanillaDto,
  CalcularLiquidacionDto,
  DevolverPlanillaDto,
  AnularPlanillaDto,
  FiltroHistorialPlanillasDto,
} from '../dto/payroll.dto';

@Controller('payroll')
@UseGuards(JwtAuthGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('seed-defaults')
  async seedDefaults(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    return this.payrollService.seedDefaultParameters(empresaId, usuarioId);
  }

  @Get('employees')
  async listEmployees(
    @GetUser('empresaId') empresaId: string,
    @Query('estado') estado?: any,
    @Query('sucursalId') sucursalId?: string,
  ) {
    return this.payrollService.listEmpleados(empresaId, { estado, sucursalId });
  }

  @Post('employees')
  async createEmployee(
    @GetUser('empresaId') empresaId: string,
    @Body() dto: CreateEmpleadoDto,
  ) {
    return this.payrollService.createEmpleado(empresaId, dto);
  }

  @Get('employees/:id/historial-pagos')
  async getHistorialPagosEmpleado(
    @GetUser('empresaId') empresaId: string,
    @Param('id') id: string,
  ) {
    return this.payrollService.getHistorialPagosEmpleado(empresaId, id);
  }

  @Get('employees/:id')
  async getEmployee(
    @GetUser('empresaId') empresaId: string,
    @Param('id') id: string,
  ) {
    return this.payrollService.getEmpleado(empresaId, id);
  }

  @Get('periods')
  async listPeriods(@GetUser('empresaId') empresaId: string) {
    return this.payrollService.listPeriodos(empresaId);
  }

  @Post('periods')
  async createPeriod(
    @GetUser('empresaId') empresaId: string,
    @Body() dto: CreatePeriodoNominaDto,
  ) {
    return this.payrollService.createPeriodo(empresaId, dto);
  }

  @Post('novedades')
  async createNovedad(
    @GetUser('empresaId') empresaId: string,
    @Body() dto: CreateNovedadNominaDto,
  ) {
    return this.payrollService.createNovedad(empresaId, dto);
  }

  @Get('planillas/historial')
  async getHistorialPlanillas(
    @GetUser('empresaId') empresaId: string,
    @Query() filtros: FiltroHistorialPlanillasDto,
  ) {
    return this.payrollService.getHistorialPlanillas(empresaId, filtros);
  }

  @Get('planillas/:id/bitacora')
  async getBitacoraPlanilla(
    @GetUser('empresaId') empresaId: string,
    @Param('id') id: string,
  ) {
    return this.payrollService.getBitacoraPlanilla(empresaId, id);
  }

  @Get('planillas/:id')
  async getPlanillaDetalle(
    @GetUser('empresaId') empresaId: string,
    @Param('id') id: string,
  ) {
    return this.payrollService.getPlanillaDetalle(empresaId, id);
  }

  @Post('planillas/calcular')
  async calcularPlanilla(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Body() dto: CalcularPlanillaDto,
  ) {
    return this.payrollService.calcularPlanilla(empresaId, dto, usuarioId);
  }

  @Post('planillas/:id/revisar')
  async revisarPlanilla(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Param('id') id: string,
  ) {
    return this.payrollService.revisarPlanilla(empresaId, id, usuarioId);
  }

  @Post('planillas/:id/devolver')
  async devolverPlanilla(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Param('id') id: string,
    @Body() dto: DevolverPlanillaDto,
  ) {
    return this.payrollService.devolverPlanilla(empresaId, id, usuarioId, dto.motivo);
  }

  @Post('planillas/:id/aprobar')
  async aprobarPlanilla(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Param('id') id: string,
  ) {
    return this.payrollService.aprobarPlanilla(empresaId, id, usuarioId);
  }

  @Post('planillas/:id/pagar')
  async marcarPagada(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Param('id') id: string,
  ) {
    return this.payrollService.marcarPagada(empresaId, id, usuarioId);
  }

  @Post('planillas/:id/anular')
  async anularPlanilla(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Param('id') id: string,
    @Body() dto: AnularPlanillaDto,
  ) {
    return this.payrollService.anularPlanilla(empresaId, id, usuarioId, dto.motivo);
  }

  @Post('liquidaciones')
  async liquidacionFinal(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Body() dto: CalcularLiquidacionDto,
  ) {
    return this.payrollService.liquidacionFinal(empresaId, dto, usuarioId);
  }

  @Get('colilla/:planillaEmpleadoId')
  async getColilla(
    @GetUser('empresaId') empresaId: string,
    @Param('planillaEmpleadoId') planillaEmpleadoId: string,
  ) {
    return this.payrollService.getColilla(empresaId, planillaEmpleadoId);
  }
}
