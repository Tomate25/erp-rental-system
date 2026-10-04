import { BadRequestException } from '@nestjs/common';
import { EstadoCotizacion, TipoControlEquipo } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateDirectContractDto } from '../dto/create-contract.dto';
import { ContractsService } from './contracts.service';

describe('ContractsService inventory integrity', () => {
  function setup() {
    const equipo = {
      id: 'equipment-id',
      empresaId: 'company-id',
      sucursalId: 'branch-id',
      descripcion: 'Andamio',
      modelo: 'AND-1',
      cantidadTotal: 2,
      cantidadDisponible: 2,
      tipoControl: TipoControlEquipo.POR_CANTIDAD,
      horometro: 42,
      precioRentaDia: 125,
      precioRentaHora: 20,
    };
    const dto: CreateDirectContractDto = {
      clienteId: 'client-id',
      fechaInicio: '2026-09-08',
      fechaFin: '2026-09-10',
      items: [{ equipoId: equipo.id, precioRenta: 125, cantidad: 2, dias: 2 }],
    };
    const quote = {
      id: 'quote-id',
      sucursalId: 'branch-id',
      clienteId: dto.clienteId,
      cliente: { direccion: 'Dirección de entrega' },
      estado: EstadoCotizacion.ACEPTADA,
      total: 500,
      items: [
        {
          id: 'quote-line-id',
          equipoId: equipo.id,
          descripcion: 'Andamio',
          cantidad: 2,
          precioUnitario: 125,
          equipo: { tipoControl: TipoControlEquipo.SERIALIZADO, horometro: 0 },
        },
      ],
    };
    const contract = {
      id: 'contract-id',
      sucursalId: 'branch-id',
      codigo: 'CTR-2026-0001',
      fechaInicio: new Date(dto.fechaInicio),
      fechaFin: new Date(dto.fechaFin),
    };
    const tx = {
      $executeRaw: jest.fn(),
      sucursal: { findFirst: jest.fn().mockResolvedValue({ id: 'branch-id' }) },
      equipo: {
        findMany: jest.fn().mockResolvedValue([equipo]),
        update: jest.fn(),
        create: jest.fn(),
      },
      categoria: { create: jest.fn() },
      marca: { create: jest.fn() },
      secuenciaNumeracion: { upsert: jest.fn().mockResolvedValue({ ultimoValor: 1 }) },
      contrato: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(contract),
        findUniqueOrThrow: jest.fn().mockResolvedValue(contract),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue(contract),
        update: jest.fn().mockResolvedValue(contract),
      },
      cotizacion: {
        findFirst: jest.fn().mockResolvedValue(quote),
        update: jest.fn(),
      },
      corteFacturacion: { create: jest.fn() },
      solicitudDespacho: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
      },
      reserva: { create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      auditoria: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = {
      cliente: {
        findFirst: jest.fn().mockResolvedValue({ id: dto.clienteId }),
      },
      sucursal: { findFirst: jest.fn().mockResolvedValue({ id: 'branch-id' }) },
      secuenciaNumeracion: { upsert: jest.fn().mockResolvedValue({ ultimoValor: 1 }) },
      contrato: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    const service = new ContractsService(prisma as unknown as PrismaService);
    const runDirect = () => service.createDirect(dto, 'company-id');
    const runQuotation = () =>
      service.createFromQuotation(
        {
          cotizacionId: quote.id,
          fechaInicio: dto.fechaInicio,
          fechaFin: dto.fechaFin,
        },
        'company-id',
      );
    const expectNoFakeInventory = () => {
      expect(tx.equipo.create).not.toHaveBeenCalled();
      expect(tx.categoria.create).not.toHaveBeenCalled();
      expect(tx.marca.create).not.toHaveBeenCalled();
    };
    const expectNoContract = () => {
      expect(tx.contrato.create).not.toHaveBeenCalled();
      expect(tx.corteFacturacion.create).not.toHaveBeenCalled();
      expect(tx.solicitudDespacho.create).not.toHaveBeenCalled();
      expect(tx.cotizacion.update).not.toHaveBeenCalled();
      expectNoFakeInventory();
      expect(tx.equipo.update).not.toHaveBeenCalled();
      expect(tx.reserva.create).not.toHaveBeenCalled();
    };
    return {
      equipo,
      dto,
      quote,
      contract,
      tx,
      prisma,
      service,
      runDirect,
      runQuotation,
      expectNoFakeInventory,
      expectNoContract,
    };
  }

  it('creates a direct contract with exactly the real stock, without raising inventory to four', async () => {
    const { equipo, contract, tx, runDirect, expectNoFakeInventory } = setup();

    await expect(runDirect()).resolves.toBe(contract);

    expect(tx.equipo.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [equipo.id] },
        empresaId: 'company-id',
      },
    });
    expect(tx.contrato.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: {
            create: [
              {
                equipoId: equipo.id,
                precioRenta: 125,
                cantidad: 2,
                dias: 2,
                tipoTarifa: 'DIA',
                horasPactadas: null,
                horasPorDia: null,
                tipoControl: TipoControlEquipo.POR_CANTIDAD,
                horometroInicial: 42,
              },
            ],
          },
        }),
      }),
    );
    expect(tx.equipo.update).toHaveBeenCalledWith({
      where: { id: equipo.id },
      data: { cantidadDisponible: 0 },
    });
    expect(tx.reserva.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contratoId: contract.id,
        equipoId: equipo.id,
        estado: 'CONFIRMADA',
      }),
    });
    expect(tx.corteFacturacion.create).toHaveBeenCalledTimes(1);
    expect(tx.solicitudDespacho.create).toHaveBeenCalledTimes(1);
    expect(equipo.cantidadTotal).toBe(2);
    expectNoFakeInventory();
  });

  it('ignora el precio manipulado del cliente y usa la tarifa oficial del equipo', async () => {
    const { dto, equipo, tx, runDirect } = setup();
    dto.items[0].precioRenta = 1;

    await runDirect();

    expect(tx.contrato.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: {
            create: [
              expect.objectContaining({ precioRenta: equipo.precioRentaDia }),
            ],
          },
        }),
      }),
    );
  });

  it.each([0, 1])(
    'rejects insufficient direct stock (%s units) without replenishment',
    async (available) => {
      const { equipo, runDirect, expectNoContract } = setup();
      equipo.cantidadDisponible = available;

      await expect(runDirect()).rejects.toThrow(
        `Stock insuficiente para el equipo Andamio. Disponible: ${available}`,
      );
      expectNoContract();
    },
  );

  it('counts repeated equipment lines against the same inventory', async () => {
    const { dto, runDirect, expectNoContract } = setup();
    dto.items.push({ ...dto.items[0], cantidad: 1 });

    await expect(runDirect()).rejects.toThrow('Stock insuficiente');
    expectNoContract();
  });

  it('allows repeated lines when their total fits the real inventory', async () => {
    const { dto, tx, runDirect, expectNoFakeInventory } = setup();
    dto.items[0].cantidad = 1;
    dto.items.push({ ...dto.items[0] });

    await runDirect();

    expect(tx.contrato.create).toHaveBeenCalledTimes(1);
    expect(tx.equipo.update).toHaveBeenCalledTimes(1);
    expect(tx.reserva.create).toHaveBeenCalledTimes(1);
    expectNoFakeInventory();
  });

  it('defaults omitted quantity to one and retains an explicitly supplied zero hour meter', async () => {
    const { dto, equipo, tx, runDirect } = setup();
    delete dto.items[0].cantidad;
    dto.items[0].horometroInicial = 0;
    equipo.cantidadDisponible = 1;

    await runDirect();

    expect(tx.contrato.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: {
            create: [
              expect.objectContaining({ cantidad: 1, horometroInicial: 0 }),
            ],
          },
        }),
      }),
    );
  });

  it.each([0, -1, 1.5, NaN])(
    'rejects invalid quantity %s before consulting equipment',
    async (cantidad) => {
      const { dto, tx, runDirect, expectNoContract } = setup();
      dto.items[0].cantidad = cantidad;

      await expect(runDirect()).rejects.toThrow(BadRequestException);
      expect(tx.equipo.findMany).not.toHaveBeenCalled();
      expectNoContract();
    },
  );

  it('rejects a product-only direct line instead of inventing equipment', async () => {
    const { dto, runDirect, expectNoContract } = setup();
    dto.items[0] = {
      productoId: 'product-id',
      precioRenta: 100,
      cantidad: 1,
      dias: 1,
    };

    await expect(runDirect()).rejects.toThrow('Debe asignar un equipo físico');
    expectNoContract();
  });

  it('rejects direct equipment absent from the company', async () => {
    const { tx, runDirect, expectNoContract } = setup();
    tx.equipo.findMany.mockResolvedValue([]);

    await expect(runDirect()).rejects.toThrow(
      'no existe en la empresa del contrato',
    );
    expectNoContract();
  });

  it('converts a quotation through the shared physical equipment resolver', async () => {
    const { equipo, tx, runQuotation, expectNoFakeInventory } = setup();

    await runQuotation();

    expect(tx.equipo.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: [equipo.id] },
        empresaId: 'company-id',
      },
      select: { id: true, tipoControl: true, horometro: true },
    });
    expect(tx.contrato.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: {
            create: [
              {
                equipo: { connect: { id: equipo.id } },
                precioRenta: 125,
                cantidad: 2,
                tipoTarifa: 'DIA',
                horasPactadas: null,
                dias: 1,
                tipoControl: TipoControlEquipo.POR_CANTIDAD,
                horometroInicial: 42,
              },
            ],
          },
        }),
      }),
    );
    expect(tx.equipo.update).toHaveBeenCalled();
    expect(tx.reserva.create).toHaveBeenCalled();
    expect(tx.cotizacion.update).toHaveBeenCalledWith({
      where: { id: 'quote-id' },
      data: { estado: EstadoCotizacion.CONVERTIDA_A_CONTRATO },
    });
    expect(tx.corteFacturacion.create).toHaveBeenCalledTimes(1);
    expect(tx.solicitudDespacho.create).toHaveBeenCalledTimes(1);
    expectNoFakeInventory();
  });

  it('rejects a quotation without assigned equipment, without description matching or fabrication', async () => {
    const { quote, tx, runQuotation, expectNoContract } = setup();
    quote.items[0].equipoId = '';

    await expect(runQuotation()).rejects.toThrow(
      'Debe asignar un equipo físico',
    );
    expect(tx.equipo.findMany).not.toHaveBeenCalled();
    expectNoContract();
  });

  it('rejects a quotation referencing equipment absent from the company', async () => {
    const { tx, runQuotation, expectNoContract } = setup();
    tx.equipo.findMany.mockResolvedValue([]);

    await expect(runQuotation()).rejects.toThrow(
      'no existe en la empresa del contrato',
    );
    expectNoContract();
  });

  describe('Flexible cortes generation', () => {
    it('abre 21 días con dos productos mixtos y cobra cada corte de 2 días según sus unidades', async () => {
      const { service, prisma, tx, contract } = setup();
      const mixed = {
        ...contract,
        fechaInicio: new Date('2026-09-26T12:00:00Z'),
        fechaFin: new Date('2026-10-17T12:00:00Z'),
        cortesFacturacion: [],
        cotizacion: { total: 1035, items: [
          { precioUnitario: 100, cantidad: 1, dias: 1, tipoCobro: 'POR_DIA' },
          { precioUnitario: 50, cantidad: 2, horas: 8, tipoCobro: 'POR_HORA' },
        ] },
        items: [
          { id: 'daily-line', equipoId: 'daily', precioRenta: 100, cantidad: 1, dias: 1, tipoTarifa: 'DIA' },
          { id: 'hourly-line', equipoId: 'hourly', precioRenta: 50, cantidad: 2, dias: 8, tipoTarifa: 'HORA' },
        ],
      };
      (prisma as any).contrato = { findFirst: jest.fn().mockResolvedValue(mixed) };
      (tx as any).detalleContrato = { update: jest.fn() };
      tx.corteFacturacion = {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: 'corte' }),
        findMany: jest.fn().mockResolvedValue([]),
      };
      await service.openContract('contract-id', 2, 'company-id', 'user-id', undefined,
        '2026-09-26', '2026-10-17', [{ detalleContratoId: 'hourly-line', horasPorDia: 8 }]);

      expect((tx as any).detalleContrato.update).toHaveBeenCalledWith({
        where: { id: 'hourly-line' }, data: { horasPorDia: 8, horasPactadas: 168 },
      });
      expect((tx as any).detalleContrato.update).toHaveBeenCalledWith({
        where: { id: 'daily-line' }, data: { dias: 21 },
      });
      const amounts = (tx.corteFacturacion.create as jest.Mock).mock.calls.map(call => call[0].data.monto);
      expect(amounts).toHaveLength(11);
      expect(amounts.slice(0, 2)).toEqual([2070, 2070]);
      expect(amounts[10]).toBe(1035);
    });

    it('cobra 22, 22 y 7 días según tarifa diaria, sin repartir el total por tercios', async () => {
      const { service, prisma, tx, contract } = setup();
      const contractByDay = {
        ...contract,
        fechaInicio: new Date('2026-09-25'),
        fechaFin: new Date('2026-11-15'),
        cotizacion: { total: 759 },
        items: [{ precioRenta: 660, cantidad: 1, dias: 1, tipoTarifa: 'DIA' }],
      };
      (prisma as any).contrato = { findFirst: jest.fn().mockResolvedValue(contractByDay) };
      tx.corteFacturacion = {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: 'corte' }),
        findMany: jest.fn().mockResolvedValue([]),
      };
      (tx as any).contrato = {
        update: jest.fn().mockResolvedValue(contractByDay),
        findUniqueOrThrow: jest.fn().mockResolvedValue(contractByDay),
      };

      await service.openContract('contract-id', 22, 'company-id', 'user-id', 3, '2026-09-25', '2026-11-15');

      const cuts = (tx.corteFacturacion.create as jest.Mock).mock.calls.map(call => call[0].data);
      expect(cuts.map(cut => cut.monto)).toEqual([16698, 16698, 5313]);
      expect(cuts.map(cut => cut.fechaFin.toISOString().slice(0, 10))).toEqual(['2026-10-17', '2026-11-08', '2026-11-15']);
    });

    it('al reprogramar conserva el corte facturado y cobra solo los días restantes', async () => {
      const { service, prisma, tx, contract } = setup();
      const contractByDay = {
        ...contract,
        fechaInicio: new Date('2026-09-25'),
        fechaFin: new Date('2026-11-15'),
        cotizacion: { total: 759 },
        items: [{ precioRenta: 660, cantidad: 1, dias: 1, tipoTarifa: 'DIA' }],
      };
      (prisma as any).contrato = { findFirst: jest.fn().mockResolvedValue(contractByDay) };
      const billed = { numeroCorte: 1, fechaFin: new Date('2026-10-17'), monto: 16698 };
      tx.corteFacturacion = {
        findMany: jest.fn().mockResolvedValueOnce([billed]).mockResolvedValueOnce([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
        create: jest.fn().mockResolvedValue({ id: 'new-cut' }),
      };

      await service.generateCortes('contract-id', 22, 'company-id', 'user-id', 2);

      const cuts = (tx.corteFacturacion.create as jest.Mock).mock.calls.map(call => call[0].data);
      expect(cuts.map(cut => cut.numeroCorte)).toEqual([2, 3]);
      expect(cuts.map(cut => cut.monto)).toEqual([16698, 5313]);
      expect(tx.corteFacturacion.deleteMany).toHaveBeenCalledWith({ where: { contratoId: 'contract-id', estado: 'PENDIENTE' } });
    });

    it('generates the exact number of cuts and divides total without rounding discrepancies', async () => {
      const { service, prisma, tx, contract } = setup();
      const contractWithQuote = {
        ...contract,
        cotizacion: { total: 2317.25 },
        items: [],
      };
      (prisma as any).contrato = {
        ...((prisma as any).contrato || {}),
        findFirst: jest.fn().mockResolvedValue(contractWithQuote),
      };
      (tx as any).factura = { findMany: jest.fn().mockResolvedValue([]) };
      tx.corteFacturacion = {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'corte-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      };
      (tx as any).contrato = {
        update: jest.fn().mockResolvedValue(contractWithQuote),
        findUniqueOrThrow: jest.fn().mockResolvedValue(contractWithQuote),
        findUnique: jest.fn().mockResolvedValue(contractWithQuote),
      };

      await service.openContract('contract-id', 20, 'company-id', 'user-id', 4);

      expect(tx.corteFacturacion.create).toHaveBeenCalledTimes(4);
      const createdCalls = (tx.corteFacturacion.create as jest.Mock).mock.calls;
      const montos = createdCalls.map((c) => c[0].data.monto);
      const sum = montos.reduce((a: number, b: number) => a + b, 0);
      expect(Math.round(sum * 100) / 100).toBe(2317.25);
      expect(montos[0]).toBe(579.32);
      expect(montos[1]).toBe(579.31);
      expect(montos[2]).toBe(579.31);
      expect(montos[3]).toBe(579.31);
    });

    it('opens contract updating fechaInicio, fechaFin, reservas, and generates cortes every 10 days', async () => {
      const { service, prisma, tx, contract } = setup();
      const contractWithQuote = {
        ...contract,
        fechaInicio: new Date('2026-01-01'),
        fechaFin: new Date('2026-02-01'),
        cotizacion: { total: 3000 },
        items: [],
      };
      (prisma as any).contrato = {
        ...((prisma as any).contrato || {}),
        findFirst: jest.fn().mockResolvedValue(contractWithQuote),
      };
      tx.corteFacturacion = {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: 'corte-x' }),
        findMany: jest.fn().mockResolvedValue([]),
      };
      (tx as any).contrato = {
        update: jest.fn().mockResolvedValue(contractWithQuote),
        findUniqueOrThrow: jest.fn().mockResolvedValue(contractWithQuote),
        findUnique: jest.fn().mockResolvedValue(contractWithQuote),
      };

      await service.openContract(
        'contract-id',
        10,
        'company-id',
        'user-id',
        6,
        '2026-03-25',
        '2026-05-25',
      );

      expect(tx.contrato.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: 'ACTIVO',
            fechaInicio: new Date('2026-03-25T12:00:00.000Z'),
            fechaFin: new Date('2026-05-25T12:00:00.000Z'),
          }),
        }),
      );
      expect(tx.reserva.updateMany).toHaveBeenCalledWith({
        where: { contratoId: 'contract-id' },
        data: {
          fechaInicio: new Date('2026-03-25T12:00:00.000Z'),
          fechaFin: new Date('2026-05-25T12:00:00.000Z'),
        },
      });
      expect(tx.corteFacturacion.create).toHaveBeenCalledTimes(6);
    });

    it('uses the quoted rental dates when opening and scheduling cuts', async () => {
      const { service, prisma, tx, contract } = setup();
      const quotedContract = {
        ...contract,
        cotizacion: {
          total: 3000,
          fechaInicioRenta: new Date('2026-09-25T12:00:00.000Z'),
          fechaFinRenta: new Date('2026-10-17T12:00:00.000Z'),
        },
        items: [],
      };
      (prisma as any).contrato = {
        ...((prisma as any).contrato || {}),
        findFirst: jest.fn().mockResolvedValue(quotedContract),
      };
      tx.corteFacturacion = {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockResolvedValue({ id: 'corte-x' }),
        findMany: jest.fn().mockResolvedValue([]),
      };
      (tx as any).contrato = {
        update: jest.fn().mockResolvedValue(quotedContract),
        findUniqueOrThrow: jest.fn().mockResolvedValue(quotedContract),
      };

      await expect(service.openContract(
        'contract-id', 10, 'company-id', 'user-id', 3,
        '2026-09-25', '2026-10-20',
      )).rejects.toThrow('Las fechas del contrato deben respetar el período pactado');
      expect(tx.contrato.update).not.toHaveBeenCalled();

      await service.openContract('contract-id', 10, 'company-id', 'user-id', 9, '2026-09-25');
      expect(tx.contrato.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          fechaInicio: new Date('2026-09-25T12:00:00.000Z'),
          fechaFin: new Date('2026-10-17T12:00:00.000Z'),
        }),
      }));
      expect(tx.corteFacturacion.create).toHaveBeenCalledTimes(3);
    });

    it('creates direct contract with hourly equipment calculating horasPactadas from horasPorDia and duration', async () => {
      const { service, equipo, tx } = setup();
      const directDto: CreateDirectContractDto = {
        clienteId: 'client-id',
        fechaInicio: '2026-09-10',
        fechaFin: '2026-09-15',
        items: [
          {
            equipoId: equipo.id,
            precioRenta: 20,
            cantidad: 1,
            tipoTarifa: 'HORA',
            horasPorDia: 8,
          },
        ],
      };

      await service.createDirect(directDto, 'company-id');

      expect(tx.contrato.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: {
              create: [
                expect.objectContaining({
                  equipoId: equipo.id,
                  precioRenta: 20,
                  cantidad: 1,
                  tipoTarifa: 'HORA',
                  horasPorDia: 8,
                  horasPactadas: 40,
                  dias: 40,
                }),
              ],
            },
          }),
        }),
      );
    });
  });
});
