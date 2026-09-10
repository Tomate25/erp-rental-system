import { BadRequestException, ConflictException } from '@nestjs/common';
import { EstadoCotizacion, TipoControlEquipo } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { BillingService } from '../../billing/billing.service';
import { QuotationsService } from '../../quotations/services/quotations.service';

describe.each(['approval', 'billing'] as const)('Quotation equipment during %s', flow => {
  function setup() {
    const item = {
      id: 'quotation-line-id', equipoId: 'physical-equipment-id',
      descripcion: 'Andamio', cantidad: 3, dias: 2, precioUnitario: 125,
      tipoCobro: 'POR_HORA',
      equipo: { tipoControl: TipoControlEquipo.SERIALIZADO, horometro: 0 },
    };
    const quote = {
      id: 'quote-id', empresaId: 'company-id', sucursalId: 'branch-id',
      clienteId: 'client-id', cliente: { empresaId: 'company-id' },
      estado: EstadoCotizacion.ACEPTADA, items: [item], facturas: [],
    };
    const tx = {
      $executeRaw: jest.fn(),
      equipo: { findMany: jest.fn().mockResolvedValue([{
        id: item.equipoId, tipoControl: TipoControlEquipo.POR_CANTIDAD, horometro: 42,
      }]) },
      cotizacion: {
        findUnique: jest.fn().mockResolvedValue({ ...quote, estado: EstadoCotizacion.BORRADOR, contratos: [] }),
        update: jest.fn().mockResolvedValue(quote),
      },
      cliente: { findFirst: jest.fn().mockResolvedValue({ id: quote.clienteId }), update: jest.fn() },
      contrato: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'contract-id' }),
      },
      factura: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'invoice-id' }) },
      solicitudDespacho: {
        count: jest.fn().mockResolvedValue(0), create: jest.fn(),
      },
    };
    const prisma = {
      cotizacion: { findFirst: jest.fn().mockResolvedValue({
        ...quote, estado: flow === 'approval' ? EstadoCotizacion.BORRADOR : EstadoCotizacion.ACEPTADA,
      }) },
      $transaction: jest.fn(async callback => callback(tx)),
    };
    const client = prisma as unknown as PrismaService;
    const run = () => flow === 'approval'
      ? new QuotationsService(client).update(quote.id, { estado: EstadoCotizacion.ACEPTADA }, quote.empresaId)
      : new BillingService(client).invoiceQuotation(quote.id, {}, quote.empresaId);
    return { item, quote, tx, prisma, run };
  }

  it('uses the physical equipment and current inventory metadata inside the transaction', async () => {
    const { tx, prisma, run } = setup();
    await run();

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.contrato.findFirst).toHaveBeenCalledWith({ where: { cotizacionId: 'quote-id' } });
    expect(tx.contrato.create).toHaveBeenCalledTimes(1);
    expect(tx.equipo.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['physical-equipment-id'] }, empresaId: 'company-id', sucursalId: 'branch-id',
      },
      select: { id: true, tipoControl: true, horometro: true },
    });
    expect(tx.contrato.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ items: { create: [{
        equipo: { connect: { id: 'physical-equipment-id' } },
        precioRenta: 125, cantidad: 3, tipoTarifa: 'HORA', dias: 2,
        tipoControl: TipoControlEquipo.POR_CANTIDAD, horometroInicial: 42,
      }] } }),
    }));
    expect(tx.solicitudDespacho.create).toHaveBeenCalledTimes(1);
  });

  it.each([null, undefined, ''])('rejects equipoId=%s instead of using the quotation line ID', async equipoId => {
    const { item, tx, run } = setup();
    Object.assign(item, { equipoId });

    await expect(run()).rejects.toThrow('Debe asignar un equipo físico');
    expect(tx.equipo.findMany).not.toHaveBeenCalled();
    expect(tx.contrato.create).not.toHaveBeenCalled();
    expect(tx.solicitudDespacho.create).not.toHaveBeenCalled();
    expect(tx.factura.create).not.toHaveBeenCalled();
  });

  it.each([true, false])('avoids duplicate contracts and dispatches (equipment assigned: %s)', async equipmentAssigned => {
    const { item, quote, tx, run } = setup();
    tx.contrato.findFirst.mockResolvedValue({ id: 'existing-contract-id' });
    if (!equipmentAssigned) item.equipoId = '';

    if (flow === 'approval') {
      tx.cotizacion.findUnique.mockResolvedValue({ ...quote, contratos: [{ id: 'existing-contract-id' }] });
      await expect(run()).rejects.toThrow(ConflictException);
      expect(tx.cotizacion.update).not.toHaveBeenCalled();
      expect(tx.equipo.findMany).not.toHaveBeenCalled();
      expect(tx.contrato.create).not.toHaveBeenCalled();
      expect(tx.solicitudDespacho.create).not.toHaveBeenCalled();
      return;
    }

    const result = await run();

    expect(tx.contrato.findFirst).toHaveBeenCalledWith({ where: { cotizacionId: quote.id } });
    expect(tx.equipo.findMany).not.toHaveBeenCalled();
    expect(tx.contrato.count).not.toHaveBeenCalled();
    expect(tx.contrato.create).not.toHaveBeenCalled();
    expect(tx.solicitudDespacho.count).not.toHaveBeenCalled();
    expect(tx.solicitudDespacho.create).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'invoice-id' });
      expect(tx.factura.create).toHaveBeenCalledTimes(1);
      expect(tx.factura.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ cotizacionId: quote.id, contratoId: 'existing-contract-id' }),
      }));
      expect(tx.cotizacion.update).toHaveBeenCalledWith({
        where: { id: quote.id }, data: { estado: EstadoCotizacion.FACTURADA },
      });
  });

  if (flow === 'billing') {
    it('invoices an empty quotation without creating an operational contract', async () => {
      const { quote, tx, run } = setup();
      quote.items.length = 0;

      await run();

      expect(tx.factura.create).toHaveBeenCalledTimes(1);
      expect(tx.factura.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ cotizacionId: quote.id, contratoId: undefined }),
      }));
      expect(tx.equipo.findMany).not.toHaveBeenCalled();
      expect(tx.contrato.create).not.toHaveBeenCalled();
      expect(tx.solicitudDespacho.create).not.toHaveBeenCalled();
    });
  } else {
    it('does not generate another contract for an already accepted quotation', async () => {
      const { quote, prisma, tx, run } = setup();
      prisma.cotizacion.findFirst.mockResolvedValue(quote);
      tx.cotizacion.findUnique.mockResolvedValue({ ...quote, contratos: [] });

      await expect(run()).rejects.toThrow(ConflictException);

      expect(tx.cotizacion.update).not.toHaveBeenCalled();
      expect(tx.contrato.findFirst).not.toHaveBeenCalled();
      expect(tx.contrato.create).not.toHaveBeenCalled();
      expect(tx.solicitudDespacho.create).not.toHaveBeenCalled();
    });
  }

  it('rejects references absent from the company and branch inventory', async () => {
    const { tx, run } = setup();
    tx.equipo.findMany.mockResolvedValue([]);

    await expect(run()).rejects.toThrow(BadRequestException);
    expect(tx.contrato.create).not.toHaveBeenCalled();
    expect(tx.solicitudDespacho.create).not.toHaveBeenCalled();
    expect(tx.factura.create).not.toHaveBeenCalled();
  });

  it('rejects the whole conversion if a later line has no assigned equipment', async () => {
    const { quote, item, tx, run } = setup();
    quote.items.push({ ...item, id: 'unassigned-line', equipoId: '' });

    await expect(run()).rejects.toThrow(BadRequestException);
    expect(tx.contrato.create).not.toHaveBeenCalled();
    expect(tx.solicitudDespacho.create).not.toHaveBeenCalled();
    expect(tx.factura.create).not.toHaveBeenCalled();
  });
});
