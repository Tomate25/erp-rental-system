import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './services/mail.service';
import { OutboxService } from './services/outbox.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [MailService, OutboxService],
  exports: [MailService, OutboxService],
})
export class MailModule {}
