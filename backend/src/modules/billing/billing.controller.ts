import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('pending-quotations')
  @Roles('ADMIN', 'GERENTE', 'FACTURACION', 'COMERCIAL')
  async getPendingQuotations(@GetUser('empresaId') empresaId: string) {
    const data = await this.billingService.getPendingQuotations(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Get('pending-cortes')
  @Roles('ADMIN', 'GERENTE', 'FACTURACION', 'COMERCIAL')
  async getPendingCortes(@GetUser('empresaId') empresaId: string) {
    const data = await this.billingService.getPendingCortes(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Get('contract-cortes')
  @Roles('ADMIN', 'GERENTE', 'FACTURACION', 'COMERCIAL')
  async getContractCortes(@GetUser('empresaId') empresaId: string) {
    const data = await this.billingService.getContractCortes(empresaId);
    return { success: true, data };
  }

  @Post('invoice-quote/:id')
  @Roles('ADMIN', 'GERENTE', 'FACTURACION')
  async invoiceQuotation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: CreateInvoiceDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.billingService.invoiceQuotation(
      id,
      payload,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Factura generada con éxito a partir de Cotización Comercial',
      data,
    };
  }

  @Post('invoice-corte/:corteId')
  @Roles('ADMIN', 'GERENTE', 'FACTURACION')
  async invoiceCorte(
    @Param('corteId', ParseUUIDPipe) corteId: string,
    @Body() payload: CreateInvoiceDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.billingService.invoiceCorte(
      corteId,
      payload,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message:
        'Factura generada con éxito a partir del Corte de Facturación de Contrato',
      data,
    };
  }

  @Get('invoices')
  @Roles('ADMIN', 'GERENTE', 'FACTURACION', 'CONTABILIDAD', 'COMERCIAL')
  async getInvoices(@GetUser('empresaId') empresaId: string) {
    const data = await this.billingService.getInvoices(empresaId);
    return {
      success: true,
      data,
    };
  }

  @Get('damage-returns')
  @Roles('ADMIN', 'GERENTE', 'FACTURACION', 'MANTENIMIENTO', 'OPERACIONES')
  async getDamageReturns(@GetUser('empresaId') empresaId: string) {
    const data = await this.billingService.getDamageReturns(empresaId);
    return { success: true, data };
  }

  @Post('damage-returns/:id/invoice')
  @Roles('ADMIN', 'GERENTE', 'FACTURACION')
  async invoiceDamageReturn(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.billingService.invoiceDamageReturn(id, empresaId, usuarioId);
    return { success: true, data };
  }

  @Post('invoices/:id/payment')
  @Roles('ADMIN', 'GERENTE', 'FACTURACION')
  async registerPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: RegisterPaymentDto,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.billingService.registerPayment(
      id,
      payload,
      empresaId,
      usuarioId,
    );
    return {
      success: true,
      message: 'Pago registrado con éxito',
      data,
    };
  }

  @Post('invoices/:id/pay')
  @Roles('ADMIN', 'GERENTE', 'FACTURACION')
  async markAsPaid(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser('empresaId') empresaId: string,
    @GetUser('id') usuarioId: string,
  ) {
    const data = await this.billingService.markAsPaid(id, empresaId, usuarioId);
    return {
      success: true,
      message: 'Factura marcada como pagada con éxito',
      data,
    };
  }
}
