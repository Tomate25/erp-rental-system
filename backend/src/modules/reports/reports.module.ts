import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AccountingModule } from '../accounting/accounting.module';
import { CxcModule } from '../cxc/cxc.module';
import { QuotationsModule } from '../quotations/quotations.module';
import { ReportsController } from './controllers/reports.controller';
import { ReportsService } from './services/reports.service';
import { DocumentVoidingService } from './services/document-voiding.service';

@Module({
  imports: [PrismaModule, AccountingModule, CxcModule, QuotationsModule],
  controllers: [ReportsController],
  providers: [ReportsService, DocumentVoidingService],
  exports: [ReportsService, DocumentVoidingService],
})
export class ReportsModule {}
