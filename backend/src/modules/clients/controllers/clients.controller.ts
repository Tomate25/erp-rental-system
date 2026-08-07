import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ClientsService } from '../services/clients.service';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL') // Solo estos roles pueden registrar clientes
  async create(
    @Body() createClientDto: CreateClientDto,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.clientsService.create(createClientDto, empresaId);
    return {
      success: true,
      message: 'Cliente creado con éxito',
      data,
    };
  }

  @Get()
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async findAll(@GetUser('empresaId') empresaId: string) {
    const data = await this.clientsService.findAll(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.clientsService.findOne(id, empresaId);
    return {
      success: true,
      data,
    };
  }

  @Put(':id')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateClientDto: UpdateClientDto,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.clientsService.update(id, updateClientDto, empresaId);
    return {
      success: true,
      message: 'Cliente actualizado con éxito',
      data,
    };
  }

  @Delete(':id')
  @Roles('ADMIN', 'GERENTE') // Solo perfiles gerenciales pueden eliminar clientes
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.clientsService.remove(id, empresaId);
    return {
      success: true,
      message: 'Cliente eliminado con éxito',
      data,
    };
  }
}
