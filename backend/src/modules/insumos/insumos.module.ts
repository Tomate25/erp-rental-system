import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InsumosService } from './services/insumos.service';
import { InsumosController } from './controllers/insumos.controller';

@Module({
  imports: [PrismaModule],
  controllers: [InsumosController],
  providers: [InsumosService],
  exports: [InsumosService],
})
export class InsumosModule {}
