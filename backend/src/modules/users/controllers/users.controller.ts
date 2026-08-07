import { Controller, Get, Post, Body, Param, Put, Patch, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserRolesDto } from '../dto/update-user-roles.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN') // Solo el administrador del sistema puede ver a todos los usuarios
  async findAll(@GetUser('empresaId') empresaId: string) {
    const data = await this.usersService.findAll(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Post()
  @Roles('ADMIN')
  async create(
    @Body() createUserDto: CreateUserDto,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.usersService.create(createUserDto, empresaId);
    return {
      success: true,
      message: 'Usuario registrado con éxito',
      data,
    };
  }

  @Put(':id/roles')
  @Roles('ADMIN')
  async updateRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateUserRolesDto,
    @GetUser('empresaId') empresaId: string,
  ) {
    return this.usersService.updateRoles(id, updateDto, empresaId);
  }

  @Patch(':id/status')
  @Roles('ADMIN')
  async toggleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('id') currentUserId: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const result = await this.usersService.toggleStatus(id, currentUserId, empresaId);
    return {
      success: true,
      message: result.message,
      data: { activo: result.activo },
    };
  }

  @Post(':id/unlock')
  @Roles('ADMIN')
  async unlockUser(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const result = await this.usersService.unlockAndResetPassword(id, empresaId);
    return {
      success: true,
      message: result.message,
      data: { tempPassword: result.tempPassword },
    };
  }

  @Post('change-password')
  async changePassword(
    @Body('newPassword') newPassword: string,
    @GetUser('id') userId: string,
  ) {
    return this.usersService.forceChangePassword(userId, newPassword);
  }
}
