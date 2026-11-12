import { Module } from '@nestjs/common';
import { ProvidersService } from './services/providers.service';
import { ProvidersController } from './controllers/providers.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
