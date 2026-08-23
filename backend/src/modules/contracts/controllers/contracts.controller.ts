import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ContractsService } from '../services/contracts.service';
import { CreateContractFromQuotationDto, CreateDirectContractDto } from '../dto/create-contract.dto';
import { GenerateCortesDto, CreateManualCorteDto } from '../dto/create-corte.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('contracts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post('direct')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async createDirect(
    @Body() dto: CreateDirectContractDto,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.contractsService.createDirect(dto, empresaId);
    return {
      success: true,
      message: `Contrato directo ${data.codigo} generado exitosamente`,
      data,
    };
  }

  @Post('from-quotation')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async createFromQuotation(
    @Body() dto: CreateContractFromQuotationDto,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.contractsService.createFromQuotation(dto, empresaId);
    return {
      success: true,
      message: `Contrato ${data.codigo} generado exitosamente a partir de la cotización Aprobada`,
      data,
    };
  }

  @Post(':id/generate-cortes')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async generateCortes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: GenerateCortesDto,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.contractsService.generateCortes(id, dto.periodoDias || 30, empresaId);
    return {
      success: true,
      message: 'Plan de cortes de facturación proyectado exitosamente',
      data,
    };
  }

  @Post(':id/manual-corte')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async createManualCorte(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateManualCorteDto,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.contractsService.createManualCorte(id, dto.fechaCorte, dto.monto, empresaId);
    return {
      success: true,
      message: 'Corte de facturación personalizado creado exitosamente',
      data,
    };
  }

  @Get(':id/cortes')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES')
  async getCortes(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.contractsService.getCortes(id, empresaId);
    return {
      success: true,
      data,
    };
  }

  @Get()
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'FACTURACION', 'INVENTARIO', 'MANTENIMIENTO')
  async findAll(@GetUser('empresaId') empresaId: string) {
    const data = await this.contractsService.findAll(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Get(':id')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'FACTURACION', 'INVENTARIO', 'MANTENIMIENTO')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.contractsService.findOne(id, empresaId);
    return {
      success: true,
      data,
    };
  }
}
