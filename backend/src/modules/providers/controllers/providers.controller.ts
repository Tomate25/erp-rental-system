import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProvidersService } from '../services/providers.service';
import { CreateProviderDto } from '../dto/create-provider.dto';
import { UpdateProviderDto } from '../dto/update-provider.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { TipoProveedor } from '@prisma/client';

@Controller('providers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @Roles('ADMIN', 'GERENTE', 'INVENTARIO', 'MANTENIMIENTO', 'COMERCIAL')
  async create(
    @Body() createDto: CreateProviderDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.providersService.create(
      createDto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Proveedor registrado con éxito',
      data,
    };
  }

  @Get()
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
    @Query('tipo') tipo?: TipoProveedor,
    @Query('activo') activo?: string,
    @Query('search') search?: string,
  ) {
    const isActivo =
      activo !== undefined
        ? activo === 'true' || activo === '1'
        : undefined;

    const data = await this.providersService.findAll(empresaId, {
      tipo,
      activo: isActivo,
      search,
    });

    return {
      success: true,
      data,
    };
  }

  @Get(':id')
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
    const data = await this.providersService.findOne(id, empresaId);
    return {
      success: true,
      data,
    };
  }

  @Put(':id')
  @Roles('ADMIN', 'GERENTE', 'INVENTARIO', 'MANTENIMIENTO')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateProviderDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.providersService.update(
      id,
      updateDto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Proveedor actualizado con éxito',
      data,
    };
  }

  @Delete(':id')
  @Roles('ADMIN', 'GERENTE')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.providersService.remove(id, empresaId, usuarioId);
    return data;
  }
}
