import { Module } from '@nestjs/common';
import { QuotationsController } from './controllers/quotations.controller';
import { QuotationsService } from './services/quotations.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [PrismaModule, AvailabilityModule],
  controllers: [QuotationsController],
  providers: [QuotationsService],
})
export class QuotationsModule {}
