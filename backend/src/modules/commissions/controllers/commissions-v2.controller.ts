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
import { CommissionsV2Service } from '../services/commissions-v2.service';
import {
  AssignPlanDto,
  CreatePlanComisionDto,
  SimuladorDto,
  SolicitarAjusteDto,
} from '../dto/comisiones-v2.dto';

@Controller('commissions/v2')
@UseGuards(JwtAuthGuard)
export class CommissionsV2Controller {
  constructor(private readonly commissionsV2Service: CommissionsV2Service) {}

  @Post('seed-defaults')
  async seedDefaults(@GetUser('empresaId') empresaId: string, @GetUser('id') usuarioId: string) {
    return this.commissionsV2Service.seedDefaultPlans(empresaId, usuarioId);
  }

  @Get('planes')
  async getPlanes(@GetUser('empresaId') empresaId: string) {
    return this.commissionsV2Service.getPlanes(empresaId);
  }

  @Post('planes')
  async createPlan(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Body() dto: CreatePlanComisionDto,
  ) {
    return this.commissionsV2Service.createPlan(empresaId, dto, usuarioId);
  }

  @Post('asignar')
  async assignPlan(
    @GetUser('empresaId') empresaId: string,
    @Body() dto: AssignPlanDto,
  ) {
    return this.commissionsV2Service.assignPlanToVendedor(empresaId, dto);
  }

  @Post('periodo')
  async getOrCreatePeriodo(
    @GetUser('empresaId') empresaId: string,
    @Body('anio') anio: number,
    @Body('mes') mes: number,
  ) {
    return this.commissionsV2Service.getOrCreatePeriodo(empresaId, Number(anio), Number(mes));
  }

  @Post('liquidar')
  async generarLiquidacion(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Body('periodoId') periodoId: string,
    @Body('vendedorId') vendedorId: string,
  ) {
    return this.commissionsV2Service.generarLiquidacion(empresaId, periodoId, vendedorId, usuarioId);
  }

  @Post('liquidaciones/:id/revisar')
  async marcarRevisado(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Param('id') id: string,
  ) {
    return this.commissionsV2Service.marcarRevisado(empresaId, id, usuarioId);
  }

  @Post('liquidaciones/:id/aprobar')
  async aprobarLiquidacion(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Param('id') id: string,
  ) {
    return this.commissionsV2Service.aprobarLiquidacion(empresaId, id, usuarioId);
  }

  @Post('liquidaciones/:id/ajustes')
  async solicitarAjuste(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Param('id') liquidacionId: string,
    @Body() dto: SolicitarAjusteDto,
  ) {
    return this.commissionsV2Service.solicitarAjuste(empresaId, liquidacionId, dto, usuarioId);
  }

  @Post('ajustes/:id/aprobar')
  async aprobarAjuste(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Param('id') ajusteId: string,
  ) {
    return this.commissionsV2Service.aprobarAjuste(empresaId, ajusteId, usuarioId);
  }

  @Post('simulador')
  simulador(@Body() dto: SimuladorDto) {
    return this.commissionsV2Service.simulador(dto);
  }
}
