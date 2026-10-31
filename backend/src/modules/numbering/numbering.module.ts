import { Module } from '@nestjs/common';
import { NumberingService } from './services/numbering.service';
import { NumberingController } from './controllers/numbering.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NumberingController],
  providers: [NumberingService],
  exports: [NumberingService],
})
export class NumberingModule {}
