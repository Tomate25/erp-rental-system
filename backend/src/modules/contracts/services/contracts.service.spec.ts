import { BadRequestException } from '@nestjs/common';
import { EstadoCotizacion, TipoControlEquipo } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateDirectContractDto } from '../dto/create-contract.dto';
import { ContractsService } from './contracts.service';

describe('ContractsService inventory integrity', () => {
  function setup() {
    const equipo = {
      id: 'equipment-id', empresaId: 'company-id', sucursalId: 'branch-id',
      descripcion: 'Andamio', modelo: 'AND-1', cantidadTotal: 2, cantidadDisponible: 2,
      tipoControl: TipoControlEquipo.POR_CANTIDAD, horometro: 42,
    };
    const dto: CreateDirectContractDto = {
      clienteId: 'client-id', fechaInicio: '2026-09-08', fechaFin: '2026-09-10',
      items: [{ equipoId: equipo.id, precioRenta: 125, cantidad: 2, dias: 2 }],
    };
    const quote = {
      id: 'quote-id', sucursalId: 'branch-id', clienteId: dto.clienteId,
      cliente: { direccion: 'Dirección de entrega' }, estado: EstadoCotizacion.ACEPTADA,
      total: 500, items: [{
        id: 'quote-line-id', equipoId: equipo.id, descripcion: 'Andamio', cantidad: 2,
        precioUnitario: 125, equipo: { tipoControl: TipoControlEquipo.SERIALIZADO, horometro: 0 },
      }],
    };
    const contract = {
      id: 'contract-id', sucursalId: 'branch-id', codigo: 'CTR-2026-0001',
      fechaInicio: new Date(dto.fechaInicio), fechaFin: new Date(dto.fechaFin),
    };
    const tx = {
      $executeRaw: jest.fn(),
      sucursal: { findFirst: jest.fn().mockResolvedValue({ id: 'branch-id' }) },
      equipo: {
        findMany: jest.fn().mockResolvedValue([equipo]),
        update: jest.fn(), create: jest.fn(),
      },
      categoria: { create: jest.fn() }, marca: { create: jest.fn() },
      contrato: { findFirst: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue(contract) },
      cotizacion: { findFirst: jest.fn().mockResolvedValue(quote), update: jest.fn() },
      corteFacturacion: { create: jest.fn() },
      solicitudDespacho: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
      reserva: { create: jest.fn(), update: jest.fn() },
    };
    const prisma = {
      cliente: { findFirst: jest.fn().mockResolvedValue({ id: dto.clienteId }) },
      sucursal: { findFirst: jest.fn().mockResolvedValue({ id: 'branch-id' }) },
      contrato: { count: jest.fn().mockResolvedValue(0) },
      $transaction: jest.fn(async callback => callback(tx)),
    };
    const service = new ContractsService(prisma as unknown as PrismaService);
    const runDirect = () => service.createDirect(dto, 'company-id');
    const runQuotation = () => service.createFromQuotation({
      cotizacionId: quote.id, fechaInicio: dto.fechaInicio, fechaFin: dto.fechaFin,
    }, 'company-id');
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
    return { equipo, dto, quote, contract, tx, runDirect, runQuotation, expectNoFakeInventory, expectNoContract };
  }

  it('creates a direct contract with exactly the real stock, without raising inventory to four', async () => {
    const { equipo, contract, tx, runDirect, expectNoFakeInventory } = setup();

    await expect(runDirect()).resolves.toBe(contract);

    expect(tx.equipo.findMany).toHaveBeenCalledWith({ where: {
      id: { in: [equipo.id] }, empresaId: 'company-id', sucursalId: 'branch-id',
    } });
    expect(tx.contrato.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ items: { create: [{
        equipoId: equipo.id, precioRenta: 125, cantidad: 2, dias: 2,
        tipoControl: TipoControlEquipo.POR_CANTIDAD, horometroInicial: 42,
      }] } }),
    }));
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

  it.each([0, 1])('rejects insufficient direct stock (%s units) without replenishment', async available => {
    const { equipo, runDirect, expectNoContract } = setup();
    equipo.cantidadDisponible = available;

    await expect(runDirect()).rejects.toThrow(`Stock insuficiente para el equipo Andamio. Disponible: ${available}`);
    expectNoContract();
  });

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

    expect(tx.contrato.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ items: { create: [expect.objectContaining({ cantidad: 1, horometroInicial: 0 })] } }),
    }));
  });

  it.each([0, -1, 1.5, NaN])('rejects invalid quantity %s before consulting equipment', async cantidad => {
    const { dto, tx, runDirect, expectNoContract } = setup();
    dto.items[0].cantidad = cantidad;

    await expect(runDirect()).rejects.toThrow(BadRequestException);
    expect(tx.equipo.findMany).not.toHaveBeenCalled();
    expectNoContract();
  });

  it('rejects a product-only direct line instead of inventing equipment', async () => {
    const { dto, runDirect, expectNoContract } = setup();
    dto.items[0] = { productoId: 'product-id', precioRenta: 100, cantidad: 1, dias: 1 };

    await expect(runDirect()).rejects.toThrow('Debe asignar un equipo físico');
    expectNoContract();
  });

  it('rejects direct equipment absent from the company and branch', async () => {
    const { tx, runDirect, expectNoContract } = setup();
    tx.equipo.findMany.mockResolvedValue([]);

    await expect(runDirect()).rejects.toThrow('no existe en la empresa y sucursal');
    expectNoContract();
  });

  it('converts a quotation through the shared physical equipment resolver', async () => {
    const { equipo, tx, runQuotation, expectNoFakeInventory } = setup();

    await runQuotation();

    expect(tx.equipo.findMany).toHaveBeenCalledWith({
      where: { id: { in: [equipo.id] }, empresaId: 'company-id', sucursalId: 'branch-id' },
      select: { id: true, tipoControl: true, horometro: true },
    });
    expect(tx.contrato.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ items: { create: [{
        equipo: { connect: { id: equipo.id } }, precioRenta: 125, cantidad: 2,
        tipoTarifa: 'DIA', dias: 1,
        tipoControl: TipoControlEquipo.POR_CANTIDAD, horometroInicial: 42,
      }] } }),
    }));
    expect(tx.equipo.update).toHaveBeenCalled();
    expect(tx.reserva.create).toHaveBeenCalled();
    expect(tx.cotizacion.update).toHaveBeenCalledWith({
      where: { id: 'quote-id' }, data: { estado: EstadoCotizacion.CONVERTIDA_A_CONTRATO },
    });
    expect(tx.corteFacturacion.create).toHaveBeenCalledTimes(1);
    expect(tx.solicitudDespacho.create).toHaveBeenCalledTimes(1);
    expectNoFakeInventory();
  });

  it('rejects a quotation without assigned equipment, without description matching or fabrication', async () => {
    const { quote, tx, runQuotation, expectNoContract } = setup();
    quote.items[0].equipoId = '';

    await expect(runQuotation()).rejects.toThrow('Debe asignar un equipo físico');
    expect(tx.equipo.findMany).not.toHaveBeenCalled();
    expectNoContract();
  });

  it('rejects a quotation referencing equipment absent from the company and branch', async () => {
    const { tx, runQuotation, expectNoContract } = setup();
    tx.equipo.findMany.mockResolvedValue([]);

    await expect(runQuotation()).rejects.toThrow('no existe en la empresa y sucursal');
    expectNoContract();
  });
});
