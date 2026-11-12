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
import { PromotionsService } from '../services/promotions.service';
import { CreatePromocionDto } from '../dto/create-promocion.dto';
import { UpdatePromocionDto } from '../dto/update-promocion.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('promotions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async create(
    @Body() createDto: CreatePromocionDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.promotionsService.create(
      createDto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Promoción registrada con éxito en el catálogo',
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
  )
  async findAll(
    @GetUser('empresaId') empresaId: string,
    @Query('activo') activo?: string,
    @Query('search') search?: string,
  ) {
    const activoBool =
      activo !== undefined ? activo === 'true' || activo === '1' : undefined;

    const data = await this.promotionsService.findAll(empresaId, {
      activo: activoBool,
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
  )
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.promotionsService.findOne(id, empresaId);
    return {
      success: true,
      data,
    };
  }

  @Put(':id')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdatePromocionDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.promotionsService.update(
      id,
      updateDto,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Promoción actualizada con éxito',
      data,
    };
  }

  @Delete(':id')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const result = await this.promotionsService.remove(
      id,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      ...result,
    };
  }
}
