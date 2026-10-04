import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { EstadoCotizacion } from '@prisma/client';
import { BillingService } from './billing/billing.service';
import { assertSucursalEnEmpresa } from '../common/utils/tenant.util';
import { resolveQuotationEquipment } from './contracts/utils/resolve-quotation-equipment';

/**
 * Una sucursal recibida del body o de una cotizacion debe pertenecer a la
 * empresa del token. La BD simulada responde como Postgres: solo encuentra la
 * sucursal si coinciden id Y empresaId.
 */
const SUCURSALES = [
  { id: 'suc-a', empresaId: 'A' },
  { id: 'suc-b', empresaId: 'B' },
];

function fakeDb() {
  return {
    sucursal: {
      findFirst: jest.fn(async ({ where }: any) =>
        SUCURSALES.find(
          (s) =>
            (!where.id || s.id === where.id) &&
            (!where.empresaId || s.empresaId === where.empresaId),
        ) ?? null,
      ),
    },
  };
}

describe('assertSucursalEnEmpresa', () => {
  it('acepta una sucursal de la empresa', async () => {
    await expect(assertSucursalEnEmpresa(fakeDb(), 'suc-a', 'A')).resolves.toBe('suc-a');
  });

  it('empresa A con sucursal de B: 404 "Sucursal no encontrada" (igual que inexistente)', async () => {
    const db = fakeDb();
    await expect(assertSucursalEnEmpresa(db, 'suc-b', 'A')).rejects.toThrow(
      new NotFoundException('Sucursal no encontrada'),
    );
    await expect(assertSucursalEnEmpresa(db, 'no-existe', 'A')).rejects.toThrow(
      new NotFoundException('Sucursal no encontrada'),
    );
    expect(db.sucursal.findFirst).toHaveBeenCalledWith({
      where: { id: 'suc-b', empresaId: 'A' },
      select: { id: true },
    });
  });

  it('falla cerrado sin empresa (nunca consulta sin filtro)', async () => {
    const db = fakeDb();
    await expect(assertSucursalEnEmpresa(db, 'suc-a', undefined)).rejects.toThrow(ForbiddenException);
    expect(db.sucursal.findFirst).not.toHaveBeenCalled();
  });
});

describe('resolveQuotationEquipment valida la sucursal contra la empresa', () => {
  const items = [{ equipoId: 'eq-1', descripcion: 'Retro', precioUnitario: 100, cantidad: 1 }];
  const mkTx = () => ({
    ...fakeDb(),
    equipo: {
      findMany: jest.fn().mockResolvedValue([{ id: 'eq-1', tipoControl: 'SERIALIZADO', horometro: 0 }]),
    },
  });

  it('sucursal de otra empresa: 404 y no consulta equipos', async () => {
    const tx: any = mkTx();
    await expect(resolveQuotationEquipment(tx, items, 'A', 'suc-b')).rejects.toThrow(
      new NotFoundException('Sucursal no encontrada'),
    );
    expect(tx.equipo.findMany).not.toHaveBeenCalled();
  });

  it('sucursal propia: resuelve el equipo', async () => {
    const tx: any = mkTx();
    const [line] = await resolveQuotationEquipment(tx, items, 'A', 'suc-a');
    expect(line.equipo).toEqual({ connect: { id: 'eq-1' } });
  });
});

describe('BillingService.invoiceQuotation valida la sucursal contra la empresa', () => {
  const cotizacion = (sucursalId: string | null) => ({
    id: 'cot-1',
    empresaId: 'A',
    sucursalId,
    clienteId: 'cli-1',
    cliente: { empresaId: 'A' },
    estado: EstadoCotizacion.ACEPTADA,
    items: [],
    facturas: [],
  });

  function setup(cotSucursalId: string | null) {
    const prisma: any = {
      ...fakeDb(),
      cotizacion: { findFirst: jest.fn().mockResolvedValue(cotizacion(cotSucursalId)) },
      $transaction: jest.fn().mockRejectedValue(new Error('TX_ALCANZADA')),
    };
    return { prisma, service: new BillingService(prisma) };
  }

  it('sucursalId del body de otra empresa (A -> B): 404 y no abre transacción', async () => {
    const { prisma, service } = setup(null);
    await expect(
      service.invoiceQuotation('cot-1', { sucursalId: 'suc-b' }, 'A'),
    ).rejects.toThrow(new NotFoundException('Sucursal no encontrada'));
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('sucursal de la cotización de otra empresa: 404 y no abre transacción', async () => {
    const { prisma, service } = setup('suc-b');
    await expect(service.invoiceQuotation('cot-1', {}, 'A')).rejects.toThrow(
      new NotFoundException('Sucursal no encontrada'),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('sucursalId inexistente: mismo 404 que una de otra empresa', async () => {
    const { service } = setup(null);
    await expect(
      service.invoiceQuotation('cot-1', { sucursalId: 'fantasma' }, 'A'),
    ).rejects.toThrow(new NotFoundException('Sucursal no encontrada'));
  });

  it('sucursalId propia: pasa la validación y llega a la transacción', async () => {
    const { prisma, service } = setup(null);
    await expect(
      service.invoiceQuotation('cot-1', { sucursalId: 'suc-a' }, 'A'),
    ).rejects.toThrow('TX_ALCANZADA');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
