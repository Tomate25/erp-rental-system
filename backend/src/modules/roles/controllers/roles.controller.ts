import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { RolesService } from '../services/roles.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Roles('ADMIN') // Solo el Administrador crea nuevos roles
  async create(@Body() createRoleDto: CreateRoleDto) {
    const data = await this.rolesService.create(createRoleDto);
    return {
      success: true,
      message: 'Rol creado con éxito',
      data,
    };
  }

  @Get()
  @Roles('ADMIN')
  async findAll(@GetUser('empresaId') empresaId: string) {
    const data = await this.rolesService.findAll(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Get('permisos')
  @Roles('ADMIN')
  async findAllPermissions() {
    const data = await this.rolesService.findAllPermissions();
    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  @Roles('ADMIN')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.rolesService.findOne(id);
    return {
      success: true,
      data,
    };
  }

  @Put(':id/permisos')
  @Roles('ADMIN')
  async updatePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateRolePermissionsDto,
  ) {
    return this.rolesService.updatePermissions(id, updateDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    return this.rolesService.remove(id, empresaId);
  }
}
