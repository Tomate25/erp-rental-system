import { Test, TestingModule } from '@nestjs/testing';
import { AuditoriaService } from './auditoria.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AuditoriaService', () => {
  let service: AuditoriaService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      auditoria: {
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AuditoriaService>(AuditoriaService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('record() en transacción forense', () => {
    let mockTx: any;

    beforeEach(() => {
      mockTx = {
        auditoria: {
          create: jest.fn(),
        },
      };
    });

    it('registra exitosamente un evento auditado sanitizando secretos e IP', async () => {
      const auditDto = {
        empresaId: 'emp-100',
        usuarioId: 'usr-100',
        accion: 'PAGO_REGISTRADO',
        entidadTipo: 'PAGO',
        entidadId: 'pago-100',
        detalles: {
          monto: 5000,
          metodoPago: 'TRANSFERENCIA',
          password: 'super-secret-password',
          jwtToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
        ipDireccion: '::ffff:192.168.1.50',
        userAgent: 'Mozilla/5.0 '.repeat(30), // Cadena larga para probar truncado a 255
        requestId: 'req-abc-123',
      };

      const expectedCreated = { id: 'audit-1', ...auditDto };
      mockTx.auditoria.create.mockResolvedValue(expectedCreated);

      const result = await service.record(mockTx, auditDto);

      expect(mockTx.auditoria.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          empresaId: 'emp-100',
          usuarioId: 'usr-100',
          accion: 'PAGO_REGISTRADO',
          entidadTipo: 'PAGO',
          entidadId: 'pago-100',
          ipDireccion: '192.168.1.50', // IP normalizada
          requestId: 'req-abc-123',
        }),
      });

      const callArgs = mockTx.auditoria.create.mock.calls[0][0].data;
      expect(callArgs.userAgent.length).toBeLessThanOrEqual(255);
      // Secretos redactados en detalles (serializados en JSON seguro)
      const parsedDetalles = JSON.parse(callArgs.detalles);
      expect(parsedDetalles.password).toBe('[REDACTED]');
      expect(parsedDetalles.jwtToken).toBe('[REDACTED]');
      expect(parsedDetalles.monto).toBe(5000);
      expect(result).toEqual(expectedCreated);
    });

    it('registra evento anónimo público preservando usuarioId = null', async () => {
      const publicDto = {
        empresaId: 'emp-100',
        usuarioId: null,
        accion: 'COTIZACION_PUBLICA_SOLICITADA',
        entidadTipo: 'COTIZACION',
        entidadId: 'cot-pub-1',
        detalles: {
          numeroCotizacion: 'COT-2026-0001',
          clienteNombre: 'Cliente Público Anónimo',
        },
        ipDireccion: '203.0.113.195',
        userAgent: 'Mobile Safari',
      };

      mockTx.auditoria.create.mockResolvedValue({
        id: 'audit-pub',
        ...publicDto,
      });

      const result = await service.record(mockTx, publicDto);

      expect(mockTx.auditoria.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          empresaId: 'emp-100',
          usuarioId: null,
          accion: 'COTIZACION_PUBLICA_SOLICITADA',
          entidadTipo: 'COTIZACION',
          entidadId: 'cot-pub-1',
          ipDireccion: '203.0.113.195',
        }),
      });
      expect(result.id).toBe('audit-pub');
    });

    it('exige obligatoriamente empresaId para auditoría forense', async () => {
      const invalidDto: any = {
        empresaId: '',
        accion: 'EVENTO',
        entidadTipo: 'TEST',
        entidadId: '123',
      };

      await expect(service.record(mockTx, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockTx.auditoria.create).not.toHaveBeenCalled();
    });

    it('exige obligatoriamente accion, entidadTipo y entidadId', async () => {
      await expect(
        service.record(mockTx, {
          empresaId: 'emp-1',
          accion: '',
          entidadTipo: 'TEST',
          entidadId: '1',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.record(mockTx, {
          empresaId: 'emp-1',
          accion: 'ACC',
          entidadTipo: '',
          entidadId: '1',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.record(mockTx, {
          empresaId: 'emp-1',
          accion: 'ACC',
          entidadTipo: 'TEST',
          entidadId: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('falla y propaga error si tx.auditoria.create falla (garantiza rollback atómico)', async () => {
      mockTx.auditoria.create.mockRejectedValue(
        new Error('Database disk full or constraint violation'),
      );

      await expect(
        service.record(mockTx, {
          empresaId: 'emp-1',
          accion: 'PAGO_REGISTRADO',
          entidadTipo: 'PAGO',
          entidadId: 'pago-1',
        }),
      ).rejects.toThrow('Database disk full or constraint violation');
    });
  });

  describe('findAll() y Aislamiento Multi-Tenant', () => {
    it('filtra estrictamente por empresaId del usuario autenticado', async () => {
      const mockData = [
        {
          id: 'aud-1',
          empresaId: 'emp-tenant-a',
          accion: 'PAGO_REGISTRADO',
          usuario: {
            id: 'u1',
            email: 'admin@a.com',
            nombre: 'Admin',
            apellido: 'A',
          },
        },
      ];
      prisma.auditoria.findMany.mockResolvedValue(mockData);
      prisma.auditoria.count.mockResolvedValue(1);

      const result = await service.findAll('emp-tenant-a', {
        page: 1,
        limit: 10,
      });

      expect(prisma.auditoria.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            empresaId: 'emp-tenant-a', // Aislamiento tenant A
          }),
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('aplica filtros opcionales de accion, entidadTipo, entidadId, usuarioId y fechas', async () => {
      prisma.auditoria.findMany.mockResolvedValue([]);
      prisma.auditoria.count.mockResolvedValue(0);

      await service.findAll('emp-tenant-a', {
        accion: 'CONTRATO_CREADO',
        entidadTipo: 'CONTRATO',
        entidadId: 'cnt-1',
        usuarioId: 'usr-1',
        requestId: 'req-999',
        fechaInicio: '2026-01-01T00:00:00.000Z',
        fechaFin: '2026-01-31T23:59:59.999Z',
      });

      expect(prisma.auditoria.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            empresaId: 'emp-tenant-a',
            accion: { contains: 'CONTRATO_CREADO', mode: 'insensitive' },
            entidadTipo: 'CONTRATO',
            entidadId: 'cnt-1',
            usuarioId: 'usr-1',
            requestId: 'req-999',
            createdAt: {
              gte: new Date('2026-01-01T00:00:00.000Z'),
              lte: new Date('2026-01-31T23:59:59.999Z'),
            },
          },
        }),
      );
    });

    it('filtra un módulo incluyendo solicitudes HTTP y eventos de negocio', async () => {
      prisma.auditoria.findMany.mockResolvedValue([]);
      prisma.auditoria.count.mockResolvedValue(0);

      await service.findAll('emp-tenant-a', { modulo: 'operations' });

      expect(prisma.auditoria.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            empresaId: 'emp-tenant-a',
            OR: [
              { entidadTipo: 'OPERATIONS' },
              { entidadTipo: { in: ['SOLICITUD_DESPACHO', 'SOLICITUD_RETORNO', 'DESPACHO', 'DEVOLUCION'] } },
            ],
          }),
        }),
      );
    });

    it('pagina por tipo de evento en SQL antes de contar resultados', async () => {
      prisma.auditoria.findMany.mockResolvedValue([]);
      prisma.auditoria.count.mockResolvedValue(0);

      await service.findAll('emp-tenant-a', { tipoEvento: 'HTTP', modulo: 'security' });

      const expectedWhere = expect.objectContaining({
        empresaId: 'emp-tenant-a',
        AND: [{ accion: { startsWith: 'HTTP_' } }],
        OR: expect.arrayContaining([{ entidadTipo: 'SECURITY' }, { entidadTipo: { in: ['AUTH', 'USERS', 'ROLES', 'USUARIO', 'ROL'] } }]),
      });
      expect(prisma.auditoria.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expectedWhere }));
      expect(prisma.auditoria.count).toHaveBeenCalledWith({ where: expectedWhere });
    });

    it('rechaza consulta si empresaId no está presente', async () => {
      await expect(service.findAll('', {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findById() y Protección Cross-Tenant', () => {
    it('retorna el registro si pertenece a la empresa consultante', async () => {
      const mockRecord = {
        id: 'aud-10',
        empresaId: 'emp-a',
        accion: 'LOGIN_EXITOSO',
        usuario: {
          id: 'u1',
          email: 'user@a.com',
          nombre: 'User',
          apellido: 'A',
        },
      };
      prisma.auditoria.findFirst.mockResolvedValue(mockRecord);

      const result = await service.findById('emp-a', 'aud-10');

      expect(prisma.auditoria.findFirst).toHaveBeenCalledWith({
        where: { id: 'aud-10', empresaId: 'emp-a' },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true,
            },
          },
        },
      });
      expect(result).toEqual(mockRecord);
    });

    it('lanza NotFoundException si el registro pertenece a otra empresa (Cross-Tenant A -> B)', async () => {
      // Simula que la búsqueda filtrada por empresaId no devuelve nada porque pertenece a Empresa B
      prisma.auditoria.findFirst.mockResolvedValue(null);

      await expect(
        service.findById('emp-a', 'aud-perteneciente-a-emp-b'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rechaza si falta empresaId', async () => {
      await expect(service.findById('', 'aud-10')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
