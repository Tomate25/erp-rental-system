import { Controller, Get, Post, Body, Patch, Param, ParseUUIDPipe, UseGuards, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { QuotationsService } from '../services/quotations.service';
import { CreateQuotationDto } from '../dto/create-quotation.dto';
import { UpdateQuotationDto } from '../dto/update-quotation.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post('public-request')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async createPublicRequest(@Body() createDto: any) {
    const data = await this.quotationsService.createPublic(createDto);
    return {
      success: true,
      data,
    };
  }

  @Get('public-request/:token')
  async findByPublicToken(@Param('token') token: string) {
    const data = await this.quotationsService.findByPublicToken(token);
    return {
      success: true,
      data,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async create(
    @Body() createDto: CreateQuotationDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('sucursalId') sucursalId?: string,
    @GetUser('id') usuarioId?: string,
  ) {
    const data = await this.quotationsService.create(createDto, empresaId, sucursalId, usuarioId);
    return {
      success: true,
      message: 'Cotización registrada con éxito',
      data,
    };
  }

  @Get('sales-ranking')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async getSalesRanking(@GetUser('empresaId') empresaId: string) {
    const data = await this.quotationsService.getSalesRanking(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Post('seed-sales-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE')
  async seedSalesData(@GetUser('empresaId') empresaId: string) {
    const data = await this.quotationsService.seedSalesTestData(empresaId);
    return {
      success: true,
      message: 'Datos de prueba de ventas generados exitosamente',
      data,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'FACTURACION', 'INVENTARIO', 'MANTENIMIENTO')
  async findAll(
    @GetUser('empresaId') empresaId: string,
    @GetUser() user?: any,
    @Query('all') all?: string,
  ) {
    const data = user !== undefined || all !== undefined
      ? await this.quotationsService.findAll(empresaId, user, all === 'true')
      : await this.quotationsService.findAll(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Get('number/:numeroCotizacion')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'FACTURACION', 'INVENTARIO', 'MANTENIMIENTO')
  async findVersionsByNumber(
    @Param('numeroCotizacion') numeroCotizacion: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.quotationsService.findVersionsByNumber(numeroCotizacion, empresaId);
    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'FACTURACION', 'INVENTARIO', 'MANTENIMIENTO')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.quotationsService.findOne(id, empresaId);
    return {
      success: true,
      data,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateQuotationDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId?: string,
  ) {
    const data = await this.quotationsService.update(id, updateDto, empresaId, usuarioId);
    return {
      success: true,
      message: 'Cotización actualizada con éxito',
      data,
    };
  }

  @Post(':id/version')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async createNewVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.quotationsService.createNewVersion(id, empresaId);
    return {
      success: true,
      message: 'Nueva versión de cotización creada con éxito',
      data,
    };
  }
}
