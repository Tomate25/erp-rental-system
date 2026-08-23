import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('pending-quotations')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async getPendingQuotations(@GetUser('empresaId') empresaId: string) {
    const data = await this.billingService.getPendingQuotations(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Get('pending-cortes')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async getPendingCortes(@GetUser('empresaId') empresaId: string) {
    const data = await this.billingService.getPendingCortes(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Post('invoice-quote/:id')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async invoiceQuotation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: any,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.billingService.invoiceQuotation(id, payload, empresaId);
    return {
      success: true,
      message: 'Factura generada con éxito a partir de Cotización Comercial',
      data,
    };
  }

  @Post('invoice-corte/:corteId')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async invoiceCorte(
    @Param('corteId', ParseUUIDPipe) corteId: string,
    @Body() payload: any,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.billingService.invoiceCorte(corteId, payload, empresaId);
    return {
      success: true,
      message: 'Factura generada con éxito a partir del Corte de Facturación de Contrato',
      data,
    };
  }

  @Get('invoices')
  @Roles('ADMIN', 'GERENTE', 'COMERCIAL')
  async getInvoices(@GetUser('empresaId') empresaId: string) {
    const data = await this.billingService.getInvoices(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Post('invoices/:id/pay')
  @Roles('ADMIN', 'GERENTE')
  async markAsPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
  ) {
    const data = await this.billingService.markAsPaid(id, empresaId);
    return {
      success: true,
      message: 'Factura marcada como pagada con éxito',
      data,
    };
  }
}
