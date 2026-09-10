import { Test, TestingModule } from '@nestjs/testing';
import { QuotationsService } from './quotations.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

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
});
