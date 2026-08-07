import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { InventoryService } from '../services/inventory.service';
import { CreateEquipmentDto } from '../dto/create-equipment.dto';
import { UpdateEquipmentDto } from '../dto/update-equipment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('categories')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'MANTENIMIENTO')
  async getCategories() {
    const data = await this.inventoryService.getCategories();
    return {
      success: true,
      data,
    };
  }

  @Post('categories')
  @Roles('ADMIN', 'GERENTE')
  async createCategory(@Body('nombre') nombre: string) {
    const data = await this.inventoryService.createCategory(nombre);
    return {
      success: true,
      data,
    };
  }

  @Delete('categories/:id')
  @Roles('ADMIN', 'GERENTE')
  async removeCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.removeCategory(id);
  }

  @Get('brands')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'MANTENIMIENTO')
  async getBrands() {
    const data = await this.inventoryService.getBrands();
    return {
      success: true,
      data,
    };
  }

  @Post('brands')
  @Roles('ADMIN', 'GERENTE')
  async createBrand(@Body('nombre') nombre: string) {
    const data = await this.inventoryService.createBrand(nombre);
    return {
      success: true,
      data,
    };
  }

  @Delete('brands/:id')
  @Roles('ADMIN', 'GERENTE')
  async removeBrand(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.removeBrand(id);
  }

  @Post()
  @Roles('ADMIN', 'GERENTE')
  async create(
    @Body() createEquipmentDto: CreateEquipmentDto,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.inventoryService.create(createEquipmentDto, empresaId);
    return {
      success: true,
      message: 'Equipo registrado en el inventario con éxito',
      data,
    };
  }

  @Get()
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'MANTENIMIENTO')
  async findAll(
    @GetUser('empresaId') empresaId: string,
    @Query('sucursalId') sucursalId?: string,
    @Query('categoriaId') categoriaId?: string,
    @Query('estado') estado?: string,
  ) {
    const data = await this.inventoryService.findAll(empresaId, sucursalId, categoriaId, estado);
    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'MANTENIMIENTO')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.inventoryService.findOne(id, empresaId);
    return {
      success: true,
      data,
    };
  }

  @Put(':id')
  @Roles('ADMIN', 'GERENTE', 'MANTENIMIENTO')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEquipmentDto: UpdateEquipmentDto,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.inventoryService.update(id, updateEquipmentDto, empresaId);
    return {
      success: true,
      message: 'Datos del equipo actualizados con éxito',
      data,
    };
  }

  @Delete(':id')
  @Roles('ADMIN', 'GERENTE')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    return this.inventoryService.remove(id, empresaId);
  }
}
