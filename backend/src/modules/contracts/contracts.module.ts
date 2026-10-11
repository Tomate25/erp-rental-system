import { Module } from '@nestjs/common';
import { ContractsService } from './services/contracts.service';
import { ContractsController } from './controllers/contracts.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AvailabilityModule } from '../availability/availability.module';

@Module({
  imports: [PrismaModule, AvailabilityModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
