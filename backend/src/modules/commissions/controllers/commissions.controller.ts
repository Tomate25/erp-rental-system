import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CalculateCommissionDto } from '../dto/calculate-commission.dto';
import { CreateReglaComisionDto } from '../dto/create-regla-comision.dto';
import { UpdateReglaComisionDto } from '../dto/update-regla-comision.dto';
import { CommissionsService } from '../services/commissions.service';

@Controller('commissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get()
  async findAll(@GetUser('empresaId') empresaId: string) {
    return { success: true, data: await this.commissionsService.findAll(empresaId) };
  }

  @Post()
  async create(
    @GetUser('empresaId') empresaId: string,
    @Body() createDto: CreateReglaComisionDto,
  ) {
    return {
      success: true,
      message: 'Regla de comisión creada con éxito',
      data: await this.commissionsService.create(createDto, empresaId),
    };
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
    @Body() updateDto: UpdateReglaComisionDto,
  ) {
    return {
      success: true,
      message: 'Regla de comisión actualizada con éxito',
      data: await this.commissionsService.update(id, updateDto, empresaId),
    };
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    return {
      success: true,
      message: 'Regla de comisión eliminada con éxito',
      data: await this.commissionsService.remove(id, empresaId),
    };
  }

  @Post('seed-defaults')
  async seedDefaultRules(@GetUser('empresaId') empresaId: string) {
    return {
      success: true,
      message: 'Reglas predeterminadas aseguradas con éxito',
      data: await this.commissionsService.seedDefaultRules(empresaId),
    };
  }

  @Post('calculate')
  async calculate(
    @GetUser('empresaId') empresaId: string,
    @Body() calculateDto: CalculateCommissionDto,
  ) {
    return {
      success: true,
      data: await this.commissionsService.calculateCommission(
        empresaId,
        calculateDto.usuarioId,
        calculateDto.montoVentas,
      ),
    };
  }
}
