import { Module } from '@nestjs/common';
import { MaintenanceService } from './services/maintenance.service';
import { MaintenanceController } from './controllers/maintenance.controller';

@Module({
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
