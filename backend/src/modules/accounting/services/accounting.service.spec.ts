import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountingService } from './accounting.service';

describe('Accounting tenant isolation', () => {
  function setup() {
    const prisma = {
      factura: { findMany: jest.fn().mockResolvedValue([]) },
      mantenimiento: { findMany: jest.fn().mockResolvedValue([]) },
      inspeccionDano: { findMany: jest.fn().mockResolvedValue([]) },
      pago: { findMany: jest.fn().mockResolvedValue([]) },
      contrato: { findMany: jest.fn().mockResolvedValue([]) },
      equipo: { findMany: jest.fn().mockResolvedValue([]) },
    };
    return { prisma, service: new AccountingService(prisma as unknown as PrismaService) };
  }

  const reports = ['getCuentasPorCobrar', 'getCuentasPorPagar', 'getEstadoResultados', 'getBalanceGeneral'] as const;
  describe.each(reports)('%s', report => {
    it.each([undefined, null, '', '   '])('rejects missing tenant %s without running global queries', async empresaId => {
      const { prisma, service } = setup();
      await expect(service[report](empresaId as unknown as string)).rejects.toThrow(ForbiddenException);
      for (const delegate of Object.values(prisma)) expect(delegate.findMany).not.toHaveBeenCalled();
    });
  });

  it.each(['company-a', 'company-b'])('scopes all balance and income statement sources to %s', async empresaId => {
    const { prisma, service } = setup();
    await service.getBalanceGeneral(empresaId);
    await service.getEstadoResultados(empresaId);

    for (const [query] of prisma.factura.findMany.mock.calls) {
      expect(query.where).toEqual({ empresaId, cliente: { empresaId } });
    }
    expect(prisma.factura.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.pago.findMany).toHaveBeenCalledWith({ where: { factura: { empresaId, cliente: { empresaId } } } });
    expect(prisma.contrato.findMany).toHaveBeenCalledWith({ where: { sucursal: { empresaId }, cliente: { empresaId } } });
    expect(prisma.equipo.findMany).toHaveBeenCalledWith({ where: { empresaId, sucursal: { empresaId } } });
    for (const [query] of prisma.mantenimiento.findMany.mock.calls) {
      expect(query.where).toEqual({ equipo: { empresaId, sucursal: { empresaId } } });
    }
    expect(prisma.mantenimiento.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.inspeccionDano.findMany).toHaveBeenCalledWith({ where: {
      detalleDevolucion: {
        equipo: { empresaId },
        devolucion: { sucursal: { empresaId }, contrato: { sucursal: { empresaId }, cliente: { empresaId } } },
      },
    } });
  });

  it('keeps receivables, cash and damage income separated between two companies', async () => {
    const { prisma, service } = setup();
    const invoices = ['company-a', 'company-b'].map((empresaId, index) => ({
      id: `invoice-${empresaId}`, empresaId, cliente: { empresaId, nombre: empresaId },
      clienteId: `client-${empresaId}`, total: (index + 1) * 100, subtotal: (index + 1) * 100,
      iva: 0, pagos: [], estado: 'PENDIENTE', fechaVence: new Date('2099-01-01'),
    }));
    // A mismatched invoice must not be admitted just because its client belongs to A.
    invoices.push({ ...invoices[1], id: 'mismatched-invoice', cliente: invoices[0].cliente });
    prisma.factura.findMany.mockImplementation(async ({ where }) => invoices.filter(invoice =>
      invoice.empresaId === where.empresaId && invoice.cliente.empresaId === where.cliente?.empresaId,
    ));
    const payments = [{ empresaId: 'company-a', monto: 25 }, { empresaId: 'company-b', monto: 75 }];
    prisma.pago.findMany.mockImplementation(async ({ where }) => payments.filter(payment =>
      payment.empresaId === where.factura?.empresaId,
    ));
    const damages = [
      { empresaId: 'company-a', cobrable: true, costoEstimado: 10 },
      { empresaId: 'company-b', cobrable: true, costoEstimado: 90 },
    ];
    prisma.inspeccionDano.findMany.mockImplementation(async ({ where }) => damages.filter(damage =>
      damage.empresaId === where.detalleDevolucion?.devolucion?.sucursal?.empresaId,
    ));

    const balanceA = await service.getBalanceGeneral('company-a');
    const balanceB = await service.getBalanceGeneral('company-b');
    expect(balanceA.activos.corrientes.efectivoYBancos).toBe(25);
    expect(balanceB.activos.corrientes.efectivoYBancos).toBe(75);
    expect(balanceA.activos.corrientes.cuentasPorCobrar).toBe(100);
    expect(balanceB.activos.corrientes.cuentasPorCobrar).toBe(200);
    expect((await service.getEstadoResultados('company-a')).ingresos.totalIngresosBrutos).toBe(110);
    expect((await service.getEstadoResultados('company-b')).ingresos.totalIngresosBrutos).toBe(290);
  });
});
