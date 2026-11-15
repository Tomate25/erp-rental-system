import { Module } from '@nestjs/common';
import { OperationsService } from './services/operations.service';
import { OperationsController } from './controllers/operations.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NumberingModule } from '../numbering/numbering.module';

@Module({
  imports: [PrismaModule, NumberingModule],
  controllers: [OperationsController],
  providers: [OperationsService],
  exports: [OperationsService],
})
export class OperationsModule {}
