import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CanalNotificacion, EstadoNotificacion, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailService } from './mail.service';

export interface EnqueueNotificationInput {
  empresaId?: string;
  clienteId?: string;
  evento: string;
  canal?: CanalNotificacion;
  destino: string;
  asunto: string;
  mensaje: string;
  tokenPublico?: string;
  claveIdempotencia?: string;
}

@Injectable()
export class OutboxService implements OnModuleInit {
  private readonly logger = new Logger(OutboxService.name);
  private readonly maxAttempts = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test') return;
    const timer = setInterval(() => {
      void this.processPending().catch(() => undefined);
    }, 30_000);
    timer.unref();
    void this.processPending().catch(() => undefined);
  }

  async enqueueNotification(
    input: EnqueueNotificationInput,
    txPrisma?: Prisma.TransactionClient,
  ) {
    const db: Prisma.TransactionClient = txPrisma ?? this.prisma;
    const data: Prisma.NotificacionCreateInput = {
      empresa: input.empresaId
        ? { connect: { id: input.empresaId } }
        : undefined,
      cliente: input.clienteId
        ? { connect: { id: input.clienteId } }
        : undefined,
      evento: input.evento,
      canal: input.canal || CanalNotificacion.EMAIL,
      destino: input.destino,
      asunto: input.asunto,
      mensaje: input.mensaje,
      estado: EstadoNotificacion.PENDIENTE,
      tokenPublico: input.tokenPublico,
      claveIdempotencia: input.claveIdempotencia,
    };

    if (input.claveIdempotencia) {
      return db.notificacion.upsert({
        where: { claveIdempotencia: input.claveIdempotencia },
        create: data,
        update: {},
      });
    }
    return db.notificacion.create({ data });
  }

  async processPending(
    limit = 10,
  ): Promise<{ processed: number; sent: number; failed: number }> {
    const staleBefore = new Date(Date.now() - 5 * 60_000);
    await this.prisma.notificacion.updateMany({
      where: {
        estado: EstadoNotificacion.PENDIENTE,
        procesando: true,
        ultimoIntento: { lt: staleBefore },
      },
      data: { procesando: false },
    });

    const pending = await this.prisma.notificacion.findMany({
      where: {
        estado: EstadoNotificacion.PENDIENTE,
        procesando: false,
        intentos: { lt: this.maxAttempts },
      },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });

    let sent = 0;
    let failed = 0;
    let processed = 0;
    for (const notification of pending) {
      const claim = await this.prisma.notificacion.updateMany({
        where: {
          id: notification.id,
          estado: EstadoNotificacion.PENDIENTE,
          procesando: false,
        },
        data: {
          procesando: true,
          intentos: { increment: 1 },
          ultimoIntento: new Date(),
        },
      });
      if (claim.count !== 1) continue;
      processed += 1;

      try {
        if (notification.canal !== CanalNotificacion.EMAIL) {
          throw new Error('Canal de notificación no soportado');
        }
        const result = await this.mailService.sendMail({
          to: notification.destino,
          subject: notification.asunto || 'Notificación ERP',
          html: notification.mensaje,
        });
        if (!result.success) throw new Error('Fallo del transporte SMTP');

        await this.prisma.notificacion.update({
          where: { id: notification.id },
          data: {
            estado: EstadoNotificacion.ENVIADO,
            procesando: false,
            fechaEnvio: new Date(),
            error: null,
          },
        });
        sent += 1;
      } catch (_error: unknown) {
        const attempts = notification.intentos + 1;
        const exhausted = attempts >= this.maxAttempts;
        this.logger.warn(
          `Falló el intento ${attempts} de la notificación ${notification.id}`,
        );
        await this.prisma.notificacion.update({
          where: { id: notification.id },
          data: {
            estado: exhausted
              ? EstadoNotificacion.FALLIDO
              : EstadoNotificacion.PENDIENTE,
            procesando: false,
            error: exhausted
              ? 'No fue posible entregar el mensaje después de varios intentos.'
              : 'Entrega pendiente de reintento.',
          },
        });
        failed += 1;
      }
    }

    return { processed, sent, failed };
  }
}
