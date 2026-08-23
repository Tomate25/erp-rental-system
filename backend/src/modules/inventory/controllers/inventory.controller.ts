import { Controller, Get, Post, Body, Param, Put, Delete, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { InventoryService } from '../services/inventory.service';
import { CreateEquipmentDto } from '../dto/create-equipment.dto';
import { UpdateEquipmentDto } from '../dto/update-equipment.dto';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // --- CATÁLOGO DE PRODUCTOS COMERCIALES ---

  @Post('products')
  @Roles('ADMIN', 'GERENTE')
  async createProduct(
    @Body() createProductDto: CreateProductDto,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.inventoryService.createProduct(createProductDto, empresaId);
    return {
      success: true,
      message: 'Producto comercial registrado con éxito',
      data,
    };
  }

  @Get('products')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'MANTENIMIENTO')
  async findAllProducts(
    @GetUser('empresaId') empresaId: string,
    @Query('categoriaId') categoriaId?: string,
    @Query('subcategoriaId') subcategoriaId?: string,
    @Query('marcaId') marcaId?: string,
  ) {
    const data = await this.inventoryService.findAllProducts(empresaId, categoriaId, subcategoriaId, marcaId);
    return {
      success: true,
      data,
    };
  }

  @Get('products/:id')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'MANTENIMIENTO')
  async findOneProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.inventoryService.findOneProduct(id, empresaId);
    return {
      success: true,
      data,
    };
  }

  @Put('products/:id')
  @Roles('ADMIN', 'GERENTE')
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.inventoryService.updateProduct(id, updateProductDto, empresaId);
    return {
      success: true,
      message: 'Producto comercial actualizado con éxito',
      data,
    };
  }

  @Delete('products/:id')
  @Roles('ADMIN', 'GERENTE')
  async removeProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    return this.inventoryService.removeProduct(id, empresaId);
  }

  // --- TAXONOMÍA (CATEGORÍAS, SUBCATEGORÍAS, MARCAS) ---

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
  async createCategory(
    @Body('nombre') nombre: string,
    @Body('descripcion') descripcion?: string,
    @Body('isLineaAmarilla') isLineaAmarilla?: boolean,
  ) {
    const data = await this.inventoryService.createCategory(nombre, descripcion, isLineaAmarilla);
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

  @Get('subcategories')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'MANTENIMIENTO')
  async getSubcategories(@Query('categoriaId') categoriaId?: string) {
    const data = await this.inventoryService.getSubcategories(categoriaId);
    return {
      success: true,
      data,
    };
  }

  @Post('subcategories')
  @Roles('ADMIN', 'GERENTE')
  async createSubcategory(
    @Body('categoriaId') categoriaId: string,
    @Body('nombre') nombre: string,
    @Body('descripcion') descripcion?: string,
  ) {
    const data = await this.inventoryService.createSubcategory(categoriaId, nombre, descripcion);
    return {
      success: true,
      data,
    };
  }

  @Delete('subcategories/:id')
  @Roles('ADMIN', 'GERENTE')
  async removeSubcategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.inventoryService.removeSubcategory(id);
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

  // --- UNIDADES FÍSICAS / EQUIPOS EN INVENTARIO ---

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
    @Query('subcategoriaId') subcategoriaId?: string,
    @Query('estado') estado?: string,
  ) {
    const data = await this.inventoryService.findAll(empresaId, sucursalId, categoriaId, subcategoriaId, estado);
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
