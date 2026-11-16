import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  EstadoCompraInsumo,
  EstadoPagoCompra,
  EstadoSubarriendoProveedor,
} from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { PurchasesService } from '../services/purchases.service';
import { CreateCompraInsumoDto } from '../dto/create-compra-insumo.dto';
import { CreateSubarriendoDto } from '../dto/create-subarriendo.dto';
import { DevolverSubarriendoDto } from '../dto/devolver-subarriendo.dto';
import { RegistrarPagoCompraDto } from '../dto/registrar-pago-compra.dto';

const ROLES_LECTURA = [
  'ADMIN',
  'GERENTE',
  'CONTABILIDAD',
  'OPERACIONES',
  'MANTENIMIENTO',
  'BODEGA',
  'INVENTARIO',
  'COMERCIAL',
];

const ROLES_GESTION = [
  'ADMIN',
  'GERENTE',
  'CONTABILIDAD',
  'OPERACIONES',
  'MANTENIMIENTO',
  'BODEGA',
  'INVENTARIO',
];

@Controller('purchases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get('resumen')
  @Roles(...ROLES_LECTURA)
  async getResumen(@GetUser('empresaId') empresaId: string) {
    const data = await this.purchasesService.getResumen(empresaId);
    return { success: true, data };
  }

  @Get('insumos')
  @Roles(...ROLES_LECTURA)
  async findAllComprasInsumos(
    @GetUser('empresaId') empresaId: string,
    @Query('estado') estado?: EstadoCompraInsumo,
    @Query('estadoPago') estadoPago?: EstadoPagoCompra,
    @Query('proveedorId') proveedorId?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.purchasesService.findAllComprasInsumos(empresaId, {
      estado,
      estadoPago,
      proveedorId,
      search,
    });
    return { success: true, data };
  }

  @Get('insumos/:id')
  @Roles(...ROLES_LECTURA)
  async findOneCompraInsumo(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.purchasesService.findOneCompraInsumo(id, empresaId);
    return { success: true, data };
  }

  @Post('insumos')
  @Roles(...ROLES_GESTION)
  async createCompraInsumo(
    @Body() dto: CreateCompraInsumoDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.purchasesService.createCompraInsumo(
      dto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Compra de insumos registrada con éxito',
      data,
    };
  }

  @Patch('insumos/:id/recibir')
  @Roles(...ROLES_GESTION)
  async recibirCompraInsumo(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.purchasesService.recibirCompraInsumo(
      id,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Compra recibida e ingresada a bodega de insumos',
      data,
    };
  }

  @Patch('insumos/:id/anular')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD')
  async anularCompraInsumo(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.purchasesService.anularCompraInsumo(
      id,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Compra de insumos anulada correctamente',
      data,
    };
  }

  @Post('insumos/:id/pagos')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD')
  async registrarPagoCompraInsumo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegistrarPagoCompraDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.purchasesService.registrarPagoCompraInsumo(
      id,
      dto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Pago a proveedor registrado con éxito',
      data,
    };
  }

  @Get('maquinaria-externa')
  @Roles(...ROLES_LECTURA)
  async findMaquinariaExterna(
    @GetUser('empresaId') empresaId: string,
    @Query('estado') estado?: EstadoSubarriendoProveedor,
    @Query('proveedorId') proveedorId?: string,
    @Query('search') search?: string,
  ) {
    const data = await this.purchasesService.findMaquinariaExterna(empresaId, {
      estado,
      proveedorId,
      search,
    });
    return { success: true, data };
  }

  @Post('subarriendos')
  @Roles(...ROLES_GESTION)
  async createSubarriendo(
    @Body() dto: CreateSubarriendoDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.purchasesService.createSubarriendo(
      dto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Período de subarriendo / préstamo con proveedor registrado',
      data,
    };
  }

  @Patch('subarriendos/:id/devolver')
  @Roles(...ROLES_GESTION)
  async devolverSubarriendo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DevolverSubarriendoDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.purchasesService.devolverSubarriendo(
      id,
      dto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Maquinaria marcada como devuelta al proveedor',
      data,
    };
  }

  @Post('subarriendos/:id/pagos')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD')
  async registrarPagoSubarriendo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RegistrarPagoCompraDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.purchasesService.registrarPagoSubarriendo(
      id,
      dto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Pago de subarriendo registrado con éxito',
      data,
    };
  }
}
