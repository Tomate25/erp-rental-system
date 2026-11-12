import { Test, TestingModule } from '@nestjs/testing';
import { InsumosService } from './insumos.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CategoriaInsumo, UnidadMedidaInsumo } from '@prisma/client';

describe('InsumosService', () => {
  let service: InsumosService;
  let prisma: any;

  const mockPrisma = {
    insumo: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    proveedor: {
      findFirst: jest.fn(),
    },
    consumoInsumo: {
      count: jest.fn(),
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
        InsumosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<InsumosService>(InsumosService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('crea un insumo correctamente cuando no existe conflicto', async () => {
      prisma.insumo.findFirst.mockResolvedValue(null);
      const created = {
        id: 'ins-1',
        empresaId,
        nombre: 'Aceite 15W40',
        categoria: CategoriaInsumo.LUBRICANTES,
        unidadMedida: UnidadMedidaInsumo.GALON,
        stockActual: 10,
        stockMinimo: 2,
        costoUnitario: 450,
        costoIncluyeIva: true,
        aplicaIva: true,
        activo: true,
      };
      prisma.insumo.create.mockResolvedValue(created);

      const result = await service.create(
        {
          nombre: '  Aceite 15W40  ',
          categoria: CategoriaInsumo.LUBRICANTES,
          unidadMedida: UnidadMedidaInsumo.GALON,
          stockActual: 10,
          stockMinimo: 2,
          costoUnitario: 450,
        },
        empresaId,
        usuarioId,
      );

      expect(result).toEqual(created);
      expect(prisma.insumo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nombre: 'Aceite 15W40',
            categoria: CategoriaInsumo.LUBRICANTES,
            costoIncluyeIva: true,
            aplicaIva: true,
          }),
        }),
      );
    });

    it('lanza ConflictException si ya existe un insumo con el mismo nombre', async () => {
      prisma.insumo.findFirst.mockResolvedValue({ id: 'ins-existente' });

      await expect(
        service.create({ nombre: 'Aceite 15W40' }, empresaId, usuarioId),
      ).rejects.toThrow(ConflictException);
    });

    it('lanza NotFoundException si el proveedor especificado no existe', async () => {
      prisma.insumo.findFirst.mockResolvedValue(null);
      prisma.proveedor.findFirst.mockResolvedValue(null);

      await expect(
        service.create(
          { nombre: 'Filtro Aire', proveedorId: 'prov-invalido' },
          empresaId,
          usuarioId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('lista insumos filtrados por categoria y activos', async () => {
      prisma.insumo.findMany.mockResolvedValue([
        { id: '1', nombre: 'Aceite Hidráulico', categoria: CategoriaInsumo.LUBRICANTES, stockActual: 5, stockMinimo: 2 },
      ]);

      const result = await service.findAll(empresaId, {
        categoria: CategoriaInsumo.LUBRICANTES,
        activo: true,
      });

      expect(result).toHaveLength(1);
      expect(prisma.insumo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            empresaId,
            categoria: CategoriaInsumo.LUBRICANTES,
            activo: true,
          },
        }),
      );
    });

    it('filtra por bajoStock correctamente cuando se solicita', async () => {
      prisma.insumo.findMany.mockResolvedValue([
        { id: '1', nombre: 'Filtro Aceite', stockActual: 1, stockMinimo: 2 },
        { id: '2', nombre: 'Grasa Chasis', stockActual: 10, stockMinimo: 2 },
      ]);

      const result = await service.findAll(empresaId, { bajoStock: true });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });
  });

  describe('ajustarStock', () => {
    it('incrementa el stock en ENTRADA', async () => {
      prisma.insumo.findFirst.mockResolvedValue({
        id: 'ins-1',
        empresaId,
        nombre: 'Grasa',
        stockActual: 5,
        stockMinimo: 2,
        costoUnitario: 100,
      });
      prisma.insumo.update.mockResolvedValue({
        id: 'ins-1',
        stockActual: 15,
      });

      const result = await service.ajustarStock(
        'ins-1',
        { cantidad: 10, tipoAjuste: 'ENTRADA', motivo: 'Compra factura #123', costoUnitario: 110 },
        empresaId,
        usuarioId,
      );

      expect(result.stockActual).toBe(15);
      expect(prisma.insumo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ins-1' },
          data: { stockActual: 15, costoUnitario: 110 },
        }),
      );
    });

    it('lanza BadRequestException en SALIDA si no hay stock suficiente', async () => {
      prisma.insumo.findFirst.mockResolvedValue({
        id: 'ins-1',
        empresaId,
        nombre: 'Grasa',
        stockActual: 3,
        stockMinimo: 2,
      });

      await expect(
        service.ajustarStock(
          'ins-1',
          { cantidad: 5, tipoAjuste: 'SALIDA', motivo: 'Uso en taller' },
          empresaId,
          usuarioId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('ajusta directamente el stock con AJUSTE_DIRECTO', async () => {
      prisma.insumo.findFirst.mockResolvedValue({
        id: 'ins-1',
        empresaId,
        nombre: 'Grasa',
        stockActual: 3,
      });
      prisma.insumo.update.mockResolvedValue({
        id: 'ins-1',
        stockActual: 8,
      });

      const result = await service.ajustarStock(
        'ins-1',
        { cantidad: 8, tipoAjuste: 'AJUSTE_DIRECTO', motivo: 'Inventario físico fin de mes' },
        empresaId,
        usuarioId,
      );

      expect(result.stockActual).toBe(8);
      expect(prisma.insumo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { stockActual: 8 },
        }),
      );
    });
  });

  describe('remove', () => {
    it('elimina fisicamente si no tiene consumos registrados', async () => {
      prisma.insumo.findFirst.mockResolvedValue({ id: 'ins-1', empresaId, nombre: 'Insumo Prueba' });
      prisma.consumoInsumo.count.mockResolvedValue(0);
      prisma.insumo.delete.mockResolvedValue({ id: 'ins-1' });

      const res = await service.remove('ins-1', empresaId, usuarioId);

      expect(res.eliminado).toBe(true);
      expect(prisma.insumo.delete).toHaveBeenCalledWith({ where: { id: 'ins-1' } });
    });

    it('desactiva en vez de eliminar si tiene consumos en historial', async () => {
      prisma.insumo.findFirst.mockResolvedValue({ id: 'ins-1', empresaId, nombre: 'Insumo Usado' });
      prisma.consumoInsumo.count.mockResolvedValue(3);
      prisma.insumo.update.mockResolvedValue({ id: 'ins-1', activo: false });

      const res = await service.remove('ins-1', empresaId, usuarioId);

      expect(res.eliminado).toBe(false);
      expect(res.activo).toBe(false);
      expect(prisma.insumo.update).toHaveBeenCalledWith({
        where: { id: 'ins-1' },
        data: { activo: false },
      });
    });
  });
});
