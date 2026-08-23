import { Module } from '@nestjs/common';
import { HorometrosService } from './services/horometros.service';
import { HorometrosController } from './controllers/horometros.controller';

@Module({
  controllers: [HorometrosController],
  providers: [HorometrosService],
  exports: [HorometrosService],
})
export class HorometrosModule {}
