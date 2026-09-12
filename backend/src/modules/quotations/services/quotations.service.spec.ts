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
      usuario: { findFirst: jest.fn(), findMany: jest.fn() },
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
      where: { id: 'cliente-b', empresaId: 'empresa-a' },
      select: { id: true, vendedorId: true, vendedor: true },
    });
    expect(prisma.cotizacion.create).not.toHaveBeenCalled();
  });

  it('rechaza asesores que no pertenecen a la empresa autenticada', async () => {
    prisma.cliente.findFirst.mockResolvedValue({ id: 'cliente-b' });
    prisma.usuario.findFirst.mockResolvedValue(null);
    await expect(service.create({ ...quotationDto, asesorId: 'asesor-b' }, 'empresa-a')).rejects.toThrow(ForbiddenException);
    expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
      where: { id: 'asesor-b', empresaId: 'empresa-a' }, select: { id: true },
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
      where: { id: 'cliente-b', empresaId: 'empresa-a' },
      select: { id: true, vendedorId: true, vendedor: true },
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

  it('normaliza tipoTarifa HORA a TipoCobro.POR_HORA y horas si tipoCobro viene omitido', async () => {
    const existing = {
      id: 'cotizacion-b', clienteId: 'cliente-a', asesorId: null,
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
      descripcion: 'Bailarina compactadora', cantidad: 1, dias: 6,
      tipoTarifa: 'HORA', precioUnitario: 50, subtotal: 300,
    }];

    await service.update('cotizacion-b', { items }, 'empresa-a');

    expect(tx.cotizacion.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        items: { create: [expect.objectContaining({
          tipoCobro: TipoCobro.POR_HORA,
          horas: 6,
        })] },
      }),
    }));
  });

  it('respeta el vendedor permanente del cliente al crear una cotización', async () => {
    prisma.cliente.findFirst.mockResolvedValue({
      id: 'cliente-b', vendedorId: 'asesor-titular', vendedor: 'David Pérez',
    });
    prisma.usuario.findFirst.mockResolvedValue({ id: 'asesor-titular' });

    await service.create(quotationDto, 'empresa-a', 'sucursal-a', 'admin-a');

    expect(prisma.cotizacion.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ asesorId: 'asesor-titular' }),
    }));
    expect(prisma.cliente.update).not.toHaveBeenCalled();
  });

  it('vincula el vendedor textual existente sin reemplazar la cartera del cliente', async () => {
    prisma.cliente.findFirst.mockResolvedValue({
      id: 'cliente-b', vendedorId: null, vendedor: 'Nylska López',
    });
    prisma.usuario.findMany.mockResolvedValue([
      { id: 'asesor-nylska', nombre: 'Nylska', apellido: 'López', email: 'nylska@empresa.test' },
    ]);
    prisma.usuario.findFirst.mockResolvedValue({ id: 'asesor-nylska' });

    await service.create(quotationDto, 'empresa-a');

    expect(prisma.usuario.findMany).toHaveBeenCalledWith({
      where: { empresaId: 'empresa-a' },
      select: { id: true, nombre: true, apellido: true, email: true },
    });
    expect(prisma.cliente.update).toHaveBeenCalledWith({
      where: { id: 'cliente-b' }, data: { vendedorId: 'asesor-nylska' },
    });
    expect(prisma.cotizacion.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ asesorId: 'asesor-nylska' }),
    }));
  });

  it('asigna permanentemente al creador cuando tiene rol comercial y el cliente no posee vendedor', async () => {
    prisma.cliente.findFirst.mockResolvedValue({
      id: 'cliente-b', vendedorId: null, vendedor: null,
    });
    prisma.usuario.findFirst
      .mockResolvedValueOnce({ id: 'asesor-a', nombre: 'David', apellido: 'Pérez' })
      .mockResolvedValueOnce({ id: 'asesor-a' });

    await service.create(quotationDto, 'empresa-a', 'sucursal-a', 'asesor-a');

    expect(prisma.usuario.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'asesor-a', empresaId: 'empresa-a',
        roles: { some: { rol: { nombre: { in: ['COMERCIAL', 'VENTAS', 'ASESOR'] } } } },
      },
      select: { id: true, nombre: true, apellido: true },
    });
    expect(prisma.cliente.update).toHaveBeenCalledWith({
      where: { id: 'cliente-b' },
      data: { vendedorId: 'asesor-a', vendedor: 'David Pérez' },
    });
    expect(prisma.cotizacion.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ asesorId: 'asesor-a' }),
    }));
  });

  it('al aceptar una cotización genera automáticamente el contrato y la solicitud de despacho', async () => {
    const existing = {
      id: 'cotizacion-a', clienteId: 'cliente-a', asesorId: 'asesor-a',
      estado: EstadoCotizacion.PENDIENTE,
    };
    prisma.cotizacion.findFirst.mockResolvedValue(existing);
    const updated = { ...existing, estado: EstadoCotizacion.ACEPTADA, items: [], cliente: {} };
    const createdContrato = { id: 'contrato-1', codigo: 'CTR-2026-0001', sucursalId: 'sucursal-default' };
    const tx = {
      $executeRaw: jest.fn(),
      cotizacion: {
        findUnique: jest.fn().mockResolvedValue({ ...existing, contratos: [] }),
        update: jest.fn().mockResolvedValue(updated),
      },
      cliente: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'cliente-a', vendedorId: 'asesor-a', vendedor: 'David Pérez',
        }),
        update: jest.fn(),
      },
      usuario: { findFirst: jest.fn().mockResolvedValue({ id: 'asesor-a' }), findMany: jest.fn() },
      detalleCotizacion: { deleteMany: jest.fn() },
      contrato: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue(createdContrato),
      },
      solicitudDespacho: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'desp-1', codigo: 'SOL-DESP-0001' }),
      },
      corteFacturacion: {
        create: jest.fn().mockResolvedValue({ id: 'corte-1' }),
      },
      reserva: {
        create: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async callback => callback(tx));

    await expect(service.update(
      'cotizacion-a',
      { estado: EstadoCotizacion.ACEPTADA },
      'empresa-a',
    )).resolves.toEqual(updated);

    expect(tx.cotizacion.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ estado: EstadoCotizacion.ACEPTADA }),
    }));
    expect(tx.contrato.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        cotizacionId: 'cotizacion-a',
        clienteId: 'cliente-a',
        estado: 'ACTIVO',
      }),
    }));
    expect(tx.solicitudDespacho.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        contratoId: 'contrato-1',
        solicitadoPor: 'Sistema (Cotización Aprobada)',
      }),
    }));
  });

  it('al aceptar una cotización que ya tiene contrato no duplica el contrato', async () => {
    const existing = {
      id: 'cotizacion-b', clienteId: 'cliente-a', asesorId: 'asesor-a',
      estado: EstadoCotizacion.PENDIENTE,
    };
    prisma.cotizacion.findFirst.mockResolvedValue(existing);
    const updated = { ...existing, estado: EstadoCotizacion.ACEPTADA, items: [], cliente: {} };
    const tx = {
      $executeRaw: jest.fn(),
      cotizacion: {
        findUnique: jest.fn().mockResolvedValue({ ...existing, contratos: [] }),
        update: jest.fn().mockResolvedValue(updated),
      },
      cliente: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'cliente-a', vendedorId: 'asesor-a', vendedor: 'David Pérez',
        }),
        update: jest.fn(),
      },
      usuario: { findFirst: jest.fn().mockResolvedValue({ id: 'asesor-a' }), findMany: jest.fn() },
      detalleCotizacion: { deleteMany: jest.fn() },
      contrato: {
        findFirst: jest.fn().mockResolvedValue({ id: 'existing-contract' }),
        count: jest.fn(),
        create: jest.fn(),
      },
      solicitudDespacho: { count: jest.fn(), create: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async callback => callback(tx));

    await expect(service.update(
      'cotizacion-b',
      { estado: EstadoCotizacion.ACEPTADA },
      'empresa-a',
    )).resolves.toEqual(updated);

    expect(tx.contrato.create).not.toHaveBeenCalled();
    expect(tx.solicitudDespacho.create).not.toHaveBeenCalled();
  });

  it('findAll restringe las cotizaciones al asesor autenticado cuando solo tiene rol comercial', async () => {
    prisma.cotizacion.findMany.mockResolvedValue([]);
    const userComercial = { id: 'asesor-1', roles: ['COMERCIAL'] };

    await service.findAll('empresa-a', userComercial, false);

    expect(prisma.cotizacion.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: [
          {
            OR: [
              { asesorId: 'asesor-1' },
              { cliente: { vendedorId: 'asesor-1' } }
            ]
          }
        ]
      })
    }));
  });

  it('findAll no restringe cotizaciones si el usuario es ADMIN o se solicita all=true', async () => {
    prisma.cotizacion.findMany.mockResolvedValue([]);
    const userAdmin = { id: 'admin-1', roles: ['ADMIN', 'COMERCIAL'] };

    await service.findAll('empresa-a', userAdmin, false);

    expect(prisma.cotizacion.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [
          { empresaId: 'empresa-a' },
          { cliente: { empresaId: 'empresa-a' } }
        ]
      }
    }));
  });

  it('getSalesRanking calcula métricas, podio y tasas de conversión por asesor', async () => {
    prisma.usuario.findMany.mockResolvedValue([
      { id: 'asesor-1', nombre: 'Nylska', apellido: 'García', email: 'nylska@rental.com.ni' },
      { id: 'asesor-2', nombre: 'Arles', apellido: 'Centeno', email: 'arles@rental.com.ni' }
    ]);
    prisma.cotizacion.findMany.mockResolvedValue([
      {
        id: 'cot-1', total: 10000, estado: EstadoCotizacion.ACEPTADA, asesorId: 'asesor-1', contratos: [{ id: 'ctr-1' }]
      },
      {
        id: 'cot-2', total: 5000, estado: EstadoCotizacion.PENDIENTE, asesorId: 'asesor-1', contratos: []
      },
      {
        id: 'cot-3', total: 4000, estado: EstadoCotizacion.ACEPTADA, asesorId: 'asesor-2', contratos: [{ id: 'ctr-2' }]
      }
    ]);

    const result = await service.getSalesRanking('empresa-a');

    expect(result.ranking).toHaveLength(2);
    expect(result.ranking[0].asesorId).toBe('asesor-1'); // 10000 vendido vs 4000
    expect(result.ranking[0].montoTotalVendido).toBe(10000);
    expect(result.ranking[0].tasaConversion).toBe(50); // 1 aprobada de 2
    expect(result.ranking[0].posicion).toBe(1);

    expect(result.ranking[1].asesorId).toBe('asesor-2');
    expect(result.ranking[1].montoTotalVendido).toBe(4000);
    expect(result.ranking[1].tasaConversion).toBe(100);
    expect(result.ranking[1].posicion).toBe(2);

    expect(result.globalTotals.totalCotizaciones).toBe(3);
    expect(result.globalTotals.montoGlobalVendido).toBe(14000);
  });
});
