import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditoriaService } from './services/auditoria.service';
import { AuditoriaController } from './controllers/auditoria.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
