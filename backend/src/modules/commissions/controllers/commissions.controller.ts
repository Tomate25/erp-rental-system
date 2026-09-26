import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
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
    return {
      success: true,
      data: await this.commissionsService.findAll(empresaId),
    };
  }

  @Get('team-settlement')
  async getTeamSettlement(@GetUser('empresaId') empresaId: string) {
    return {
      success: true,
      data: await this.commissionsService.getTeamSettlement(empresaId),
    };
  }

  @Post('seed-defaults')
  async seedDefaultRules(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    return {
      success: true,
      message: 'Reglas predeterminadas aseguradas con éxito',
      data: await this.commissionsService.seedDefaultRules(
        empresaId,
        usuarioId,
      ),
    };
  }

  @Post('seed-all-sellers')
  async seedRulesForAllSellers(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    return {
      success: true,
      message:
        'Escalas de comisión universales aplicadas a todos los vendedores con éxito',
      data: await this.commissionsService.seedRulesForAllSellers(
        empresaId,
        usuarioId,
      ),
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

  @Post()
  async create(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Body() createDto: CreateReglaComisionDto,
  ) {
    return {
      success: true,
      message: 'Regla de comisión creada con éxito',
      data: await this.commissionsService.create(
        createDto,
        empresaId,
        usuarioId,
      ),
    };
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Body() updateDto: UpdateReglaComisionDto,
  ) {
    return {
      success: true,
      message: 'Regla de comisión actualizada con éxito',
      data: await this.commissionsService.update(
        id,
        updateDto,
        empresaId,
        usuarioId,
      ),
    };
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    return {
      success: true,
      message: 'Regla de comisión eliminada con éxito',
      data: await this.commissionsService.remove(id, empresaId, usuarioId),
    };
  }
}
