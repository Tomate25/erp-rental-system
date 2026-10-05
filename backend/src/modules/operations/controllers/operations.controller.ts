import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { OperationsService } from '../services/operations.service';
import {
  CreateDespachoDto,
  CreateRetornoDto,
  CreateSolicitudDespachoDto,
  ScheduleSolicitudDespachoDto,
  CreateSolicitudRetornoDto,
  UpdateEstadoSolicitudDto,
  SeleccionarDestinoCreditoDto,
} from '../dto/create-operations.dto';
import { EstadoSolicitudOperativa } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('operations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  // --- SOLICITUDES DE DESPACHO ---

  @Post('solicitudes-despacho')
  @Roles('ADMIN', 'GERENTE', 'OPERACIONES', 'COMERCIAL')
  async createSolicitudDespacho(
    @Body() dto: CreateSolicitudDespachoDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.operationsService.createSolicitudDespacho(
      dto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Solicitud de despacho registrada exitosamente',
      data,
    };
  }

  @Get('solicitudes-despacho')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'MANTENIMIENTO')
  async findAllSolicitudesDespacho(
    @GetUser('empresaId') empresaId: string,
    @Query('estado') estado?: EstadoSolicitudOperativa,
  ) {
    const data = await this.operationsService.findAllSolicitudesDespacho(
      empresaId,
      estado,
    );
    return {
      success: true,
      data,
    };
  }

  @Patch('solicitudes-despacho/:id/status')
  @Roles('ADMIN', 'GERENTE', 'OPERACIONES')
  async updateEstadoSolicitudDespacho(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEstadoSolicitudDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.operationsService.updateEstadoSolicitudDespacho(
      id,
      dto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: `Estado de solicitud de despacho actualizado a ${dto.estado}`,
      data,
    };
  }

  // --- SOLICITUDES DE RETORNO ---

  @Patch('solicitudes-despacho/:id/schedule')
  @Roles('ADMIN', 'GERENTE', 'OPERACIONES', 'COMERCIAL')
  async scheduleSolicitudDespacho(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleSolicitudDespachoDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.operationsService.scheduleSolicitudDespacho(
      id,
      dto,
      empresaId,
      usuarioId,
    );
    return { success: true, data };
  }

  // --- SOLICITUDES DE RETORNO ---

  @Post('solicitudes-retorno')
  @Roles('ADMIN', 'GERENTE', 'OPERACIONES', 'COMERCIAL')
  async createSolicitudRetorno(
    @Body() dto: CreateSolicitudRetornoDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.operationsService.createSolicitudRetorno(
      dto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Solicitud de retorno registrada exitosamente',
      data,
    };
  }

  @Get('solicitudes-retorno')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'MANTENIMIENTO')
  async findAllSolicitudesRetorno(
    @GetUser('empresaId') empresaId: string,
    @Query('estado') estado?: EstadoSolicitudOperativa,
  ) {
    const data = await this.operationsService.findAllSolicitudesRetorno(
      empresaId,
      estado,
    );
    return {
      success: true,
      data,
    };
  }

  @Patch('solicitudes-retorno/:id/status')
  @Roles('ADMIN', 'GERENTE', 'OPERACIONES')
  async updateEstadoSolicitudRetorno(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEstadoSolicitudDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.operationsService.updateEstadoSolicitudRetorno(
      id,
      dto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: `Estado de solicitud de retorno actualizado a ${dto.estado}`,
      data,
    };
  }

  // --- EJECUCIÓN: DESPACHOS ---

  @Post('despachos')
  @Roles('ADMIN', 'GERENTE', 'OPERACIONES')
  async createDespacho(
    @Body() dto: CreateDespachoDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.operationsService.createDespacho(
      dto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message:
        'Orden de Despacho e Inspección de Salida registrada exitosamente',
      data,
    };
  }

  @Get('despachos')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'MANTENIMIENTO')
  async findAllDespachos(@GetUser('empresaId') empresaId: string) {
    const data = await this.operationsService.findAllDespachos(empresaId);
    return {
      success: true,
      data,
    };
  }

  // --- EJECUCIÓN: RETORNOS ---

  @Post('retornos')
  @Roles('ADMIN', 'GERENTE', 'OPERACIONES', 'MANTENIMIENTO')
  async createRetorno(
    @Body() dto: CreateRetornoDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.operationsService.createRetorno(
      dto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Orden de Retorno e Inspección de Daños registrada exitosamente',
      data,
    };
  }

  @Get('retornos/:id/liquidacion')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'CONTABILIDAD')
  async findReturnSettlement(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    return {
      success: true,
      data: await this.operationsService.findReturnSettlement(id, empresaId),
    };
  }

  @Post('retornos/:id/liquidacion/aprobar')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD')
  async approveReturnSettlement(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    return {
      success: true,
      message: 'Liquidación anticipada aprobada',
      data: await this.operationsService.approveReturnSettlement(
        id,
        empresaId,
        usuarioId,
      ),
    };
  }

  @Patch('retornos/:id/liquidacion/destino-credito')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD')
  async selectReturnCreditDestination(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SeleccionarDestinoCreditoDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    return {
      success: true,
      message: 'Destino del crédito seleccionado',
      data: await this.operationsService.selectReturnCreditDestination(
        id,
        dto.destinoCredito,
        empresaId,
        usuarioId,
      ),
    };
  }

  @Get('retornos')
  @Roles(
    'ADMIN',
    'GERENTE',
    'COMERCIAL',
    'OPERACIONES',
    'MANTENIMIENTO',
    'CONTABILIDAD',
  )
  async findAllRetornos(@GetUser('empresaId') empresaId: string) {
    const data = await this.operationsService.findAllRetornos(empresaId);
    return {
      success: true,
      data,
    };
  }
}
