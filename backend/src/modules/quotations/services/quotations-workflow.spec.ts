import { Test, TestingModule } from '@nestjs/testing';
import { QuotationsService } from './quotations.service';
import { QuotationsController } from '../controllers/quotations.controller';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailService } from '../../mail/services/mail.service';
import { OutboxService } from '../../mail/services/outbox.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { EstadoCotizacion, Prisma } from '@prisma/client';

describe('QuotationsWorkflow (TAREA-COT-001)', () => {
  let service: QuotationsService;
  let controller: QuotationsController;
  let prisma: any;
  let outboxService: OutboxService;

  const mockTenantA = 'tenant-a-uuid';

  beforeEach(async () => {
    prisma = {
      cotizacion: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      notificacion: {
        create: jest.fn(),
        upsert: jest.fn().mockResolvedValue({ id: 'notif-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      secuenciaNumeracion: { upsert: jest.fn().mockResolvedValue({ ultimoValor: 1 }) },
      contrato: {
        findFirst: jest.fn(),
        create: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      reserva: {
        create: jest.fn(),
      },
      equipo: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      sucursal: {
        findFirst: jest.fn().mockResolvedValue({ id: 'sucursal-1' }),
      },
      cliente: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      usuario: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'user-1', rol: 'ASESOR_COMERCIAL' }),
      },
      auditoria: {
        create: jest.fn().mockResolvedValue({ id: 'aud-1' }),
      },
      $transaction: jest.fn(),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };

    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback(prisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuotationsController],
      providers: [
        QuotationsService,
        MailService,
        OutboxService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'FRONTEND_PUBLIC_URL') return 'http://localhost:5173';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<QuotationsService>(QuotationsService);
    controller = module.get<QuotationsController>(QuotationsController);
    outboxService = module.get<OutboxService>(OutboxService);
  });

  describe('1. Envío al cliente por correo y Outbox', () => {
    it('debe rechazar el envío si el cliente o cotización no tienen correo válido', async () => {
      prisma.cotizacion.findFirst.mockResolvedValue({
        id: 'cot-1',
        empresaId: mockTenantA,
        email: null,
        cliente: { emailFacturacion: null },
        estado: EstadoCotizacion.EN_REVISION,
      });

      await expect(
        service.sendToClient('cot-1', mockTenantA, 'user-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe actualizar estado a ENVIADA, registrar outbox y enviar correo con transporte simulado', async () => {
      const mockQuote = {
        id: 'cot-1',
        empresaId: mockTenantA,
        clienteId: 'cli-1',
        numeroCotizacion: 'COT-2026-0001',
        version: 1,
        email: 'cliente@ejemplo.com',
        tokenPublico: 'token-abc-123',
        estado: EstadoCotizacion.EN_REVISION,
        fechaEmision: new Date('2026-09-24'),
        fechaVence: new Date('2026-10-09'),
        validezDias: 15,
        total: 1500,
        empresa: { nombre: 'Rental Machinery S.A.' },
        cliente: {
          nombre: 'Constructora S.A.',
          emailFacturacion: 'cliente@ejemplo.com',
        },
        items: [],
      };

      prisma.cotizacion.findFirst.mockResolvedValue(mockQuote);
      prisma.cotizacion.update.mockResolvedValue({
        ...mockQuote,
        estado: EstadoCotizacion.ENVIADA,
      });

      const spyEnqueue = jest.spyOn(outboxService, 'enqueueNotification');
      const res = await service.sendToClient('cot-1', mockTenantA, 'user-1');

      expect(res.success).toBe(true);
      expect(prisma.cotizacion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cot-1' },
          data: expect.objectContaining({
            estado: EstadoCotizacion.ENVIADA,
            tokenPublicoRevocado: false,
          }),
        }),
      );
      expect(spyEnqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          empresaId: mockTenantA,
          destino: 'cliente@ejemplo.com',
          evento: 'COTIZACION_ENVIADA',
          tokenPublico: 'token-abc-123',
        }),
        prisma,
      );
      expect(prisma.auditoria.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accion: 'COTIZACION_ENCOLADA',
            entidadId: 'cot-1',
          }),
        }),
      );
    });

    it('debe permitir re-enviar la cotización si ya estaba en estado ENVIADA o VISTA', async () => {
      const mockQuoteSent = {
        id: 'cot-1',
        empresaId: mockTenantA,
        clienteId: 'cli-1',
        numeroCotizacion: 'COT-2026-0001',
        version: 1,
        email: 'cliente@ejemplo.com',
        tokenPublico: 'token-abc-123',
        estado: EstadoCotizacion.VISTA,
        fechaEmision: new Date('2026-09-24'),
        fechaVence: new Date('2026-10-09'),
        validezDias: 15,
        total: 1500,
        empresa: { nombre: 'Rental Machinery S.A.' },
        cliente: {
          nombre: 'Constructora S.A.',
          emailFacturacion: 'cliente@ejemplo.com',
        },
        items: [],
      };

      prisma.cotizacion.findFirst.mockResolvedValue(mockQuoteSent);
      prisma.cotizacion.update.mockResolvedValue({
        ...mockQuoteSent,
        estado: EstadoCotizacion.ENVIADA,
      });

      const res = await service.sendToClient('cot-1', mockTenantA, 'user-1');
      expect(res.success).toBe(true);
      expect(prisma.cotizacion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cot-1' },
          data: expect.objectContaining({
            estado: EstadoCotizacion.ENVIADA,
          }),
        }),
      );
    });

    it('debe rechazar el envío si la cotización ya fue ACEPTADA o CANCELADA', async () => {
      prisma.cotizacion.findFirst.mockResolvedValue({
        id: 'cot-1',
        empresaId: mockTenantA,
        email: 'cliente@ejemplo.com',
        cliente: { emailFacturacion: 'cliente@ejemplo.com' },
        estado: EstadoCotizacion.ACEPTADA,
      });

      await expect(
        service.sendToClient('cot-1', mockTenantA, 'user-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Apertura y visualización pública (VISTA)', () => {
    it('debe registrar la primera apertura válida cambiando de ENVIADA a VISTA sin degradar', async () => {
      const mockQuote = {
        id: 'cot-1',
        empresaId: mockTenantA,
        numeroCotizacion: 'COT-2026-0001',
        version: 1,
        tokenPublico: 'token-vista',
        tokenPublicoRevocado: false,
        estado: EstadoCotizacion.ENVIADA,
        fechaVence: new Date(Date.now() + 86400000),
        items: [],
      };

      prisma.cotizacion.findUnique.mockResolvedValue(mockQuote);
      prisma.cotizacion.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.findByPublicToken('token-vista', {
        ip: '192.168.1.5',
      });

      expect(result.estado).toBe(EstadoCotizacion.VISTA);
      expect(result.version).toBe(1);
      expect(prisma.cotizacion.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cot-1', estado: EstadoCotizacion.ENVIADA },
          data: expect.objectContaining({
            estado: EstadoCotizacion.VISTA,
          }),
        }),
      );
      expect(prisma.auditoria.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accion: 'COTIZACION_VISTA',
          }),
        }),
      );
    });

    it('no debe cambiar estado a VISTA si la cotización ya fue ACEPTADA previamente', async () => {
      const mockQuote = {
        id: 'cot-1',
        empresaId: mockTenantA,
        tokenPublico: 'token-aceptada',
        tokenPublicoRevocado: false,
        estado: EstadoCotizacion.ACEPTADA,
        fechaVence: new Date(Date.now() + 86400000),
        items: [],
      };

      prisma.cotizacion.findUnique.mockResolvedValue(mockQuote);

      const result = await service.findByPublicToken('token-aceptada');
      expect(result.estado).toBe(EstadoCotizacion.ACEPTADA);
      expect(prisma.cotizacion.update).not.toHaveBeenCalled();
    });

    it('la vista publica devuelve dias y horas como numero aunque la BD entregue Decimal', async () => {
      prisma.cotizacion.findUnique.mockResolvedValue({
        id: 'cot-1',
        empresaId: mockTenantA,
        tokenPublico: 'token-decimal',
        tokenPublicoRevocado: false,
        estado: EstadoCotizacion.ACEPTADA,
        fechaVence: new Date(Date.now() + 86400000),
        items: [
          { descripcion: 'Por hora', tipoCobro: 'POR_HORA', cantidad: 1, dias: new Prisma.Decimal('19.5'), horas: new Prisma.Decimal('19.5'), precioUnitario: '100', descuento: '0', subtotal: '1950', equipo: null },
          { descripcion: 'Por dia', tipoCobro: 'POR_DIA', cantidad: 1, dias: new Prisma.Decimal('3'), horas: null, precioUnitario: '100', descuento: '0', subtotal: '300', equipo: null },
        ],
      });

      const result: any = await service.findByPublicToken('token-decimal');

      expect(result.items[0].dias).toBe(19.5);
      expect(result.items[0].horas).toBe(19.5);
      expect(result.items[1].dias).toBe(3);
      expect(result.items[1].horas).toBeNull();
      expect(JSON.parse(JSON.stringify(result.items))[0]).toEqual(
        expect.objectContaining({ dias: 19.5, horas: 19.5, precioUnitario: '100' }),
      );
    });

    it('debe rechazar token revocado con UnauthorizedException', async () => {
      prisma.cotizacion.findUnique.mockResolvedValue({
        id: 'cot-1',
        tokenPublicoRevocado: true,
      });

      await expect(service.findByPublicToken('token-revocado')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('3. Aceptación pública del cliente, contrato e idempotencia', () => {
    it('debe aceptar atómicamente la cotización, crear contrato y reservas una sola vez', async () => {
      const mockQuote = {
        id: 'cot-1',
        empresaId: mockTenantA,
        sucursalId: 'suc-1',
        clienteId: 'cli-1',
        numeroCotizacion: 'COT-2026-0001',
        version: 1,
        tokenPublico: 'token-accept-test',
        tokenPublicoRevocado: false,
        estado: EstadoCotizacion.VISTA,
        fechaVence: new Date(Date.now() + 86400000),
        items: [
          {
            id: 'item-1',
            equipoId: 'eq-1',
            cantidad: 1,
            dias: 15,
            precioUnitario: 100,
            subtotal: 1500,
          },
        ],
      };

      prisma.equipo.findMany.mockResolvedValue([
        {
          id: 'eq-1',
          modelo: 'Generador 5kVA',
          tipoControl: 'SERIALIZADO',
          cantidadDisponible: 1,
          estado: 'DISPONIBLE',
          precioRentaDia: 100,
          precioRentaHora: 20,
        },
      ]);
      prisma.cotizacion.findUnique.mockResolvedValue(mockQuote);
      prisma.contrato.create.mockResolvedValue({
        id: 'contrato-nuevo-1',
        codigo: 'CTR-2026-0001',
        estado: 'ACTIVO',
        items: [{ id: 'det-1', equipoId: 'eq-1', cantidad: 1 }],
      });

      const res = await service.acceptPublic('token-accept-test', {
        ip: '10.0.0.1',
      });

      expect(res.success).toBe(true);
      expect(res.data.contratoId).toBe('contrato-nuevo-1');
      expect(prisma.cotizacion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cot-1' },
          data: expect.objectContaining({ estado: EstadoCotizacion.ACEPTADA }),
        }),
      );
      expect(prisma.contrato.create).toHaveBeenCalledTimes(1);
      expect(prisma.contrato.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            codigo: 'CTR-2026-0001',
            sucursalId: 'suc-1',
            cotizacionId: 'cot-1',
          }),
        }),
      );
      // El contador atomico (upsert) serializa el codigo: sin advisory lock global.
      expect(prisma.secuenciaNumeracion.upsert).toHaveBeenCalledTimes(1);
      const sqlEjecutado = prisma.$executeRaw.mock.calls.map((c: any[]) => c[0].join('?'));
      expect(sqlEjecutado.some((s: string) => s.includes('pg_advisory'))).toBe(false);
      const contractData = prisma.contrato.create.mock.calls[0][0].data;
      expect(contractData).not.toHaveProperty('empresaId');
      expect(contractData).not.toHaveProperty('codigoContrato');
      expect(prisma.reserva.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contratoId: 'contrato-nuevo-1',
            equipoId: 'eq-1',
          }),
        }),
      );
      expect(prisma.auditoria.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accion: 'COTIZACION_ACEPTADA',
            entidadId: 'cot-1',
          }),
        }),
      );
    });

    describe('duracion del contrato sin fechaFinRenta (derivada de la cotizacion)', () => {
      const DIA_MS = 24 * 60 * 60 * 1000;
      const inicio = new Date('2026-10-01T12:00:00.000Z');

      async function aceptarConItem(item: Record<string, unknown>, extra: Record<string, unknown> = {}) {
        prisma.equipo.findMany.mockResolvedValue([
          {
            id: 'eq-1', modelo: 'Generador 5kVA', tipoControl: 'SERIALIZADO',
            cantidadDisponible: 1, estado: 'DISPONIBLE', precioRentaDia: 100, precioRentaHora: 20,
          },
        ]);
        prisma.cotizacion.findUnique.mockResolvedValue({
          id: 'cot-1', empresaId: mockTenantA, sucursalId: 'suc-1', clienteId: 'cli-1',
          numeroCotizacion: 'COT-2026-0001', version: 1, tokenPublico: 'tok',
          tokenPublicoRevocado: false, estado: EstadoCotizacion.VISTA,
          fechaVence: new Date(Date.now() + DIA_MS),
          fechaInicioRenta: inicio, fechaFinRenta: null, validezDias: 15,
          items: [{ id: 'item-1', equipoId: 'eq-1', cantidad: 1, precioUnitario: 100, subtotal: 1500, ...item }],
          ...extra,
        });
        prisma.contrato.create.mockResolvedValue({
          id: 'contrato-1', codigo: 'CTR-2026-0001', estado: 'ACTIVO', items: [],
        });
        await service.acceptPublic('tok', { ip: '10.0.0.1' });
        const data = prisma.contrato.create.mock.calls[0][0].data;
        return Math.round((data.fechaFin.getTime() - data.fechaInicio.getTime()) / DIA_MS);
      }

      it('HORA con 87600 horas y sin fechaFinRenta dura 3650 dias (no 240 anos)', async () => {
        const dias = await aceptarConItem({
          tipoCobro: 'POR_HORA', dias: new Prisma.Decimal(87600), horas: new Prisma.Decimal(87600),
        });
        expect(dias).toBe(3650);
      });

      it('HORA con 240 horas dura 10 dias; con 8 horas, 1 dia (horas/24 hacia arriba)', async () => {
        expect(await aceptarConItem({
          tipoCobro: 'POR_HORA', dias: new Prisma.Decimal(240), horas: new Prisma.Decimal(240),
        })).toBe(10);
        prisma.contrato.create.mockClear();
        expect(await aceptarConItem({
          tipoCobro: 'POR_HORA', dias: new Prisma.Decimal(8), horas: new Prisma.Decimal(8),
        })).toBe(1);
      });

      it('DIA sigue usando dias como dias (15 dias) y respeta fechaFinRenta cuando existe', async () => {
        expect(await aceptarConItem({ tipoCobro: 'POR_DIA', dias: new Prisma.Decimal(15) })).toBe(15);
        prisma.contrato.create.mockClear();
        const fin = new Date('2026-10-11T12:00:00.000Z');
        expect(await aceptarConItem(
          { tipoCobro: 'POR_HORA', dias: new Prisma.Decimal(87600), horas: new Prisma.Decimal(87600) },
          { fechaFinRenta: fin },
        )).toBe(10);
      });
    });

    it('idempotencia: una segunda aceptación concurrente/repetida no duplica contratos ni reservas', async () => {
      const mockQuote = {
        id: 'cot-1',
        empresaId: mockTenantA,
        tokenPublico: 'token-already-accepted',
        tokenPublicoRevocado: false,
        estado: EstadoCotizacion.ACEPTADA,
      };

      prisma.cotizacion.findUnique.mockResolvedValue(mockQuote);
      prisma.contrato.findFirst.mockResolvedValue({
        id: 'contrato-existente',
        codigo: 'CTR-2026-0001',
        estado: 'ACTIVO',
      });

      const res = await service.acceptPublic('token-already-accepted');

      expect(res.success).toBe(true);
      expect(res.idempotent).toBe(true);
      expect(res.data.contratoId).toBe('contrato-existente');
      expect(prisma.contrato.create).not.toHaveBeenCalled();
      expect(prisma.reserva.create).not.toHaveBeenCalled();
    });
  });

  describe('4. Rechazo del cliente, motivo obligatorio y versionado automático', () => {
    it('debe rechazar si no se especifica un motivo válido de al menos 5 caracteres', async () => {
      await expect(service.rejectPublic('token-test', '   ')).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.rejectPublic('token-test', 'abc')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe marcar la versión como RECHAZADA, revocar el token y crear automáticamente version+1 en PENDIENTE sin contrato', async () => {
      const mockQuote = {
        id: 'cot-v1',
        empresaId: mockTenantA,
        sucursalId: 'suc-1',
        clienteId: 'cli-1',
        numeroCotizacion: 'COT-2026-0002',
        version: 1,
        tokenPublico: 'token-reject-test',
        tokenPublicoRevocado: false,
        estado: EstadoCotizacion.VISTA,
        subtotal: 2000,
        iva: 300,
        total: 2300,
        items: [
          {
            productoId: null,
            equipoId: 'eq-1',
            cantidad: 1,
            dias: 5,
            precioUnitario: 400,
            subtotal: 2000,
          },
        ],
      };

      prisma.cotizacion.findUnique.mockResolvedValue(mockQuote);
      prisma.cotizacion.create.mockResolvedValue({
        id: 'cot-v2',
        numeroCotizacion: 'COT-2026-0002',
        version: 2,
        estado: EstadoCotizacion.PENDIENTE,
        motivoRechazo: 'El costo de transporte es demasiado alto',
      });

      const res = await service.rejectPublic(
        'token-reject-test',
        'El costo de transporte es demasiado alto',
      );

      expect(res.success).toBe(true);
      expect(res.data.nuevaVersion).toBe(2);
      expect(res.data.nuevaVersionId).toBe('cot-v2');

      // Versión v1 debe estar RECHAZADA y revocada
      expect(prisma.cotizacion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cot-v1' },
          data: expect.objectContaining({
            estado: EstadoCotizacion.RECHAZADA,
            tokenPublicoRevocado: true,
            motivoRechazo: 'El costo de transporte es demasiado alto',
          }),
        }),
      );

      // Versión v2 debe estar en PENDIENTE con nuevo token y sin contrato
      expect(prisma.cotizacion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            numeroCotizacion: 'COT-2026-0002',
            version: 2,
            estado: EstadoCotizacion.PENDIENTE,
            motivoRechazo: 'El costo de transporte es demasiado alto',
            tokenPublicoRevocado: false,
          }),
        }),
      );

      // Cero contratos y cero reservas
      expect(prisma.contrato.create).not.toHaveBeenCalled();
      expect(prisma.reserva.create).not.toHaveBeenCalled();

      // Auditoría forense registrada
      expect(prisma.auditoria.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accion: 'COTIZACION_RECHAZADA',
            entidadId: 'cot-v1',
          }),
        }),
      );
    });

    it('idempotencia en rechazo repetido', async () => {
      prisma.cotizacion.findUnique.mockResolvedValue({
        id: 'cot-v1',
        numeroCotizacion: 'COT-2026-0002',
        version: 1,
        estado: EstadoCotizacion.RECHAZADA,
      });
      prisma.cotizacion.findFirst.mockResolvedValue({
        id: 'cot-v2',
        version: 2,
      });

      const res = await service.rejectPublic('token-rep', 'Motivo repetido');
      expect(res.success).toBe(true);
      expect(res.idempotent).toBe(true);
      expect(prisma.cotizacion.create).not.toHaveBeenCalled();
    });
  });

  describe('5. Protección contra salto de consentimiento en PATCH interno', () => {
    it('debe rechazar PATCH /quotations/:id con estado ACEPTADA si no incluye adminOverride', async () => {
      await expect(
        controller.update(
          'cot-1',
          { estado: EstadoCotizacion.ACEPTADA },
          mockTenantA,
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar PATCH directo aunque el cuerpo intente incluir un override', async () => {
      await expect(
        controller.update(
          'cot-1',
          { estado: EstadoCotizacion.ACEPTADA },
          mockTenantA,
          'admin-user',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
