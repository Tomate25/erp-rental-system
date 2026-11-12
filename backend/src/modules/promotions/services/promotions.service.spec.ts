import { Test, TestingModule } from '@nestjs/testing';
import { PromotionsService } from './promotions.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { TipoCobro, Prisma } from '@prisma/client';

describe('PromotionsService', () => {
  let service: PromotionsService;
  let prisma: any;

  const mockPrisma = {
    promocion: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    promocionItem: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    cotizacion: {
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
        PromotionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PromotionsService>(PromotionsService);
    prisma = module.get(PrismaService);
  });

  describe('create', () => {
    it('crea una promoción correctamente con sus items cuando no existe código duplicado', async () => {
      prisma.promocion.findFirst.mockResolvedValue(null);
      const created = {
        id: 'promo-1',
        empresaId,
        codigo: 'COMBO-01',
        nombre: 'Combo Cimentación',
        precioCombo: new Prisma.Decimal(1500),
        tipoCobro: TipoCobro.POR_DIA,
        diasMinimos: 2,
        activo: true,
      };
      prisma.promocion.create.mockResolvedValue(created);
      prisma.promocion.findUnique.mockResolvedValue({
        ...created,
        items: [{ id: 'item-1', productoId: 'prod-1', cantidad: 2 }],
      });

      const result = await service.create(
        {
          codigo: 'combo-01',
          nombre: 'Combo Cimentación',
          precioCombo: 1500,
          tipoCobro: TipoCobro.POR_DIA,
          diasMinimos: 2,
          items: [{ productoId: 'prod-1', cantidad: 2 }],
        },
        empresaId,
        usuarioId,
      );

      expect(prisma.promocion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            empresaId,
            codigo: 'COMBO-01',
            nombre: 'Combo Cimentación',
          }),
        }),
      );
      expect(prisma.promocionItem.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            promocionId: 'promo-1',
            productoId: 'prod-1',
            cantidad: 2,
          }),
        ]),
      });
      expect(result).toBeDefined();
    });

    it('lanza ConflictException si ya existe una promoción con el mismo código', async () => {
      prisma.promocion.findFirst.mockResolvedValue({ id: 'promo-existente' });

      await expect(
        service.create(
          {
            codigo: 'COMBO-01',
            nombre: 'Combo Duplicado',
            precioCombo: 1000,
          },
          empresaId,
          usuarioId,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('retorna la lista de promociones filtradas por empresa y activo', async () => {
      prisma.promocion.findMany.mockResolvedValue([{ id: 'promo-1', codigo: 'P1' }]);

      const result = await service.findAll(empresaId, { activo: true });
      expect(result).toHaveLength(1);
      expect(prisma.promocion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { empresaId, activo: true },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('retorna la promoción si existe en el tenant', async () => {
      const promo = { id: 'promo-1', empresaId, codigo: 'P1' };
      prisma.promocion.findFirst.mockResolvedValue(promo);

      const result = await service.findOne('promo-1', empresaId);
      expect(result).toEqual(promo);
    });

    it('lanza NotFoundException si la promoción no existe en la empresa', async () => {
      prisma.promocion.findFirst.mockResolvedValue(null);

      await expect(service.findOne('promo-inexistente', empresaId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('actualiza datos e items de la promoción', async () => {
      const existing = { id: 'promo-1', empresaId, codigo: 'P1', nombre: 'Original' };
      prisma.promocion.findFirst.mockResolvedValue(existing);
      prisma.promocion.findUnique.mockResolvedValue({ ...existing, nombre: 'Modificado' });

      const result = await service.update(
        'promo-1',
        { nombre: 'Modificado', items: [{ productoId: 'prod-2', cantidad: 3 }] },
        empresaId,
        usuarioId,
      );

      expect(prisma.promocion.update).toHaveBeenCalled();
      expect(prisma.promocionItem.deleteMany).toHaveBeenCalledWith({
        where: { promocionId: 'promo-1' },
      });
      expect(prisma.promocionItem.createMany).toHaveBeenCalled();
      expect(result.nombre).toBe('Modificado');
    });
  });

  describe('remove', () => {
    it('elimina físicamente la promoción si no tiene cotizaciones vinculadas', async () => {
      prisma.promocion.findFirst.mockResolvedValue({ id: 'promo-1', empresaId });
      prisma.cotizacion.count.mockResolvedValue(0);

      const result = await service.remove('promo-1', empresaId, usuarioId);

      expect(prisma.promocionItem.deleteMany).toHaveBeenCalledWith({
        where: { promocionId: 'promo-1' },
      });
      expect(prisma.promocion.delete).toHaveBeenCalledWith({
        where: { id: 'promo-1' },
      });
      expect(result.message).toContain('eliminada con éxito');
    });

    it('desactiva la promoción si tiene cotizaciones vinculadas para proteger integridad', async () => {
      prisma.promocion.findFirst.mockResolvedValue({ id: 'promo-1', empresaId });
      prisma.cotizacion.count.mockResolvedValue(3);

      const result = await service.remove('promo-1', empresaId, usuarioId);

      expect(prisma.promocion.update).toHaveBeenCalledWith({
        where: { id: 'promo-1' },
        data: { activo: false },
      });
      expect(prisma.promocion.delete).not.toHaveBeenCalled();
      expect(result.message).toContain('desactivada');
    });
  });
});
