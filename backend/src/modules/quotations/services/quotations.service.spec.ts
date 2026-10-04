import { Test, TestingModule } from '@nestjs/testing';
import { QuotationsService } from './quotations.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { EstadoCotizacion, TipoCobro } from '@prisma/client';

describe('QuotationsService', () => {
  let service: QuotationsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      secuenciaNumeracion: { upsert: jest.fn().mockResolvedValue({ ultimoValor: 1 }) },
      cotizacion: {
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      cliente: { findFirst: jest.fn(), update: jest.fn() },
      usuario: { findFirst: jest.fn(), findMany: jest.fn() },
      sucursal: { findFirst: jest.fn() },
      equipo: { findFirst: jest.fn() },
      producto: { findFirst: jest.fn() },
      auditoria: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );
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
    clienteId: 'cliente-b',
    proyecto: 'Proyecto seguro',
    subtotal: 100,
    iva: 15,
    total: 115,
    items: [
      {
        descripcion: 'Servicio autorizado',
        cantidad: 1,
        dias: 1,
        precioUnitario: 100,
      },
    ],
  } as any;

  it('rechaza clientes que no pertenecen a la empresa autenticada', async () => {
    prisma.cliente.findFirst.mockResolvedValue(null);
    await expect(service.create(quotationDto, 'empresa-a')).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.cliente.findFirst).toHaveBeenCalledWith({
      where: { id: 'cliente-b', empresaId: 'empresa-a' },
      select: { id: true, vendedorId: true, vendedor: true },
    });
    expect(prisma.cotizacion.create).not.toHaveBeenCalled();
  });

  it('rechaza asesores que no pertenecen a la empresa autenticada', async () => {
    prisma.cliente.findFirst.mockResolvedValue({ id: 'cliente-b' });
    prisma.usuario.findFirst.mockResolvedValue(null);
    await expect(
      service.create({ ...quotationDto, asesorId: 'asesor-b' }, 'empresa-a'),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
      where: { id: 'asesor-b', empresaId: 'empresa-a' },
      select: { id: true },
    });
    expect(prisma.cotizacion.create).not.toHaveBeenCalled();
  });

  it('persiste la modalidad y las horas al crear una cotización', async () => {
    prisma.cliente.findFirst.mockResolvedValue({ id: 'cliente-b' });
    const items = [
      {
        descripcion: 'Excavadora por hora',
        cantidad: 1,
        dias: 6,
        tipoCobro: TipoCobro.POR_HORA,
        horas: 8,
        precioUnitario: 100,
        subtotal: 800,
      },
      {
        descripcion: 'Generador por hora',
        cantidad: 1,
        dias: 5,
        tipoCobro: TipoCobro.POR_HORA,
        precioUnitario: 80,
        subtotal: 400,
      },
      {
        descripcion: 'Andamio por día',
        cantidad: 2,
        dias: 3,
        precioUnitario: 50,
        subtotal: 300,
      },
    ];

    await service.create({ ...quotationDto, items }, 'empresa-a');

    const persistedItems =
      prisma.cotizacion.create.mock.calls[0][0].data.items.create;
    expect(persistedItems).toEqual([
      expect.objectContaining({ tipoCobro: TipoCobro.POR_HORA, horas: 8 }),
      expect.objectContaining({ tipoCobro: TipoCobro.POR_HORA, horas: 5 }),
      expect.objectContaining({
        tipoCobro: TipoCobro.POR_DIA,
        horas: undefined,
      }),
    ]);
  });

  it('selecciona solo campos públicos del asesor en la consulta por token', async () => {
    prisma.cotizacion.findUnique.mockResolvedValue({ id: 'cotizacion-a' });
    await service.findByPublicToken('token-publico');
    expect(prisma.cotizacion.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          asesor: {
            select: { id: true, nombre: true, apellido: true, email: true },
          },
        }),
      }),
    );
  });

  it('rechaza reasignar una cotizaciÃ³n existente a un cliente de otra empresa', async () => {
    prisma.cotizacion.findFirst.mockResolvedValue({
      id: 'cotizacion-a',
      clienteId: 'cliente-a',
      asesorId: null,
    });
    const tx = {
      $executeRaw: jest.fn(),
      cotizacion: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ estado: 'BORRADOR', contratos: [] }),
      },
      cliente: { findFirst: jest.fn().mockResolvedValue(null) },
      detalleCotizacion: { deleteMany: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({ ...tx, auditoria: prisma.auditoria }),
    );

    await expect(
      service.update('cotizacion-a', { clienteId: 'cliente-b' }, 'empresa-a'),
    ).rejects.toThrow(NotFoundException);

    expect(tx.cliente.findFirst).toHaveBeenCalledWith({
      where: { id: 'cliente-b', empresaId: 'empresa-a' },
      select: { id: true, vendedorId: true, vendedor: true },
    });
    expect(tx.detalleCotizacion.deleteMany).not.toHaveBeenCalled();
  });

  it('persiste la modalidad y las horas al reemplazar ítems en update', async () => {
    const existing = {
      id: 'cotizacion-a',
      clienteId: 'cliente-a',
      asesorId: null,
      estado: EstadoCotizacion.BORRADOR,
    };
    prisma.cotizacion.findFirst.mockResolvedValue(existing);
    const tx = {
      $executeRaw: jest.fn(),
      cotizacion: {
        findUnique: jest.fn().mockResolvedValue({ ...existing, contratos: [] }),
        update: jest
          .fn()
          .mockResolvedValue({ ...existing, items: [], cliente: {} }),
      },
      cliente: {
        findFirst: jest.fn().mockResolvedValue({ id: 'cliente-a' }),
        update: jest.fn(),
      },
      detalleCotizacion: { deleteMany: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({ ...tx, auditoria: prisma.auditoria }),
    );
    const items = [
      {
        descripcion: 'Compresor por hora',
        cantidad: 1,
        dias: 4,
        tipoCobro: TipoCobro.POR_HORA,
        precioUnitario: 90,
        subtotal: 360,
      },
    ];

    await service.update('cotizacion-a', { items }, 'empresa-a');

    expect(tx.cotizacion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: {
            create: [
              expect.objectContaining({
                tipoCobro: TipoCobro.POR_HORA,
                horas: 4,
              }),
            ],
          },
        }),
      }),
    );
  });

  it('normaliza tipoTarifa HORA a TipoCobro.POR_HORA y horas si tipoCobro viene omitido', async () => {
    const existing = {
      id: 'cotizacion-b',
      clienteId: 'cliente-a',
      asesorId: null,
      estado: EstadoCotizacion.BORRADOR,
    };
    prisma.cotizacion.findFirst.mockResolvedValue(existing);
    const tx = {
      $executeRaw: jest.fn(),
      cotizacion: {
        findUnique: jest.fn().mockResolvedValue({ ...existing, contratos: [] }),
        update: jest
          .fn()
          .mockResolvedValue({ ...existing, items: [], cliente: {} }),
      },
      cliente: {
        findFirst: jest.fn().mockResolvedValue({ id: 'cliente-a' }),
        update: jest.fn(),
      },
      detalleCotizacion: { deleteMany: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({ ...tx, auditoria: prisma.auditoria }),
    );
    const items = [
      {
        descripcion: 'Bailarina compactadora',
        cantidad: 1,
        dias: 6,
        tipoTarifa: 'HORA',
        precioUnitario: 50,
        subtotal: 300,
      },
    ];

    await service.update('cotizacion-b', { items }, 'empresa-a');

    expect(tx.cotizacion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: {
            create: [
              expect.objectContaining({
                tipoCobro: TipoCobro.POR_HORA,
                horas: 6,
              }),
            ],
          },
        }),
      }),
    );
  });

  it('respeta el vendedor permanente del cliente al crear una cotización', async () => {
    prisma.sucursal.findFirst.mockResolvedValue({ id: 'sucursal-a' });
    prisma.cliente.findFirst.mockResolvedValue({
      id: 'cliente-b',
      vendedorId: 'asesor-titular',
      vendedor: 'David Pérez',
    });
    prisma.usuario.findFirst.mockResolvedValue({ id: 'asesor-titular' });

    await service.create(quotationDto, 'empresa-a', 'sucursal-a', 'admin-a');

    expect(prisma.cotizacion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ asesorId: 'asesor-titular' }),
      }),
    );
    expect(prisma.cliente.update).not.toHaveBeenCalled();
  });

  it('rechaza con 404 una sucursal del token que no es de la empresa (A -> B)', async () => {
    prisma.cliente.findFirst.mockResolvedValue({ id: 'cliente-b', vendedorId: null, vendedor: null });
    prisma.usuario.findFirst.mockResolvedValue({ id: 'admin-a' });
    prisma.sucursal.findFirst.mockImplementation(async ({ where }: any) =>
      where.id === 'sucursal-b' && where.empresaId === 'empresa-b' ? { id: 'sucursal-b' } : null,
    );

    await expect(
      service.create(quotationDto, 'empresa-a', 'sucursal-b', 'admin-a'),
    ).rejects.toThrow(new NotFoundException('Sucursal no encontrada'));
    expect(prisma.cotizacion.create).not.toHaveBeenCalled();
  });

  it('vincula el vendedor textual existente sin reemplazar la cartera del cliente', async () => {
    prisma.cliente.findFirst.mockResolvedValue({
      id: 'cliente-b',
      vendedorId: null,
      vendedor: 'Nylska López',
    });
    prisma.usuario.findMany.mockResolvedValue([
      {
        id: 'asesor-nylska',
        nombre: 'Nylska',
        apellido: 'López',
        email: 'nylska@empresa.test',
      },
    ]);
    prisma.usuario.findFirst.mockResolvedValue({ id: 'asesor-nylska' });

    await service.create(quotationDto, 'empresa-a');

    expect(prisma.usuario.findMany).toHaveBeenCalledWith({
      where: { empresaId: 'empresa-a' },
      select: { id: true, nombre: true, apellido: true, email: true },
    });
    expect(prisma.cliente.update).toHaveBeenCalledWith({
      where: { id: 'cliente-b' },
      data: { vendedorId: 'asesor-nylska' },
    });
    expect(prisma.cotizacion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ asesorId: 'asesor-nylska' }),
      }),
    );
  });

  it('asigna permanentemente al creador cuando tiene rol comercial y el cliente no posee vendedor', async () => {
    prisma.sucursal.findFirst.mockResolvedValue({ id: 'sucursal-a' });
    prisma.cliente.findFirst.mockResolvedValue({
      id: 'cliente-b',
      vendedorId: null,
      vendedor: null,
    });
    prisma.usuario.findFirst
      .mockResolvedValueOnce({
        id: 'asesor-a',
        nombre: 'David',
        apellido: 'Pérez',
      })
      .mockResolvedValueOnce({ id: 'asesor-a' });

    await service.create(quotationDto, 'empresa-a', 'sucursal-a', 'asesor-a');

    expect(prisma.usuario.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'asesor-a',
        empresaId: 'empresa-a',
        roles: {
          some: { rol: { nombre: { in: ['COMERCIAL', 'VENTAS', 'ASESOR'] } } },
        },
      },
      select: { id: true, nombre: true, apellido: true },
    });
    expect(prisma.cliente.update).toHaveBeenCalledWith({
      where: { id: 'cliente-b' },
      data: { vendedorId: 'asesor-a', vendedor: 'David Pérez' },
    });
    expect(prisma.cotizacion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ asesorId: 'asesor-a' }),
      }),
    );
  });

  it('impide que update acepte una cotización y genere contrato sin consentimiento público', async () => {
    const existing = {
      id: 'cotizacion-a',
      clienteId: 'cliente-a',
      asesorId: 'asesor-a',
      estado: EstadoCotizacion.PENDIENTE,
    };
    prisma.cotizacion.findFirst.mockResolvedValue(existing);
    const updated = {
      ...existing,
      estado: EstadoCotizacion.ACEPTADA,
      items: [],
      cliente: {},
    };
    const createdContrato = {
      id: 'contrato-1',
      codigo: 'CTR-2026-0001',
      sucursalId: 'sucursal-default',
    };
    const tx = {
      $executeRaw: jest.fn(),
      cotizacion: {
        findUnique: jest.fn().mockResolvedValue({ ...existing, contratos: [] }),
        update: jest.fn().mockResolvedValue(updated),
      },
      cliente: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'cliente-a',
          vendedorId: 'asesor-a',
          vendedor: 'David Pérez',
        }),
        update: jest.fn(),
      },
      usuario: {
        findFirst: jest.fn().mockResolvedValue({ id: 'asesor-a' }),
        findMany: jest.fn(),
      },
      detalleCotizacion: { deleteMany: jest.fn() },
      secuenciaNumeracion: { upsert: jest.fn().mockResolvedValue({ ultimoValor: 1 }) },
      contrato: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue(createdContrato),
      },
      solicitudDespacho: {
        count: jest.fn().mockResolvedValue(0),
        create: jest
          .fn()
          .mockResolvedValue({ id: 'desp-1', codigo: 'SOL-DESP-0001' }),
      },
      corteFacturacion: {
        create: jest.fn().mockResolvedValue({ id: 'corte-1' }),
      },
      reserva: {
        create: jest.fn(),
      },
    };
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({ ...tx, auditoria: prisma.auditoria }),
    );

    await expect(
      service.update(
        'cotizacion-a',
        { estado: EstadoCotizacion.ACEPTADA },
        'empresa-a',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(tx.cotizacion.update).not.toHaveBeenCalled();
    expect(tx.contrato.create).not.toHaveBeenCalled();
    expect(tx.solicitudDespacho.create).not.toHaveBeenCalled();
  });

  it('impide el cambio interno a ACEPTADA aunque ya exista contrato', async () => {
    const existing = {
      id: 'cotizacion-b',
      clienteId: 'cliente-a',
      asesorId: 'asesor-a',
      estado: EstadoCotizacion.PENDIENTE,
    };
    prisma.cotizacion.findFirst.mockResolvedValue(existing);
    const updated = {
      ...existing,
      estado: EstadoCotizacion.ACEPTADA,
      items: [],
      cliente: {},
    };
    const tx = {
      $executeRaw: jest.fn(),
      cotizacion: {
        findUnique: jest.fn().mockResolvedValue({ ...existing, contratos: [] }),
        update: jest.fn().mockResolvedValue(updated),
      },
      cliente: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'cliente-a',
          vendedorId: 'asesor-a',
          vendedor: 'David Pérez',
        }),
        update: jest.fn(),
      },
      usuario: {
        findFirst: jest.fn().mockResolvedValue({ id: 'asesor-a' }),
        findMany: jest.fn(),
      },
      detalleCotizacion: { deleteMany: jest.fn() },
      secuenciaNumeracion: { upsert: jest.fn().mockResolvedValue({ ultimoValor: 1 }) },
      contrato: {
        findFirst: jest.fn().mockResolvedValue({ id: 'existing-contract' }),
        count: jest.fn(),
        create: jest.fn(),
      },
      solicitudDespacho: { count: jest.fn(), create: jest.fn() },
    };
    prisma.$transaction.mockImplementation(async (callback: any) =>
      callback({ ...tx, auditoria: prisma.auditoria }),
    );

    await expect(
      service.update(
        'cotizacion-b',
        { estado: EstadoCotizacion.ACEPTADA },
        'empresa-a',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(tx.contrato.create).not.toHaveBeenCalled();
    expect(tx.solicitudDespacho.create).not.toHaveBeenCalled();
  });

  it('findAll restringe las cotizaciones al asesor autenticado cuando solo tiene rol comercial', async () => {
    prisma.cotizacion.findMany.mockResolvedValue([]);
    const userComercial = { id: 'asesor-1', roles: ['COMERCIAL'] };

    await service.findAll('empresa-a', userComercial, false);

    expect(prisma.cotizacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            {
              OR: [
                { asesorId: 'asesor-1' },
                { cliente: { vendedorId: 'asesor-1' } },
              ],
            },
          ],
        }),
      }),
    );
  });

  it('findAll no restringe cotizaciones si el usuario es ADMIN o se solicita all=true', async () => {
    prisma.cotizacion.findMany.mockResolvedValue([]);
    const userAdmin = { id: 'admin-1', roles: ['ADMIN', 'COMERCIAL'] };

    await service.findAll('empresa-a', userAdmin, false);

    expect(prisma.cotizacion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { empresaId: 'empresa-a' },
            { cliente: { empresaId: 'empresa-a' } },
          ],
        },
      }),
    );
  });

  it('getSalesRanking calcula métricas, podio y tasas de conversión por asesor', async () => {
    prisma.usuario.findMany.mockResolvedValue([
      {
        id: 'asesor-1',
        nombre: 'Nylska',
        apellido: 'García',
        email: 'nylska@rental.com.ni',
      },
      {
        id: 'asesor-2',
        nombre: 'Arles',
        apellido: 'Centeno',
        email: 'arles@rental.com.ni',
      },
    ]);
    prisma.cotizacion.findMany.mockResolvedValue([
      {
        id: 'cot-1',
        total: 10000,
        estado: EstadoCotizacion.ACEPTADA,
        asesorId: 'asesor-1',
        contratos: [{ id: 'ctr-1' }],
      },
      {
        id: 'cot-2',
        total: 5000,
        estado: EstadoCotizacion.PENDIENTE,
        asesorId: 'asesor-1',
        contratos: [],
      },
      {
        id: 'cot-3',
        total: 4000,
        estado: EstadoCotizacion.ACEPTADA,
        asesorId: 'asesor-2',
        contratos: [{ id: 'ctr-2' }],
      },
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

  describe('Integridad de cálculos financieros (AUD-002)', () => {
    it('ignora subtotales, IVA y totales manipulados enviados por el cliente y recalcula los importes reales', async () => {
      prisma.cliente.findFirst.mockResolvedValue({ id: 'cliente-1' });

      const manipulatedDto = {
        clienteId: 'cliente-1',
        subtotal: 10,
        iva: 0,
        total: 10,
        items: [
          {
            descripcion: 'Generador industrial',
            cantidad: 2,
            dias: 5,
            precioUnitario: 100,
            subtotal: 10,
          },
        ],
      } as any;

      await service.create(manipulatedDto, 'empresa-1');

      expect(prisma.cotizacion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 1000,
            descuento: 0,
            iva: 150,
            total: 1150,
            items: {
              create: [
                expect.objectContaining({
                  cantidad: 2,
                  dias: 5,
                  precioUnitario: 100,
                  subtotal: 1000,
                }),
              ],
            },
          }),
        }),
      );
    });

    it('rechaza ítems con equipoId que no pertenece a la empresa autenticada', async () => {
      prisma.cliente.findFirst.mockResolvedValue({ id: 'cliente-1' });
      prisma.equipo.findFirst.mockResolvedValue(null);

      const invalidDto = {
        clienteId: 'cliente-1',
        items: [
          {
            equipoId: 'equipo-otra-empresa',
            descripcion: 'Torre de luz',
            cantidad: 1,
            dias: 3,
            precioUnitario: 80,
          },
        ],
      } as any;

      await expect(service.create(invalidDto, 'empresa-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.cotizacion.create).not.toHaveBeenCalled();
    });

    it('recalcula cotización pública obligando tarifas de catálogo e IVA fiscal del 15%', async () => {
      const tx = {
        empresa: {
          findMany: jest.fn().mockResolvedValue([{ id: 'empresa-demo' }]),
          findUnique: jest.fn().mockResolvedValue({ id: 'empresa-demo' }),
        },
        sucursal: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: 'suc-1', empresaId: 'empresa-demo' }),
        },
        cliente: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'cliente-pub-1' }),
        },
        equipo: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'eq-cat',
            descripcion: 'Compactadora oficial',
            precioRentaDia: 250,
          }),
        },
        cotizacion: {
          create: jest.fn().mockImplementation((args) => args.data),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) =>
        cb({ secuenciaNumeracion: prisma.secuenciaNumeracion, ...tx, auditoria: prisma.auditoria }),
      );

      const publicDto = {
        email: 'solicitante@test.com',
        atencion: 'Ing. Carlos',
        items: [
          {
            equipoId: 'eq-cat',
            cantidad: 2,
            dias: 4,
            precioUnitario: 1,
            subtotal: 2,
          },
        ],
      };

      const result = await service.createPublic(publicDto);

      expect(result.subtotal).toBe(2000);
      expect(result.descuento).toBe(0);
      expect(result.iva).toBe(300);
      expect(result.total).toBe(2300);
    });

    it('obliga la tarifa oficial también en cotizaciones internas con equipo de catálogo', async () => {
      prisma.cliente.findFirst.mockResolvedValue({ id: 'cliente-1' });
      prisma.equipo.findFirst.mockResolvedValue({
        id: 'eq-cat',
        descripcion: 'Compactadora oficial',
        precioRentaDia: 250,
      });

      await service.create(
        {
          clienteId: 'cliente-1',
          items: [
            {
              equipoId: 'eq-cat',
              descripcion: 'Compactadora',
              cantidad: 2,
              dias: 4,
              precioUnitario: 1,
              subtotal: 2,
            },
          ],
        },
        'empresa-1',
      );

      expect(prisma.cotizacion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 2000,
            iva: 300,
            total: 2300,
            items: {
              create: [
                expect.objectContaining({
                  precioUnitario: 250,
                  subtotal: 2000,
                }),
              ],
            },
          }),
        }),
      );
    });

    it('ignora subtotal, IVA y total manipulados al actualizar una cotización', async () => {
      const existing = {
        id: 'cot-1',
        clienteId: 'cliente-1',
        empresaId: 'empresa-1',
      };
      prisma.cotizacion.findFirst.mockResolvedValue(existing);
      const tx = {
        $executeRaw: jest.fn(),
        cotizacion: {
          findUnique: jest.fn().mockResolvedValue({
            ...existing,
            contratos: [],
            items: [{ subtotal: 1000 }],
            subtotal: 1000,
            descuento: 0,
            iva: 150,
            total: 1150,
            depositoGarantia: 0,
          }),
          update: jest
            .fn()
            .mockImplementation(({ data }: any) => ({ ...existing, ...data })),
        },
        cliente: {
          findFirst: jest.fn().mockResolvedValue({ id: 'cliente-1' }),
          update: jest.fn(),
        },
        usuario: { findFirst: jest.fn(), findMany: jest.fn() },
      };
      prisma.$transaction.mockImplementation(async (callback: any) =>
        callback({ ...tx, auditoria: prisma.auditoria }),
      );

      await service.update(
        'cot-1',
        { subtotal: 1, iva: 0, total: 1 },
        'empresa-1',
      );

      expect(tx.cotizacion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 1000,
            iva: 150,
            total: 1150,
          }),
        }),
      );
    });

    it('rechaza descuentos globales o por ítem superiores al importe base', async () => {
      prisma.cliente.findFirst.mockResolvedValue({ id: 'cliente-1' });

      const excessiveDiscountDto = {
        clienteId: 'cliente-1',
        descuento: 2000,
        items: [
          {
            descripcion: 'Andamio',
            cantidad: 1,
            dias: 2,
            precioUnitario: 100,
          },
        ],
      } as any;

      await expect(
        service.create(excessiveDiscountDto, 'empresa-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.cotizacion.create).not.toHaveBeenCalled();
    });

    it('create: una linea de 9,9e9 mas IVA devuelve 400 (total excede Decimal(12,2)) y no llega a la BD', async () => {
      prisma.cliente.findFirst.mockResolvedValue({ id: 'cliente-1' });
      const dto = {
        clienteId: 'cliente-1',
        items: [
          { descripcion: 'Linea enorme', cantidad: 1, dias: 1, precioUnitario: 9_900_000_000 },
        ],
      } as any;

      const error = await service.create(dto, 'empresa-1').catch((e) => e);
      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.message).toContain('total del documento');
      expect(error.message).toContain('excede el maximo permitido');
      expect(prisma.cotizacion.create).not.toHaveBeenCalled();
    });

    it('rechaza cantidades no válidas (menores o iguales a cero)', async () => {
      prisma.cliente.findFirst.mockResolvedValue({ id: 'cliente-1' });

      const invalidQuantityDto = {
        clienteId: 'cliente-1',
        items: [
          {
            descripcion: 'Bomba de agua',
            cantidad: 0,
            dias: 2,
            precioUnitario: 50,
          },
        ],
      } as any;

      await expect(
        service.create(invalidQuantityDto, 'empresa-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.cotizacion.create).not.toHaveBeenCalled();
    });
  });

  describe('Aislamiento Multiempresa y Portal Público (AUD-004)', () => {
    it('rechaza solicitud pública con empresaId inexistente', async () => {
      const tx = {
        empresa: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) =>
        cb({ secuenciaNumeracion: prisma.secuenciaNumeracion, ...tx, auditoria: prisma.auditoria }),
      );

      const dto = {
        empresaId: 'empresa-fantasma',
        email: 'cliente@test.com',
        atencion: 'Pedro Perez',
        items: [{ equipoId: 'eq-1', cantidad: 1, dias: 2 }],
      };

      await expect(service.createPublic(dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('exige empresaId explícito cuando hay múltiples empresas en el sistema', async () => {
      const tx = {
        empresa: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ id: 'empresa-1' }, { id: 'empresa-2' }]),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) =>
        cb({ secuenciaNumeracion: prisma.secuenciaNumeracion, ...tx, auditoria: prisma.auditoria }),
      );

      const dto = {
        email: 'cliente@test.com',
        atencion: 'Pedro Perez',
        items: [{ equipoId: 'eq-1', cantidad: 1, dias: 2 }],
      };

      await expect(service.createPublic(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza sucursal que no pertenece a la empresa resuelta', async () => {
      const tx = {
        empresa: {
          findUnique: jest.fn().mockResolvedValue({ id: 'empresa-1' }),
        },
        sucursal: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) =>
        cb({ secuenciaNumeracion: prisma.secuenciaNumeracion, ...tx, auditoria: prisma.auditoria }),
      );

      const dto = {
        empresaId: 'empresa-1',
        sucursalId: 'sucursal-otra-empresa',
        email: 'cliente@test.com',
        atencion: 'Pedro Perez',
        items: [{ equipoId: 'eq-1', cantidad: 1, dias: 2 }],
      };

      await expect(service.createPublic(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rechaza cotización pública si el equipo pertenece a otra empresa (anti cross-tenant)', async () => {
      const tx = {
        empresa: {
          findUnique: jest.fn().mockResolvedValue({ id: 'empresa-1' }),
        },
        sucursal: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: 'suc-1', empresaId: 'empresa-1' }),
        },
        cliente: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'cli-1' }),
        },
        equipo: {
          findFirst: jest.fn().mockResolvedValue(null), // Equipo no pertenece a empresa-1
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) =>
        cb({ secuenciaNumeracion: prisma.secuenciaNumeracion, ...tx, auditoria: prisma.auditoria }),
      );

      const dto = {
        empresaId: 'empresa-1',
        email: 'cliente@test.com',
        atencion: 'Pedro Perez',
        items: [{ equipoId: 'eq-otra-empresa', cantidad: 1, dias: 2 }],
      };

      await expect(service.createPublic(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('consulta pública por token selecciona exclusivamente datos no sensibles del cliente y del equipo', async () => {
      prisma.cotizacion.findUnique.mockResolvedValue({
        id: 'cot-publica-1',
        tokenPublico: 'uuid-token-seguro',
        cliente: {
          id: 'cli-1',
          nombre: 'Cliente Seguro',
        },
      });

      await service.findByPublicToken('uuid-token-seguro');

      expect(prisma.cotizacion.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tokenPublico: 'uuid-token-seguro' },
          include: expect.objectContaining({
            cliente: {
              select: {
                id: true,
                nombre: true,
                razonSocial: true,
                rfc: true,
                direccion: true,
                telefono: true,
                emailFacturacion: true,
              },
            },
            items: {
              select: expect.objectContaining({
                equipo: {
                  select: {
                    id: true,
                    codigo: true,
                    modelo: true,
                    descripcion: true,
                    marca: { select: { id: true, nombre: true } },
                    categoria: { select: { id: true, nombre: true } },
                  },
                },
              }),
            },
          }),
        }),
      );
    });

    it('la creación pública (POST) selecciona exclusivamente datos no sensibles del cliente, empresa y equipo', async () => {
      let createdArgs: any = null;
      const tx = {
        empresa: {
          findMany: jest.fn().mockResolvedValue([{ id: 'empresa-1' }]),
          findUnique: jest.fn().mockResolvedValue({ id: 'empresa-1' }),
        },
        sucursal: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: 'suc-1', empresaId: 'empresa-1' }),
        },
        cliente: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'cli-1' }),
        },
        equipo: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'eq-1',
            precioRentaDia: 100,
            empresaId: 'empresa-1',
          }),
        },
        cotizacion: {
          create: jest.fn().mockImplementation((args) => {
            createdArgs = args;
            return {
              id: 'cot-1',
              subtotal: 100,
              descuento: 0,
              iva: 15,
              total: 115,
            };
          }),
        },
      };
      prisma.$transaction.mockImplementation(async (cb: any) =>
        cb({ secuenciaNumeracion: prisma.secuenciaNumeracion, ...tx, auditoria: prisma.auditoria }),
      );

      const dto = {
        empresaId: 'empresa-1',
        email: 'cliente@test.com',
        atencion: 'Pedro Perez',
        items: [{ equipoId: 'eq-1', cantidad: 1, dias: 1 }],
      };

      await service.createPublic(dto);

      expect(createdArgs.include).toEqual(
        expect.objectContaining({
          empresa: {
            select: {
              id: true,
              nombre: true,
              rfc: true,
              telefono: true,
              email: true,
              direccion: true,
            },
          },
          cliente: {
            select: {
              id: true,
              nombre: true,
              razonSocial: true,
              rfc: true,
              direccion: true,
              telefono: true,
              emailFacturacion: true,
            },
          },
          items: {
            select: expect.objectContaining({
              equipo: {
                select: {
                  id: true,
                  codigo: true,
                  modelo: true,
                  descripcion: true,
                  marca: { select: { id: true, nombre: true } },
                  categoria: { select: { id: true, nombre: true } },
                },
              },
            }),
          },
        }),
      );
    });

    describe('Seguridad, Expiración y Revocación de Tokens Públicos (AUD-005)', () => {
      it('rechaza con NotFoundException si el token público no existe', async () => {
        prisma.cotizacion.findUnique.mockResolvedValue(null);

        await expect(
          service.findByPublicToken('token-inexistente'),
        ).rejects.toThrow(NotFoundException);
      });

      it('rechaza con UnauthorizedException si el enlace público ha sido revocado', async () => {
        prisma.cotizacion.findUnique.mockResolvedValue({
          id: 'cot-1',
          tokenPublico: 'token-revocado',
          tokenPublicoRevocado: true,
          estado: EstadoCotizacion.ENVIADA,
          fechaVence: new Date(Date.now() + 86400000),
        });

        await expect(
          service.findByPublicToken('token-revocado'),
        ).rejects.toThrow(
          new UnauthorizedException(
            'El enlace público de esta cotización ha sido revocado',
          ),
        );
      });

      it('rechaza con UnauthorizedException si la cotización fue cancelada o rechazada', async () => {
        prisma.cotizacion.findUnique.mockResolvedValue({
          id: 'cot-1',
          tokenPublico: 'token-cancelado',
          tokenPublicoRevocado: false,
          estado: EstadoCotizacion.CANCELADA,
          fechaVence: new Date(Date.now() + 86400000),
        });

        await expect(
          service.findByPublicToken('token-cancelado'),
        ).rejects.toThrow(
          new UnauthorizedException(
            'El enlace público de esta cotización no está disponible',
          ),
        );
      });

      it('rechaza con UnauthorizedException si el enlace público ha expirado por fecha de vencimiento', async () => {
        prisma.cotizacion.findUnique.mockResolvedValue({
          id: 'cot-1',
          tokenPublico: 'token-expirado',
          tokenPublicoRevocado: false,
          estado: EstadoCotizacion.ENVIADA,
          fechaVence: new Date(Date.now() - 3600000), // Expiró hace 1 hora
        });

        await expect(
          service.findByPublicToken('token-expirado'),
        ).rejects.toThrow(
          new UnauthorizedException(
            'El enlace público de esta cotización ha expirado',
          ),
        );
      });

      it('permite revocar el enlace público verificando aislamiento tenant', async () => {
        prisma.cotizacion.findFirst.mockResolvedValue({
          id: 'cot-1',
          empresaId: 'empresa-1',
        });
        prisma.cotizacion.update.mockResolvedValue({
          id: 'cot-1',
          tokenPublicoRevocado: true,
        });

        const result = await service.revokePublicToken('cot-1', 'empresa-1');

        expect(prisma.cotizacion.findFirst).toHaveBeenCalledWith({
          where: { id: 'cot-1', empresaId: 'empresa-1' },
        });
        expect(prisma.cotizacion.update).toHaveBeenCalledWith({
          where: { id: 'cot-1' },
          data: { tokenPublicoRevocado: true },
        });
        expect(result.success).toBe(true);
      });

      it('permite rotar el enlace público generando nuevo UUID y reactivando el acceso', async () => {
        prisma.cotizacion.findFirst.mockResolvedValue({
          id: 'cot-1',
          empresaId: 'empresa-1',
        });
        prisma.cotizacion.update.mockResolvedValue({ id: 'cot-1' });

        const result = await service.rotatePublicToken('cot-1', 'empresa-1');

        expect(prisma.cotizacion.findFirst).toHaveBeenCalledWith({
          where: { id: 'cot-1', empresaId: 'empresa-1' },
        });
        expect(prisma.cotizacion.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'cot-1' },
            data: expect.objectContaining({
              tokenPublico: expect.any(String),
              tokenPublicoRevocado: false,
            }),
          }),
        );
        expect(result.success).toBe(true);
        expect(result.tokenPublico).toBeDefined();
      });
    });

    describe('Período de renta en cotizaciones', () => {
      it('rechaza una fecha final anterior al inicio', async () => {
        await expect(service.create({
          ...quotationDto,
          fechaInicioRenta: '2026-11-30T12:00:00.000Z',
          fechaFinRenta: '2026-11-01T12:00:00.000Z',
        }, 'empresa-1')).rejects.toThrow('Selecciona un período de renta');
      });

      it('rechaza un período mayor a 3650 días (create)', async () => {
        await expect(service.create({
          ...quotationDto,
          fechaInicioRenta: '2026-01-01T00:00:00.000Z',
          fechaFinRenta: '2036-01-02T00:00:00.000Z', // 3652 días
        }, 'empresa-1')).rejects.toThrow(
          new BadRequestException('El período de renta no puede superar 3650 días.'),
        );
        expect(prisma.cotizacion.create).not.toHaveBeenCalled();
      });

      it('rechaza 3651 días y acepta exactamente 3650 días (create)', async () => {
        const inicio = new Date('2026-01-01T00:00:00.000Z');
        const fin = (dias: number) => new Date(inicio.getTime() + dias * 86_400_000).toISOString();
        await expect(service.create({
          ...quotationDto, fechaInicioRenta: inicio.toISOString(), fechaFinRenta: fin(3651),
        }, 'empresa-1')).rejects.toThrow('El período de renta no puede superar 3650 días.');

        prisma.cliente.findFirst.mockResolvedValue({ id: 'cli-1', empresaId: 'empresa-1' });
        prisma.cotizacion.findFirst.mockResolvedValue(null);
        prisma.cotizacion.create.mockResolvedValue({ id: 'cot-3650', numeroCotizacion: 'COT-0001' });
        await expect(service.create({
          ...quotationDto, clienteId: 'cli-1', fechaInicioRenta: inicio.toISOString(), fechaFinRenta: fin(3650),
        }, 'empresa-1')).resolves.toBeDefined();
      });

      it('rechaza un período mayor a 3650 días al actualizar (update)', async () => {
        const current = {
          id: 'cot-1', empresaId: 'empresa-1', clienteId: 'cli-1', estado: EstadoCotizacion.BORRADOR,
          fechaInicioRenta: new Date('2026-01-01T00:00:00.000Z'), fechaFinRenta: new Date('2026-02-01T00:00:00.000Z'),
          contratos: [], items: [],
        };
        prisma.cotizacion.findFirst.mockResolvedValue(current);
        prisma.cotizacion.findUnique.mockResolvedValue(current);
        prisma.$executeRaw = jest.fn();
        await expect(
          service.update('cot-1', { fechaFinRenta: '2040-01-01T00:00:00.000Z' } as any, 'empresa-1'),
        ).rejects.toThrow(new BadRequestException('El período de renta no puede superar 3650 días.'));
      });

      it('guarda fechaInicioRenta y fechaFinRenta al crear cotización', async () => {
        prisma.cliente.findFirst.mockResolvedValue({
          id: 'cli-1',
          empresaId: 'empresa-1',
        });
        prisma.cotizacion.findFirst.mockResolvedValue(null);
        prisma.cotizacion.create.mockResolvedValue({
          id: 'cot-dates-1',
          numeroCotizacion: 'COT-0001',
          fechaInicioRenta: new Date('2026-11-01T00:00:00.000Z'),
          fechaFinRenta: new Date('2026-11-30T00:00:00.000Z'),
        });

        await service.create(
          {
            ...quotationDto,
            clienteId: 'cli-1',
            fechaInicioRenta: '2026-11-01T00:00:00.000Z',
            fechaFinRenta: '2026-11-30T00:00:00.000Z',
          },
          'empresa-1',
        );

        expect(prisma.cotizacion.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              fechaInicioRenta: new Date('2026-11-01T00:00:00.000Z'),
              fechaFinRenta: new Date('2026-11-30T00:00:00.000Z'),
            }),
          }),
        );
      });
    });
  });
});
