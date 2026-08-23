import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { HorometrosService } from '../services/horometros.service';
import { CreateLecturaHorometroDto } from '../dto/create-lectura.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('horometros')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HorometrosController {
  constructor(private readonly horometrosService: HorometrosService) {}

  @Post()
  @Roles('ADMIN', 'GERENTE', 'OPERACIONES', 'MANTENIMIENTO')
  async create(
    @Body() createDto: CreateLecturaHorometroDto,
    @GetUser('nombre') nombreUsuario: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.horometrosService.create(createDto, nombreUsuario, empresaId);
    return {
      success: true,
      message: 'Lectura de horómetro registrada con éxito',
      data,
    };
  }

  @Get()
  @Roles('ADMIN', 'GERENTE', 'OPERACIONES', 'MANTENIMIENTO', 'COMERCIAL')
  async findAll(
    @GetUser('empresaId') empresaId: string,
    @Query('equipoId') equipoId?: string,
  ) {
    const data = await this.horometrosService.findAll(empresaId, equipoId);
    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  @Roles('ADMIN', 'GERENTE', 'OPERACIONES', 'MANTENIMIENTO', 'COMERCIAL')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.horometrosService.findOne(id, empresaId);
    return {
      success: true,
      data,
    };
  }
}
