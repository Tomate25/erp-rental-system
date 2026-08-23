import { Module } from '@nestjs/common';
import { OperationsService } from './services/operations.service';
import { OperationsController } from './controllers/operations.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OperationsController],
  providers: [OperationsService],
  exports: [OperationsService],
})
export class OperationsModule {}
