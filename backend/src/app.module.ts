import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { BillingModule } from './modules/billing/billing.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { OperationsModule } from './modules/operations/operations.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { HorometrosModule } from './modules/horometros/horometros.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    ClientsModule,
    RolesModule,
    UsersModule,
    InventoryModule,
    QuotationsModule,
    AvailabilityModule,
    BillingModule,
    ContractsModule,
    OperationsModule,
    MaintenanceModule,
    HorometrosModule,
    AccountingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
