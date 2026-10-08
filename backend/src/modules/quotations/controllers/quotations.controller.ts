import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { QuotationsService } from '../services/quotations.service';
import { CreateQuotationDto } from '../dto/create-quotation.dto';
import { CreatePublicQuotationDto } from '../dto/create-public-quotation.dto';
import { UpdateQuotationDto } from '../dto/update-quotation.dto';
import { RejectQuotationDto } from '../dto/reject-quotation.dto';
import { SendQuotationEmailDto } from '../dto/send-quotation-email.dto';
import { AcceptOnBehalfDto } from '../dto/accept-on-behalf.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { extractClientIp } from '../../../common/utils/client-ip.util';
import { EstadoCotizacion } from '@prisma/client';

@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post('public-request')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async createPublicRequest(@Body() createDto: CreatePublicQuotationDto) {
    const data = await this.quotationsService.createPublic(createDto);
    return {
      success: true,
      data,
    };
  }

  @Get('public-request/:token')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findByPublicToken(@Param('token') token: string, @Req() req: Request) {
    const ip = extractClientIp(req);
    const userAgent = req.headers['user-agent'];
    const requestId = req.headers['x-request-id'] as string | undefined;
    const data = await this.quotationsService.findByPublicToken(token, {
      ip,
      userAgent,
      requestId,
    });
    return {
      success: true,
      data,
    };
  }

  @Get('public/:token')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findByPublicTokenDirect(
    @Param('token') token: string,
    @Req() req: Request,
  ) {
    const ip = extractClientIp(req);
    const userAgent = req.headers['user-agent'];
    const requestId = req.headers['x-request-id'] as string | undefined;
    const data = await this.quotationsService.findByPublicToken(token, {
      ip,
      userAgent,
      requestId,
    });
    return {
      success: true,
      data,
    };
  }

  @Post('public/:token/accept')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async acceptPublicQuotation(
    @Param('token') token: string,
    @Req() req: Request,
  ) {
    const ip = extractClientIp(req);
    const userAgent = req.headers['user-agent'];
    const requestId = req.headers['x-request-id'] as string | undefined;
    const result = await this.quotationsService.acceptPublic(token, {
      ip,
      userAgent,
      requestId,
    });
    return result;
  }

  @Post('public/:token/reject')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async rejectPublicQuotation(
    @Param('token') token: string,
    @Body() rejectDto: RejectQuotationDto,
    @Req() req: Request,
  ) {
    const ip = extractClientIp(req);
    const userAgent = req.headers['user-agent'];
    const requestId = req.headers['x-request-id'] as string | undefined;
    const result = await this.quotationsService.rejectPublic(
      token,
      rejectDto.motivo,
      {
        ip,
        userAgent,
        requestId,
      },
    );
    return result;
  }

  @Patch(':id/revoke-public-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async revokePublicToken(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId?: string,
  ) {
    return usuarioId !== undefined
      ? this.quotationsService.revokePublicToken(id, empresaId, usuarioId)
      : this.quotationsService.revokePublicToken(id, empresaId);
  }

  @Patch(':id/rotate-public-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async rotatePublicToken(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId?: string,
  ) {
    return usuarioId !== undefined
      ? this.quotationsService.rotatePublicToken(id, empresaId, usuarioId)
      : this.quotationsService.rotatePublicToken(id, empresaId);
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
    const data = await this.quotationsService.create(
      createDto,
      empresaId,
      sucursalId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Cotización registrada con éxito',
      data,
    };
  }

  @Get('sales-ranking')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE')
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
  @Roles(
    'ADMIN',
    'GERENTE',
    'COMERCIAL',
    'OPERACIONES',
    'FACTURACION',
    'INVENTARIO',
    'MANTENIMIENTO',
  )
  async findAll(
    @GetUser('empresaId') empresaId: string,
    @GetUser()
    user?: {
      id: string;
      roles?: (string | { nombre?: string; rol?: { nombre?: string } })[];
    },
    @Query('all') all?: string,
  ) {
    const data =
      user !== undefined || all !== undefined
        ? await this.quotationsService.findAll(empresaId, user, all === 'true')
        : await this.quotationsService.findAll(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Get('number/:numeroCotizacion')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'ADMIN',
    'GERENTE',
    'COMERCIAL',
    'OPERACIONES',
    'FACTURACION',
    'INVENTARIO',
    'MANTENIMIENTO',
  )
  async findVersionsByNumber(
    @Param('numeroCotizacion') numeroCotizacion: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.quotationsService.findVersionsByNumber(
      numeroCotizacion,
      empresaId,
    );
    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    'ADMIN',
    'GERENTE',
    'COMERCIAL',
    'OPERACIONES',
    'FACTURACION',
    'INVENTARIO',
    'MANTENIMIENTO',
  )
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
    if (
      updateDto.estado === EstadoCotizacion.ACEPTADA ||
      updateDto.estado === EstadoCotizacion.CONVERTIDA_A_CONTRATO
    ) {
      throw new BadRequestException(
        'No se permite cambiar la cotización a ACEPTADA directamente mediante edición. El cliente debe aceptarla a través del enlace público seguro.',
      );
    }
    const data = await this.quotationsService.update(
      id,
      updateDto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Cotización actualizada con éxito',
      data,
    };
  }

  @Post(':id/send-email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async sendToClient(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId?: string,
    @Body() sendDto?: SendQuotationEmailDto,
  ) {
    return this.quotationsService.sendToClient(
      id,
      empresaId,
      usuarioId,
      sendDto,
    );
  }

  @Post(':id/accept-on-behalf')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async acceptOnBehalf(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Body() acceptDto: AcceptOnBehalfDto,
    @Req() req: Request,
  ) {
    const ip = extractClientIp(req);
    const userAgent = req.headers['user-agent'];
    const requestId = req.headers['x-request-id'] as string | undefined;
    return this.quotationsService.acceptOnBehalf(
      id,
      empresaId,
      usuarioId,
      acceptDto,
      { ip, userAgent, requestId },
    );
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
