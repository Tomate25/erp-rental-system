import { Module } from '@nestjs/common';
import { QuotationsController } from './controllers/quotations.controller';
import { QuotationsService } from './services/quotations.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AvailabilityModule } from '../availability/availability.module';
import { NumberingModule } from '../numbering/numbering.module';

@Module({
  imports: [PrismaModule, AvailabilityModule, NumberingModule],
  controllers: [QuotationsController],
  providers: [QuotationsService],
})
export class QuotationsModule {}
