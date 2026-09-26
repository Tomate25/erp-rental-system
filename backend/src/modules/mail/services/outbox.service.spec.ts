import { CanalNotificacion, EstadoNotificacion } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailService } from './mail.service';
import { OutboxService } from './outbox.service';

describe('OutboxService', () => {
  const baseNotification = {
    id: 'notification-1',
    empresaId: 'empresa-1',
    clienteId: 'cliente-1',
    evento: 'COTIZACION_ENVIADA',
    canal: CanalNotificacion.EMAIL,
    destino: 'cliente@example.com',
    asunto: 'Cotización',
    mensaje: '<p>Cotización</p>',
    estado: EstadoNotificacion.PENDIENTE,
    tokenPublico: null,
    claveIdempotencia: 'cotizacion:1:v1',
    intentos: 0,
    procesando: false,
    ultimoIntento: null,
    fechaEnvio: null,
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('encola de forma idempotente mediante upsert', async () => {
    const prisma = {
      notificacion: { upsert: jest.fn().mockResolvedValue(baseNotification) },
    };
    const service = new OutboxService(
      prisma as unknown as PrismaService,
      {} as MailService,
    );

    await service.enqueueNotification({
      evento: 'COTIZACION_ENVIADA',
      destino: 'cliente@example.com',
      asunto: 'Cotización',
      mensaje: '<p>Cotización</p>',
      claveIdempotencia: 'cotizacion:1:v1',
    });

    expect(prisma.notificacion.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { claveIdempotencia: 'cotizacion:1:v1' },
      }),
    );
  });

  it('reclama y marca como enviado un correo entregado', async () => {
    const prisma = {
      notificacion: {
        updateMany: jest
          .fn()
          .mockResolvedValueOnce({ count: 0 })
          .mockResolvedValueOnce({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([baseNotification]),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const mail = { sendMail: jest.fn().mockResolvedValue({ success: true }) };
    const service = new OutboxService(
      prisma as unknown as PrismaService,
      mail as unknown as MailService,
    );

    const result = await service.processPending();

    expect(result).toEqual({ processed: 1, sent: 1, failed: 0 });
    expect(prisma.notificacion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: EstadoNotificacion.ENVIADO,
          procesando: false,
        }),
      }),
    );
  });

  it('agota el tercer intento sin guardar el error sensible del proveedor', async () => {
    const prisma = {
      notificacion: {
        updateMany: jest
          .fn()
          .mockResolvedValueOnce({ count: 0 })
          .mockResolvedValueOnce({ count: 1 }),
        findMany: jest
          .fn()
          .mockResolvedValue([{ ...baseNotification, intentos: 2 }]),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const mail = {
      sendMail: jest.fn().mockResolvedValue({
        success: false,
        error: 'provider-secret-diagnostic',
      }),
    };
    const service = new OutboxService(
      prisma as unknown as PrismaService,
      mail as unknown as MailService,
    );

    await service.processPending();

    expect(prisma.notificacion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: EstadoNotificacion.FALLIDO,
          error: expect.not.stringContaining('provider-secret-diagnostic'),
        }),
      }),
    );
  });
});
