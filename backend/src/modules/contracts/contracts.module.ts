import { Module } from '@nestjs/common';
import { ContractsService } from './services/contracts.service';
import { ContractsController } from './controllers/contracts.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
