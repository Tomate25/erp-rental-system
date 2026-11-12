import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Patch,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { InsumosService } from '../services/insumos.service';
import { CreateInsumoDto } from '../dto/create-insumo.dto';
import { UpdateInsumoDto } from '../dto/update-insumo.dto';
import { AjustarStockDto } from '../dto/ajustar-stock.dto';
import { RegistrarMovimientoDto } from '../dto/registrar-movimiento.dto';
import { CreateCategoriaInsumoDto } from '../dto/create-categoria-insumo.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('insumos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InsumosController {
  constructor(private readonly insumosService: InsumosService) {}

  @Post()
  @Roles('ADMIN', 'GERENTE', 'INVENTARIO', 'MANTENIMIENTO')
  async create(
    @Body() createDto: CreateInsumoDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.insumosService.create(
      createDto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Insumo registrado con éxito en el catálogo',
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
    @Query('categoria') categoria?: string,
    @Query('activo') activo?: string,
    @Query('search') search?: string,
    @Query('bajoStock') bajoStock?: string,
  ) {
    const activoBool =
      activo !== undefined ? activo === 'true' || activo === '1' : undefined;
    const bajoStockBool =
      bajoStock !== undefined
        ? bajoStock === 'true' || bajoStock === '1'
        : undefined;

    const data = await this.insumosService.findAll(empresaId, {
      categoria,
      activo: activoBool,
      search,
      bajoStock: bajoStockBool,
    });

    return {
      success: true,
      data,
    };
  }

  @Post('movimientos')
  @Roles('ADMIN', 'GERENTE', 'INVENTARIO', 'MANTENIMIENTO')
  async registrarMovimiento(
    @Body() dto: RegistrarMovimientoDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.insumosService.registrarMovimiento(
      dto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: `Movimiento de ${dto.tipo.toLowerCase()} registrado con éxito`,
      data,
    };
  }

  @Get('movimientos')
  @Roles(
    'ADMIN',
    'GERENTE',
    'COMERCIAL',
    'OPERACIONES',
    'FACTURACION',
    'INVENTARIO',
    'MANTENIMIENTO',
  )
  async getMovimientos(
    @GetUser('empresaId') empresaId: string,
    @Query('insumoId') insumoId?: string,
    @Query('tipo') tipo?: 'ENTRADA' | 'SALIDA' | 'AJUSTE',
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const data = await this.insumosService.findMovimientos(empresaId, {
      insumoId,
      tipo,
      search,
      limit,
      offset,
    });
    return {
      success: true,
      data,
    };
  }

  @Post('categorias')
  @Roles('ADMIN', 'GERENTE', 'INVENTARIO', 'MANTENIMIENTO')
  async createCategoria(
    @Body() dto: CreateCategoriaInsumoDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.insumosService.createCategoria(
      dto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Categoría de insumo registrada con éxito',
      data,
    };
  }

  @Get('categorias')
  @Roles(
    'ADMIN',
    'GERENTE',
    'COMERCIAL',
    'OPERACIONES',
    'FACTURACION',
    'INVENTARIO',
    'MANTENIMIENTO',
  )
  async getCategorias(@GetUser('empresaId') empresaId: string) {
    const data = await this.insumosService.getCategorias(empresaId);
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
    const data = await this.insumosService.findOne(id, empresaId);
    return {
      success: true,
      data,
    };
  }

  @Put(':id')
  @Roles('ADMIN', 'GERENTE', 'INVENTARIO', 'MANTENIMIENTO')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateInsumoDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.insumosService.update(
      id,
      updateDto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Insumo actualizado con éxito',
      data,
    };
  }

  @Patch(':id/ajustar-stock')
  @Roles('ADMIN', 'GERENTE', 'INVENTARIO', 'MANTENIMIENTO')
  async ajustarStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AjustarStockDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.insumosService.ajustarStock(
      id,
      dto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Stock de insumo ajustado con éxito',
      data,
    };
  }

  @Delete(':id')
  @Roles('ADMIN', 'GERENTE', 'INVENTARIO')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const result = await this.insumosService.remove(id, empresaId, usuarioId);
    return {
      success: true,
      ...result,
    };
  }
}
