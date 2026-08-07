import { Module } from '@nestjs/common';
import { QuotationsController } from './controllers/quotations.controller';
import { QuotationsService } from './services/quotations.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [QuotationsController],
  providers: [QuotationsService]
})
export class QuotationsModule {}
