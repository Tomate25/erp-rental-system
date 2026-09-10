import { Test, TestingModule } from '@nestjs/testing';
import { QuotationsService } from './quotations.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EstadoCotizacion, TipoCobro } from '@prisma/client';

describe('QuotationsService', () => {
  let service: QuotationsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      cotizacion: {
        findMany: jest.fn(), findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn(),
        create: jest.fn(), update: jest.fn(), count: jest.fn(),
      },
      cliente: { findFirst: jest.fn(), update: jest.fn() },
      usuario: { findFirst: jest.fn() },
      sucursal: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotationsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<QuotationsService>(QuotationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const quotationDto = {
    clienteId: 'cliente-b', proyecto: 'Proyecto seguro', subtotal: 100, iva: 15, total: 115, items: [],
  } as any;

  it('rechaza clientes que no pertenecen a la empresa autenticada', async () => {
    prisma.cliente.findFirst.mockResolvedValue(null);
    await expect(service.create(quotationDto, 'empresa-a')).rejects.toThrow(NotFoundException);
    expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
      where: { id: 'cliente-b', empresaId: 'empresa-a' }, select: { id: true },
    });
    expect(prisma.cotizacion.create).not.toHaveBeenCalled();
  });

  it('rechaza asesores que no pertenecen a la empresa autenticada', async () => {
    prisma.cliente.findFirst.mockResolvedValue({ id: 'cliente-b' });
    prisma.usuario.findFirst.mockResolvedValue(null);
    await expect(service.create({ ...quotationDto, asesorId: 'asesor-b' }, 'empresa-a')).rejects.toThrow(ForbiddenException);
    expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
      where: { id: 'asesor-b', empresaId: 'empresa-a' }, select: { nombre: true, apellido: true },
    });
    expect(prisma.cotizacion.create).not.toHaveBeenCalled();
  });

  it('persiste la modalidad y las horas al crear una cotización', async () => {
    prisma.cliente.findFirst.mockResolvedValue({ id: 'cliente-b' });
    const items = [
      {
        descripcion: 'Excavadora por hora', cantidad: 1, dias: 6,
        tipoCobro: TipoCobro.POR_HORA, horas: 8, precioUnitario: 100, subtotal: 800,
      },
      {
        descripcion: 'Generador por hora', cantidad: 1, dias: 5,
        tipoCobro: TipoCobro.POR_HORA, precioUnitario: 80, subtotal: 400,
      },
      {
        descripcion: 'Andamio por día', cantidad: 2, dias: 3,
        precioUnitario: 50, subtotal: 300,
      },
    ];

    await service.create({ ...quotationDto, items }, 'empresa-a');

    const persistedItems = prisma.cotizacion.create.mock.calls[0][0].data.items.create;
    expect(persistedItems).toEqual([
      expect.objectContaining({ tipoCobro: TipoCobro.POR_HORA, horas: 8 }),
      expect.objectContaining({ tipoCobro: TipoCobro.POR_HORA, horas: 5 }),
      expect.objectContaining({ tipoCobro: TipoCobro.POR_DIA, horas: undefined }),
    ]);
  });

  it('selecciona solo campos públicos del asesor en la consulta por token', async () => {
    prisma.cotizacion.findUnique.mockResolvedValue({ id: 'cotizacion-a' });
    await service.findByPublicToken('token-publico');
    expect(prisma.cotizacion.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        asesor: { select: { id: true, nombre: true, apellido: true, email: true } },
      }),
    }));
  });

  it('rechaza reasignar una cotizaciÃ³n existente a un cliente de otra empresa', async () => {
    prisma.cotizacion.findFirst.mockResolvedValue({
      id: 'cotizacion-a', clienteId: 'cliente-a', asesorId: null,
    });
    const tx = {
      $executeRaw: jest.fn(),
      cotizacion: { findUnique: jest.fn().mockResolvedValue({ estado: 'BORRADOR', contratos: [] }) },
      cliente: { findFirst: jest.fn().mockResolvedValue(null) },
      detalleCotizacion: { deleteMany: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback) => callback(tx));

    await expect(service.update('cotizacion-a', { clienteId: 'cliente-b' }, 'empresa-a')).rejects.toThrow(NotFoundException);

    expect(tx.cliente.findFirst).toHaveBeenCalledWith({
      where: { id: 'cliente-b', empresaId: 'empresa-a' }, select: { id: true },
    });
    expect(tx.detalleCotizacion.deleteMany).not.toHaveBeenCalled();
  });

  it('persiste la modalidad y las horas al reemplazar ítems en update', async () => {
    const existing = {
      id: 'cotizacion-a', clienteId: 'cliente-a', asesorId: null,
      estado: EstadoCotizacion.BORRADOR,
    };
    prisma.cotizacion.findFirst.mockResolvedValue(existing);
    const tx = {
      $executeRaw: jest.fn(),
      cotizacion: {
        findUnique: jest.fn().mockResolvedValue({ ...existing, contratos: [] }),
        update: jest.fn().mockResolvedValue({ ...existing, items: [], cliente: {} }),
      },
      cliente: { findFirst: jest.fn().mockResolvedValue({ id: 'cliente-a' }), update: jest.fn() },
      detalleCotizacion: { deleteMany: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async callback => callback(tx));
    const items = [{
      descripcion: 'Compresor por hora', cantidad: 1, dias: 4,
      tipoCobro: TipoCobro.POR_HORA, precioUnitario: 90, subtotal: 360,
    }];

    await service.update('cotizacion-a', { items }, 'empresa-a');

    expect(tx.cotizacion.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        items: { create: [expect.objectContaining({
          tipoCobro: TipoCobro.POR_HORA,
          horas: 4,
        })] },
      }),
    }));
  });
});
