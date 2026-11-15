import { Module } from '@nestjs/common';
import { AccountingService } from './services/accounting.service';
import { AccountingController } from './controllers/accounting.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NumberingModule } from '../numbering/numbering.module';

@Module({
  imports: [PrismaModule, NumberingModule],
  controllers: [AccountingController],
  providers: [AccountingService],
  exports: [AccountingService],
})
export class AccountingModule {}
