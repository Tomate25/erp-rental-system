import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('pending-quotations')
  getPendingQuotations() {
    return this.billingService.getPendingQuotations();
  }

  @Post('invoice-quote/:id')
  invoiceQuotation(@Param('id') id: string, @Body() payload: any) {
    return this.billingService.invoiceQuotation(id, payload);
  }

  @Get('invoices')
  getInvoices() {
    return this.billingService.getInvoices();
  }

  @Post('invoices/:id/pay')
  markAsPaid(@Param('id') id: string) {
    return this.billingService.markAsPaid(id);
  }
}
