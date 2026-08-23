import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { MaintenanceService } from '../services/maintenance.service';
import { CreateMaintenanceDto } from '../dto/create-maintenance.dto';
import { UpdateMaintenanceDto } from '../dto/update-maintenance.dto';
import { EstadoMantenimiento } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('maintenance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @Roles('ADMIN', 'GERENTE', 'MANTENIMIENTO', 'OPERACIONES')
  async create(
    @Body() createDto: CreateMaintenanceDto,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.maintenanceService.create(createDto, empresaId);
    return {
      success: true,
      message: 'Mantenimiento registrado con éxito',
      data,
    };
  }

  @Get()
  @Roles('ADMIN', 'GERENTE', 'MANTENIMIENTO', 'OPERACIONES', 'COMERCIAL')
  async findAll(
    @GetUser('empresaId') empresaId: string,
    @Query('estado') estado?: EstadoMantenimiento,
    @Query('equipoId') equipoId?: string,
  ) {
    const data = await this.maintenanceService.findAll(empresaId, estado, equipoId);
    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  @Roles('ADMIN', 'GERENTE', 'MANTENIMIENTO', 'OPERACIONES', 'COMERCIAL')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.maintenanceService.findOne(id, empresaId);
    return {
      success: true,
      data,
    };
  }

  @Put(':id')
  @Roles('ADMIN', 'GERENTE', 'MANTENIMIENTO')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateMaintenanceDto,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.maintenanceService.update(id, updateDto, empresaId);
    return {
      success: true,
      message: 'Registro de mantenimiento actualizado con éxito',
      data,
    };
  }

  @Delete(':id')
  @Roles('ADMIN', 'GERENTE')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    return this.maintenanceService.remove(id, empresaId);
  }
}
