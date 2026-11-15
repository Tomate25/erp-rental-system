import { Module } from '@nestjs/common';
import { MaintenanceService } from './services/maintenance.service';
import { MaintenanceController } from './controllers/maintenance.controller';
import { NumberingModule } from '../numbering/numbering.module';

@Module({
  imports: [NumberingModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
