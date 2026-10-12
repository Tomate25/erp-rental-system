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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

import { CxcAntiguedadService } from '../services/cxc-antiguedad.service';
import { CxcEstadoCuentaService } from '../services/cxc-estado-cuenta.service';
import { CxcRecibosService } from '../services/cxc-recibos.service';
import { CxcArreglosService } from '../services/cxc-arreglos.service';
import { CxcNotasService } from '../services/cxc-notas.service';
import { TipoCambioService } from '../services/tipo-cambio.service';
import { CxcConfiguracionService } from '../services/cxc-configuracion.service';

import { CxcQueryDto } from '../dto/cxc-query.dto';
import { CreateReciboCajaDto } from '../dto/create-recibo-caja.dto';
import { SimularArregloDto } from '../dto/simular-arreglo.dto';
import { CreateArregloPagoDto } from '../dto/create-arreglo-pago.dto';
import { CreateNotaDto } from '../dto/create-nota.dto';
import { UpdateTipoCambioDto } from '../dto/update-tipo-cambio.dto';
import { UpdateCxcConfigDto } from '../dto/update-cxc-config.dto';
import { EstadoArregloPago, EstadoNotaCxc, EstadoReciboCaja, TipoNotaCxc } from '@prisma/client';

@Controller('cxc')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CxcController {
  constructor(
    private readonly antiguedadService: CxcAntiguedadService,
    private readonly estadoCuentaService: CxcEstadoCuentaService,
    private readonly recibosService: CxcRecibosService,
    private readonly arreglosService: CxcArreglosService,
    private readonly notasService: CxcNotasService,
    private readonly tipoCambioService: TipoCambioService,
    private readonly configService: CxcConfiguracionService,
  ) {}

  // =========================================================================
  // 1. ANTIGÜEDAD DE SALDOS Y KPIs DE CARTERA
  // =========================================================================
  @Get('antiguedad')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION', 'COMERCIAL', 'VENDEDOR')
  async getAntiguedadSaldos(
    @GetUser('empresaId') empresaId: string,
    @Query() query: CxcQueryDto,
  ) {
    const data = await this.antiguedadService.obtenerAntiguedadSaldos(empresaId, query);
    return {
      success: true,
      data,
    };
  }

  // =========================================================================
  // 2. ESTADO DE CUENTA POR CLIENTE
  // =========================================================================
  @Get('estado-cuenta/:clienteId')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION', 'COMERCIAL', 'VENDEDOR')
  async getEstadoCuenta(
    @GetUser('empresaId') empresaId: string,
    @Param('clienteId') clienteId: string,
    @Query('moneda') moneda?: 'NIO' | 'USD',
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    const data = await this.estadoCuentaService.obtenerEstadoCuenta(
      empresaId,
      clienteId,
      moneda || 'NIO',
      fechaDesde,
      fechaHasta,
    );
    return {
      success: true,
      data,
    };
  }

  // =========================================================================
  // 3. TASA DE CAMBIO BCN (NIO / USD)
  // =========================================================================
  @Get('tipo-cambio/hoy')
  async getTipoCambioHoy() {
    const tasa = await this.tipoCambioService.obtenerTasaDelDia(new Date());
    return {
      success: true,
      data: {
        fecha: new Date().toISOString().split('T')[0],
        tasa,
      },
    };
  }

  @Get('tipo-cambio/:fecha')
  async getTipoCambioFecha(@Param('fecha') fecha: string) {
    const tasa = await this.tipoCambioService.obtenerTasaDelDia(fecha);
    return {
      success: true,
      data: {
        fecha,
        tasa,
      },
    };
  }

  @Post('tipo-cambio')
  @Roles('ADMIN', 'CONTABILIDAD', 'GERENTE')
  async setTipoCambio(@Body() dto: UpdateTipoCambioDto) {
    const data = await this.tipoCambioService.registrarTasa(dto.fecha, dto.tasa);
    return {
      success: true,
      data,
    };
  }

  // =========================================================================
  // 4. CONFIGURACIÓN DEL MÓDULO CXC (Reglas de Negocio ❓)
  // =========================================================================
  @Get('configuracion')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION')
  async getConfiguracion(@GetUser('empresaId') empresaId: string) {
    const data = await this.configService.obtenerConfiguracion(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Patch('configuracion')
  @Roles('ADMIN', 'GERENTE')
  async updateConfiguracion(
    @GetUser('empresaId') empresaId: string,
    @Body() dto: UpdateCxcConfigDto,
  ) {
    const data = await this.configService.actualizarConfiguracion(empresaId, dto);
    return {
      success: true,
      data,
    };
  }

  // =========================================================================
  // 5. RECIBOS DE CAJA (RC) & APLICACIÓN DE PAGOS / RETENCIONES DGI
  // =========================================================================
  @Get('recibos')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION')
  async listarRecibos(
    @GetUser('empresaId') empresaId: string,
    @Query('clienteId') clienteId?: string,
    @Query('sucursalId') sucursalId?: string,
    @Query('estado') estado?: EstadoReciboCaja,
  ) {
    const data = await this.recibosService.listarRecibos(empresaId, {
      clienteId,
      sucursalId,
      estado,
    });
    return {
      success: true,
      data,
    };
  }

  @Get('recibos/:id')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION')
  async getReciboPorId(
    @GetUser('empresaId') empresaId: string,
    @Param('id') id: string,
  ) {
    const data = await this.recibosService.obtenerReciboPorId(empresaId, id);
    return {
      success: true,
      data,
    };
  }

  @Post('recibos')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION')
  async crearRecibo(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Body() dto: CreateReciboCajaDto,
  ) {
    const data = await this.recibosService.crearRecibo(empresaId, dto, usuarioId);
    return {
      success: true,
      data,
    };
  }

  @Post('recibos/:id/anular')
  @Roles('ADMIN', 'GERENTE')
  async anularRecibo(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Param('id') id: string,
    @Body('motivo') motivo: string,
  ) {
    const data = await this.recibosService.anularRecibo(
      empresaId,
      id,
      motivo || 'Anulación por usuario administrativo',
      usuarioId,
    );
    return {
      success: true,
      data,
    };
  }

  // =========================================================================
  // 6. ARREGLOS DE PAGO (ARR)
  // =========================================================================
  @Post('arreglos/simular')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION')
  async simularArreglo(
    @GetUser('empresaId') empresaId: string,
    @Body() dto: SimularArregloDto,
  ) {
    const data = await this.arreglosService.simularArreglo(empresaId, dto);
    return {
      success: true,
      data,
    };
  }

  @Get('arreglos')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION')
  async listarArreglos(
    @GetUser('empresaId') empresaId: string,
    @Query('clienteId') clienteId?: string,
    @Query('estado') estado?: EstadoArregloPago,
  ) {
    const data = await this.arreglosService.listarArreglos(empresaId, {
      clienteId,
      estado,
    });
    return {
      success: true,
      data,
    };
  }

  @Get('arreglos/:id')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION')
  async getArregloPorId(
    @GetUser('empresaId') empresaId: string,
    @Param('id') id: string,
  ) {
    const data = await this.arreglosService.obtenerArregloPorId(empresaId, id);
    return {
      success: true,
      data,
    };
  }

  @Post('arreglos')
  @Roles('ADMIN', 'GERENTE')
  async formalizarArreglo(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Body() dto: CreateArregloPagoDto,
  ) {
    const data = await this.arreglosService.formalizarArreglo(empresaId, dto, usuarioId);
    return {
      success: true,
      data,
    };
  }

  @Post('arreglos/:id/anular')
  @Roles('ADMIN', 'GERENTE')
  async anularArreglo(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Param('id') id: string,
    @Body('motivo') motivo: string,
  ) {
    const data = await this.arreglosService.anularArreglo(
      empresaId,
      id,
      motivo || 'Anulación por usuario administrativo',
      usuarioId,
    );
    return {
      success: true,
      data,
    };
  }

  @Post('arreglos/:id/penalidad')
  @Roles('ADMIN', 'GERENTE')
  async aplicarPenalidad(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Param('id') id: string,
  ) {
    const data = await this.arreglosService.aplicarPenalidadIncumplimiento(
      empresaId,
      id,
      usuarioId,
    );
    return {
      success: true,
      data,
    };
  }

  // =========================================================================
  // 7. NOTAS DE DÉBITO Y CRÉDITO (ND / NC)
  // =========================================================================
  @Get('notas')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION')
  async listarNotas(
    @GetUser('empresaId') empresaId: string,
    @Query('clienteId') clienteId?: string,
    @Query('tipoNota') tipoNota?: TipoNotaCxc,
    @Query('estado') estado?: EstadoNotaCxc,
    @Query('sucursalId') sucursalId?: string,
  ) {
    const data = await this.notasService.listarNotas(empresaId, {
      clienteId,
      tipoNota,
      estado,
      sucursalId,
    });
    return {
      success: true,
      data,
    };
  }

  @Get('notas/:id')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION')
  async getNotaPorId(
    @GetUser('empresaId') empresaId: string,
    @Param('id') id: string,
  ) {
    const data = await this.notasService.obtenerNotaPorId(empresaId, id);
    return {
      success: true,
      data,
    };
  }

  @Post('notas')
  @Roles('ADMIN', 'GERENTE', 'FACTURACION', 'CONTABILIDAD')
  async crearNota(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Body() dto: CreateNotaDto,
  ) {
    const data = await this.notasService.crearNota(empresaId, dto, usuarioId);
    return {
      success: true,
      data,
    };
  }

  @Post('notas/:id/anular')
  @Roles('ADMIN', 'GERENTE')
  async anularNota(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Param('id') id: string,
    @Body('motivo') motivo: string,
  ) {
    const data = await this.notasService.anularNota(
      empresaId,
      id,
      motivo || 'Anulación por usuario administrativo',
      usuarioId,
    );
    return {
      success: true,
      data,
    };
  }
}
