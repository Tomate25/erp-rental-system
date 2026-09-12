import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommissionsController } from './controllers/commissions.controller';
import { CommissionsService } from './services/commissions.service';

@Module({
  imports: [AuthModule],
  controllers: [CommissionsController],
  providers: [CommissionsService],
  exports: [CommissionsService],
})
export class CommissionsModule {}
