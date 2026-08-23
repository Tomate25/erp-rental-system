import { Controller, Get, UseGuards } from '@nestjs/common';
import { AccountingService } from '../services/accounting.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('accounting')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('cxc')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES')
  async getCuentasPorCobrar(@GetUser('empresaId') empresaId: string) {
    const data = await this.accountingService.getCuentasPorCobrar(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Get('cxp')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES')
  async getCuentasPorPagar(@GetUser('empresaId') empresaId: string) {
    const data = await this.accountingService.getCuentasPorPagar(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Get('estado-resultados')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES')
  async getEstadoResultados(@GetUser('empresaId') empresaId: string) {
    const data = await this.accountingService.getEstadoResultados(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Get('balance-general')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES')
  async getBalanceGeneral(@GetUser('empresaId') empresaId: string) {
    const data = await this.accountingService.getBalanceGeneral(empresaId);
    return {
      success: true,
      data,
    };
  }
}
