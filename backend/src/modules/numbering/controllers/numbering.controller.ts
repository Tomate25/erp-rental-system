import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { NumberingService } from '../services/numbering.service';
import { CreateSerieDto } from '../dto/create-serie.dto';
import { UpdateSerieDto } from '../dto/update-serie.dto';
import { QuerySeriesDto } from '../dto/query-series.dto';
import { PreviewSerieDto } from '../dto/preview-serie.dto';

@Controller('numbering')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NumberingController {
  constructor(private readonly numberingService: NumberingService) {}

  @Get()
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION', 'OPERACIONES')
  async findAll(
    @GetUser('empresaId') empresaId: string,
    @Query() query: QuerySeriesDto,
  ) {
    const data = await this.numberingService.findAll(empresaId, query);
    return {
      success: true,
      data,
    };
  }

  @Post('preview')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION', 'OPERACIONES')
  preview(@Body() dto: PreviewSerieDto) {
    const data = this.numberingService.preview(dto);
    return {
      success: true,
      data,
    };
  }

  @Get('sucursales')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION', 'OPERACIONES')
  async getSucursales(@GetUser('empresaId') empresaId: string) {
    const data = await this.numberingService.getSucursales(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION', 'OPERACIONES')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.numberingService.findOne(id, empresaId);
    return {
      success: true,
      data,
    };
  }

  @Post()
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD')
  async create(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Body() dto: CreateSerieDto,
  ) {
    const data = await this.numberingService.create(empresaId, dto, usuarioId);
    return {
      success: true,
      message: 'Serie de numeración creada correctamente',
      data,
    };
  }

  @Put(':id')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
    @Body() dto: UpdateSerieDto,
  ) {
    const data = await this.numberingService.update(id, empresaId, dto);
    return {
      success: true,
      message: 'Serie de numeración actualizada correctamente',
      data,
    };
  }

  @Patch(':id/activate')
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD')
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.numberingService.activate(id, empresaId);
    return {
      success: true,
      message: 'Serie de numeración activada como serie oficial',
      data,
    };
  }
}
