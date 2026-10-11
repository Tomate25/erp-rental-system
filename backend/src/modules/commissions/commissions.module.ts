import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommissionsController } from './controllers/commissions.controller';
import { CommissionsService } from './services/commissions.service';
import { CommissionsV2Controller } from './controllers/commissions-v2.controller';
import { CommissionsV2Service } from './services/commissions-v2.service';

@Module({
  imports: [AuthModule],
  controllers: [CommissionsController, CommissionsV2Controller],
  providers: [CommissionsService, CommissionsV2Service],
  exports: [CommissionsService, CommissionsV2Service],
})
export class CommissionsModule {}
