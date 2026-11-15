import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccountingService } from '../services/accounting.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import {
  AnularAsientoDto,
  CrearAsientoManualDto,
  GuardarSaldosInicialesDto,
  ImportarExcelContableDto,
} from '../dto/accounting.dto';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // --- CATÁLOGO OFICIAL DE CUENTAS BM CONSTRUCCIONES (250 Cuentas Detalle / 296 Nodos) ---
  // Accesible como catálogo base estándar para toda la aplicación
  @Get('catalogo')
  async getCatalogoCuentas(
    @Query('nivel') nivel?: string,
    @Query('q') q?: string,
    @Query('empresaId') empresaId?: string,
  ) {
    const data = await this.accountingService.getCatalogoCuentas(
      nivel ? Number(nivel) : undefined,
      q,
      empresaId,
    );
    return {
      success: true,
      data,
    };
  }

  // --- DATOS Y SALDOS INICIALES + IMPORTACIÓN DE EXCEL BM ---
  @Get('saldos-iniciales')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION')
  async getSaldosIniciales(@GetUser('empresaId') empresaId: string) {
    const data = await this.accountingService.getSaldosIniciales(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Put('saldos-iniciales')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD')
  async guardarSaldosIniciales(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Body() dto: GuardarSaldosInicialesDto,
  ) {
    const data = await this.accountingService.guardarSaldosIniciales(
      empresaId,
      dto,
      usuarioId,
    );
    return {
      success: true,
      data,
    };
  }

  @Post('saldos-iniciales/importar')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD')
  async importarExcelContable(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Body() dto: ImportarExcelContableDto,
  ) {
    const data = await this.accountingService.importarCatalogoYSaldos(
      empresaId,
      dto,
      usuarioId,
    );
    return {
      success: true,
      data,
    };
  }

  @Post('saldos-iniciales/restaurar-oficial')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD')
  async restaurarSaldosOficialesBm(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.accountingService.cargarSaldosOficialesBm(
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      data,
    };
  }

  // --- BALANZA DE COMPROBACIÓN (TRIAL BALANCE) ---
  @Get('balanza-comprobacion')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION')
  async getBalanzaComprobacion(
    @GetUser('empresaId') empresaId: string,
    @Query('sucursalId') sucursalId?: string,
  ) {
    const data = await this.accountingService.getBalanzaComprobacion(
      empresaId,
      sucursalId,
    );
    return {
      success: true,
      data,
    };
  }

  // --- LIBRO DIARIO DE PÓLIZAS AUTOMÁTICAS ---
  @Get('libro-diario')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION')
  async getLibroDiario(
    @GetUser('empresaId') empresaId: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.accountingService.getLibroDiario(
      empresaId,
      limit ? Number(limit) : 50,
    );
    return {
      success: true,
      data,
    };
  }

  // --- EXPORTACIÓN A QUICKBOOKS (IIF DESKTOP / CSV ONLINE) ---
  @Get('quickbooks-export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION')
  async exportQuickBooks(
    @GetUser('empresaId') empresaId: string,
    @Query('formato') formato: 'IIF' | 'CSV' = 'IIF',
  ) {
    const data = await this.accountingService.exportQuickBooks(
      empresaId,
      formato === 'CSV' ? 'CSV' : 'IIF',
    );
    return {
      success: true,
      data,
    };
  }

  // --- REPORTES FINANCIEROS Y OPERATIVOS EXISTENTES ---
  @Get('cxc')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION')
  async getCuentasPorCobrar(@GetUser('empresaId') empresaId: string) {
    const data = await this.accountingService.getCuentasPorCobrar(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Get('cxp')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION')
  async getCuentasPorPagar(@GetUser('empresaId') empresaId: string) {
    const data = await this.accountingService.getCuentasPorPagar(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Get('estado-resultados')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION')
  async getEstadoResultados(@GetUser('empresaId') empresaId: string) {
    const data = await this.accountingService.getEstadoResultados(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Get('balance-general')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION')
  async getBalanceGeneral(@GetUser('empresaId') empresaId: string) {
    const data = await this.accountingService.getBalanceGeneral(empresaId);
    return {
      success: true,
      data,
    };
  }

  // --- COMPROBANTES Y ASIENTOS CONTABLES (MANUALES Y OPERATIVOS) ---
  @Get('asientos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION')
  async listarAsientos(
    @GetUser('empresaId') empresaId: string,
    @Query('origenModulo') origenModulo?: string,
    @Query('tipoAsiento') tipoAsiento?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.accountingService.listarAsientos(empresaId, {
      origenModulo,
      tipoAsiento,
      limit: limit ? Number(limit) : 100,
    });
    return {
      success: true,
      data,
    };
  }

  @Post('asientos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD')
  async crearAsientoManual(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Body() dto: CrearAsientoManualDto,
  ) {
    const data = await this.accountingService.crearAsientoManual(
      empresaId,
      dto,
      usuarioId,
    );
    return {
      success: true,
      data,
    };
  }

  @Post('asientos/:id/anular')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'GERENTE', 'CONTABILIDAD')
  async anularAsientoManual(
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
    @Param('id') id: string,
    @Body() dto: AnularAsientoDto,
  ) {
    const data = await this.accountingService.anularAsientoManual(
      empresaId,
      id,
      usuarioId,
      dto?.motivo,
    );
    return {
      success: true,
      data,
    };
  }
}
