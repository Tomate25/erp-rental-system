import { Test, TestingModule } from '@nestjs/testing';
import { ProvidersService } from './providers.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TipoProveedor } from '@prisma/client';

describe('ProvidersService', () => {
  let service: ProvidersService;
  let prisma: any;

  const mockPrisma = {
    proveedor: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditoria: {
      create: jest.fn().mockResolvedValue({ id: 'aud-1' }),
    },
    $transaction: jest.fn(async (callback) => callback(mockPrisma)),
  };

  const empresaId = 'emp-1';
  const usuarioId = 'usr-1';

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvidersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('crea un proveedor correctamente cuando no existe duplicado', async () => {
      prisma.proveedor.findFirst.mockResolvedValue(null);
      const created = {
        id: 'prov-1',
        empresaId,
        nombre: 'Maquinter S.A.',
        tipo: TipoProveedor.MAQUINARIA_EXTERNA,
        activo: true,
      };
      prisma.proveedor.create.mockResolvedValue(created);

      const result = await service.create(
        {
          nombre: '  Maquinter S.A.  ',
          tipo: TipoProveedor.MAQUINARIA_EXTERNA,
          contacto: 'Ing. Carlos',
          telefono: '8888-8888',
        },
        empresaId,
        usuarioId,
      );

      expect(prisma.proveedor.findFirst).toHaveBeenCalledWith({
        where: {
          empresaId,
          nombre: { equals: 'Maquinter S.A.', mode: 'insensitive' },
        },
      });
      expect(prisma.proveedor.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            empresaId,
            nombre: 'Maquinter S.A.',
            tipo: TipoProveedor.MAQUINARIA_EXTERNA,
            contacto: 'Ing. Carlos',
            telefono: '8888-8888',
          }),
        }),
      );
      expect(result).toBe(created);
    });

    it('rechaza con ConflictException si ya existe un proveedor con ese nombre en la empresa', async () => {
      prisma.proveedor.findFirst.mockResolvedValue({
        id: 'prov-existing',
        nombre: 'Maquinter S.A.',
      });

      await expect(
        service.create(
          { nombre: 'maquinter s.a.' },
          empresaId,
          usuarioId,
        ),
      ).rejects.toThrow(ConflictException);
      expect(prisma.proveedor.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('aplica aislamiento estricto por empresaId', async () => {
      const records = [{ id: 'prov-1', nombre: 'A' }, { id: 'prov-2', nombre: 'B' }];
      prisma.proveedor.findMany.mockResolvedValue(records);

      const res = await service.findAll(empresaId);
      expect(res).toBe(records);
      expect(prisma.proveedor.findMany).toHaveBeenCalledWith({
        where: { empresaId },
        orderBy: { nombre: 'asc' },
        include: { _count: { select: { equipos: true } } },
      });
    });

    it('aplica filtros opcionales de tipo, activo y búsqueda', async () => {
      prisma.proveedor.findMany.mockResolvedValue([]);
      await service.findAll(empresaId, {
        tipo: TipoProveedor.INSUMOS_Y_REPUESTOS,
        activo: true,
        search: 'filtro',
      });

      expect(prisma.proveedor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            empresaId,
            tipo: TipoProveedor.INSUMOS_Y_REPUESTOS,
            activo: true,
            OR: expect.arrayContaining([
              { nombre: { contains: 'filtro', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('devuelve el proveedor si pertenece a la empresa', async () => {
      const record = { id: 'prov-1', empresaId, nombre: 'Maquinter', equipos: [] };
      prisma.proveedor.findFirst.mockResolvedValue(record);

      const res = await service.findOne('prov-1', empresaId);
      expect(res).toBe(record);
      expect(prisma.proveedor.findFirst).toHaveBeenCalledWith({
        where: { id: 'prov-1', empresaId },
        include: expect.any(Object),
      });
    });

    it('lanza NotFoundException si no existe o es de otra empresa', async () => {
      prisma.proveedor.findFirst.mockResolvedValue(null);
      await expect(service.findOne('prov-999', empresaId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('actualiza campos del proveedor correctamente', async () => {
      prisma.proveedor.findFirst
        .mockResolvedValueOnce({ id: 'prov-1', empresaId, nombre: 'Viejo' }) // findOne
        .mockResolvedValueOnce(null); // duplicate check
      prisma.proveedor.update.mockResolvedValue({ id: 'prov-1', nombre: 'Nuevo' });

      const res = await service.update(
        'prov-1',
        { nombre: 'Nuevo', telefono: '2222-2222' },
        empresaId,
        usuarioId,
      );

      expect(res).toEqual({ id: 'prov-1', nombre: 'Nuevo' });
      expect(prisma.proveedor.update).toHaveBeenCalledWith({
        where: { id: 'prov-1' },
        data: expect.objectContaining({
          nombre: 'Nuevo',
          telefono: '2222-2222',
        }),
      });
    });

    it('rechaza si el nuevo nombre colisiona con otro proveedor existente', async () => {
      prisma.proveedor.findFirst
        .mockResolvedValueOnce({ id: 'prov-1', empresaId, nombre: 'Viejo' })
        .mockResolvedValueOnce({ id: 'prov-2', nombre: 'Otro' });

      await expect(
        service.update('prov-1', { nombre: 'Otro' }, empresaId, usuarioId),
      ).rejects.toThrow(ConflictException);
      expect(prisma.proveedor.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('desactiva lógicamente si tiene equipos asociados', async () => {
      prisma.proveedor.findFirst.mockResolvedValue({
        id: 'prov-1',
        empresaId,
        equipos: [{ id: 'eq-1' }],
      });
      prisma.proveedor.update.mockResolvedValue({ id: 'prov-1', activo: false });

      await service.remove('prov-1', empresaId, usuarioId);

      expect(prisma.proveedor.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prov-1' },
          data: expect.objectContaining({ activo: false }),
        }),
      );
      expect(prisma.proveedor.delete).not.toHaveBeenCalled();
    });

    it('elimina físicamente si no tiene equipos asociados', async () => {
      prisma.proveedor.findFirst.mockResolvedValue({
        id: 'prov-1',
        empresaId,
        equipos: [],
      });
      prisma.proveedor.delete.mockResolvedValue({ id: 'prov-1', nombre: 'Maquinter' });

      const res = await service.remove('prov-1', empresaId, usuarioId);

      expect(res.success).toBe(true);
      expect(prisma.proveedor.delete).toHaveBeenCalledWith({
        where: { id: 'prov-1' },
      });
    });
  });
});
