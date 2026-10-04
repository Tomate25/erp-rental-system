import { BadRequestException } from '@nestjs/common';
import { EstadoCotizacion, Prisma, TipoControlEquipo } from '@prisma/client';
import { resolveQuotationEquipment } from './resolve-quotation-equipment';
import { PrismaService } from '../../../prisma/prisma.service';
import { BillingService } from '../../billing/billing.service';

describe('Quotation equipment during billing', () => {
  function setup() {
    const item = {
      id: 'quotation-line-id',
      equipoId: 'physical-equipment-id',
      descripcion: 'Andamio',
      cantidad: 3,
      dias: 2,
      precioUnitario: 125,
      tipoCobro: 'POR_HORA',
      equipo: { tipoControl: TipoControlEquipo.SERIALIZADO, horometro: 0 },
    };
    const quote = {
      id: 'quote-id',
      empresaId: 'company-id',
      sucursalId: 'branch-id',
      clienteId: 'client-id',
      cliente: { empresaId: 'company-id' },
      estado: EstadoCotizacion.ACEPTADA,
      items: [item],
      facturas: [],
    };
    const tx = {
      auditoria: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
      $executeRaw: jest.fn(),
      equipo: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: item.equipoId,
            tipoControl: TipoControlEquipo.POR_CANTIDAD,
            horometro: 42,
          },
        ]),
      },
      cotizacion: {
        findUnique: jest.fn().mockResolvedValue({
          ...quote,
          estado: EstadoCotizacion.BORRADOR,
          contratos: [],
        }),
        update: jest.fn().mockResolvedValue(quote),
      },
      cliente: {
        findFirst: jest.fn().mockResolvedValue({ id: quote.clienteId }),
        update: jest.fn(),
      },
      secuenciaNumeracion: { upsert: jest.fn().mockResolvedValue({ ultimoValor: 1 }) },
      contrato: {
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'contract-id' }),
      },
      factura: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'invoice-id' }),
      },
      solicitudDespacho: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
      },
    };
    const prisma = {
      cotizacion: {
        findFirst: jest.fn().mockResolvedValue({
          ...quote,
          estado: EstadoCotizacion.ACEPTADA,
        }),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    const client = prisma as unknown as PrismaService;
    const run = () =>
      new BillingService(client).invoiceQuotation(
        quote.id,
        {},
        quote.empresaId,
      );
    return { item, quote, tx, prisma, run };
  }

  it('uses the physical equipment and current inventory metadata inside the transaction', async () => {
    const { tx, prisma, run } = setup();
    await run();

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.contrato.findFirst).toHaveBeenCalledWith({
      where: { cotizacionId: 'quote-id' },
    });
    expect(tx.contrato.create).toHaveBeenCalledTimes(1);
    expect(tx.equipo.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['physical-equipment-id'] },
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
                equipo: { connect: { id: 'physical-equipment-id' } },
                precioRenta: 125,
                cantidad: 3,
                tipoTarifa: 'HORA',
                dias: 2,
                horasPactadas: 2,
                tipoControl: TipoControlEquipo.POR_CANTIDAD,
                horometroInicial: 42,
              },
            ],
          },
        }),
      }),
    );
    expect(tx.solicitudDespacho.create).toHaveBeenCalledTimes(1);
  });

  it.each([null, undefined, ''])(
    'rejects equipoId=%s instead of using the quotation line ID',
    async (equipoId) => {
      const { item, tx, run } = setup();
      Object.assign(item, { equipoId });

      await expect(run()).rejects.toThrow('Debe asignar un equipo físico');
      expect(tx.equipo.findMany).not.toHaveBeenCalled();
      expect(tx.contrato.create).not.toHaveBeenCalled();
      expect(tx.solicitudDespacho.create).not.toHaveBeenCalled();
      expect(tx.factura.create).not.toHaveBeenCalled();
    },
  );

  it.each([true, false])(
    'avoids duplicate contracts and dispatches (equipment assigned: %s)',
    async (equipmentAssigned) => {
      const { item, quote, tx, run } = setup();
      tx.contrato.findFirst.mockResolvedValue({ id: 'existing-contract-id' });
      if (!equipmentAssigned) item.equipoId = '';

      const result = await run();

      expect(tx.contrato.findFirst).toHaveBeenCalledWith({
        where: { cotizacionId: quote.id },
      });
      expect(tx.equipo.findMany).not.toHaveBeenCalled();
      expect(tx.contrato.count).not.toHaveBeenCalled();
      expect(tx.contrato.create).not.toHaveBeenCalled();
      expect(tx.solicitudDespacho.count).not.toHaveBeenCalled();
      expect(tx.solicitudDespacho.create).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'invoice-id' });
      expect(tx.factura.create).toHaveBeenCalledTimes(1);
      expect(tx.factura.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cotizacionId: quote.id,
            contratoId: 'existing-contract-id',
          }),
        }),
      );
      expect(tx.cotizacion.update).toHaveBeenCalledWith({
        where: { id: quote.id },
        data: { estado: EstadoCotizacion.FACTURADA },
      });
    },
  );

  it('invoices an empty quotation without creating an operational contract', async () => {
    const { quote, tx, run } = setup();
    quote.items.length = 0;

    await run();

    expect(tx.factura.create).toHaveBeenCalledTimes(1);
    expect(tx.factura.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cotizacionId: quote.id,
          contratoId: undefined,
        }),
      }),
    );
    expect(tx.equipo.findMany).not.toHaveBeenCalled();
    expect(tx.contrato.create).not.toHaveBeenCalled();
    expect(tx.solicitudDespacho.create).not.toHaveBeenCalled();
  });

  it('rejects references absent from the company inventory', async () => {
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

describe('resolveQuotationEquipment con dias/horas Decimal', () => {
  const tx: any = {
    equipo: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'eq-1', tipoControl: 'SERIALIZADO', horometro: 0 },
      ]),
    },
  };
  const base = { equipoId: 'eq-1', descripcion: 'Retro', precioUnitario: 100, cantidad: 1 };

  it('POR_HORA: dias y horasPactadas salen como number (horas Decimal 19.5)', async () => {
    const [line] = await resolveQuotationEquipment(
      tx,
      [{ ...base, tipoCobro: 'POR_HORA', dias: new Prisma.Decimal('19.5'), horas: new Prisma.Decimal('19.5') }],
      'emp', 'suc',
    );
    expect(line.tipoTarifa).toBe('HORA');
    expect(line.dias).toBe(19.5);
    expect(line.horasPactadas).toBe(19.5);
  });

  it('POR_DIA: Decimal(0) cae a 1 y horasPactadas es null', async () => {
    const [line] = await resolveQuotationEquipment(
      tx,
      [{ ...base, tipoCobro: 'POR_DIA', dias: new Prisma.Decimal('0') }],
      'emp', 'suc',
    );
    expect(line.tipoTarifa).toBe('DIA');
    expect(line.dias).toBe(1);
    expect(line.horasPactadas).toBeNull();
  });

  it('POR_DIA con dias Decimal(3) conserva 3', async () => {
    const [line] = await resolveQuotationEquipment(
      tx,
      [{ ...base, tipoCobro: 'POR_DIA', dias: new Prisma.Decimal('3') }],
      'emp', 'suc',
    );
    expect(line.dias).toBe(3);
  });
});