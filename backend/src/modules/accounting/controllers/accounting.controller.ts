import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AccountingService } from '../services/accounting.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  // --- CATÁLOGO OFICIAL DE CUENTAS (207 Cuentas BM Construcciones) ---
  // Accesible como catálogo base estándar para toda la aplicación
  @Get('catalogo')
  async getCatalogoCuentas(
    @Query('nivel') nivel?: string,
    @Query('q') q?: string,
  ) {
    const data = await this.accountingService.getCatalogoCuentas(
      nivel ? Number(nivel) : undefined,
      q,
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
}
