import { EstadoLiquidacionRetorno } from '@prisma/client';
import { OperationsService } from './operations.service';

describe('OperationsService early return settlement', () => {
  const empresaId = 'empresa-1';

  function contract(overrides: Record<string, unknown> = {}) {
    return {
      id: 'ctr-1',
      estado: 'ACTIVO',
      cotizacionId: null,
      fechaInicio: new Date('2026-10-01T12:00:00Z'),
      fechaFin: new Date('2026-10-11T12:00:00Z'),
      fechaFinPactada: new Date('2026-10-11T12:00:00Z'),
      cotizacion: null,
      items: [
        {
          equipoId: 'eq-1',
          cantidad: 1,
          precioRenta: 100,
          dias: 10,
          tipoTarifa: 'DIA',
          equipo: { modelo: 'Equipo' },
        },
      ],
      despachos: [
        {
          fechaDespacho: new Date('2026-10-01T12:00:00Z'),
          items: [{ equipoId: 'eq-1', cantidad: 1 }],
        },
      ],
      devoluciones: [
        {
          id: 'dev-1',
          fechaDevolucion: new Date('2026-10-05T12:00:00Z'),
          items: [
            { equipoId: 'eq-1', cantidadRetornada: 1, cantidadPerdida: 0 },
          ],
        },
      ],
      cortesFacturacion: [{ id: 'cut-1', estado: 'PENDIENTE', monto: 1000 }],
      liquidacionRetorno: null,
      ...overrides,
    };
  }

  it('cobra 4 de 10 días, excluye el día de recepción y deja aprobación pendiente', async () => {
    const tx: any = {
      contrato: { findUnique: jest.fn().mockResolvedValue(contract()) },
      devolucion: { update: jest.fn().mockResolvedValue({}) },
      factura: { findMany: jest.fn().mockResolvedValue([{ total: 1000 }]) },
      liquidacionRetorno: {
        create: jest.fn(async ({ data }) => ({ id: 'liq-1', ...data })),
      },
    };
    const service = new OperationsService({} as any);

    const result = await (service as any).createEarlyReturnSettlementIfComplete(
      tx,
      'ctr-1',
      'dev-1',
    );

    expect(result).toEqual(
      expect.objectContaining({
        diasPactados: 10,
        diasCobrados: 4,
        diasAnticipados: 6,
        montoPactado: 1000,
        montoDevengado: 400,
        montoFacturado: 1000,
        creditoCliente: 600,
        requiereNotaCredito: true,
      }),
    );
    expect(tx.devolucion.update).toHaveBeenCalledWith({
      where: { id: 'dev-1' },
      data: { esRetornoAnticipado: true, diasAnticipados: 6 },
    });
    expect(tx.factura.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tipoFactura: { in: ['ESTANDAR', 'ANTICIPO'] },
        }),
      }),
    );
  });

  it('no liquida un retorno parcial', async () => {
    const partial = contract({
      despachos: [
        {
          fechaDespacho: new Date('2026-10-01T12:00:00Z'),
          items: [{ equipoId: 'eq-1', cantidad: 2 }],
        },
      ],
    });
    const tx: any = {
      contrato: { findUnique: jest.fn().mockResolvedValue(partial) },
      devolucion: { update: jest.fn() },
      factura: { findMany: jest.fn() },
      liquidacionRetorno: { create: jest.fn() },
    };
    const service = new OperationsService({} as any);

    await expect(
      (service as any).createEarlyReturnSettlementIfComplete(
        tx,
        'ctr-1',
        'dev-1',
      ),
    ).resolves.toBeNull();
    expect(tx.liquidacionRetorno.create).not.toHaveBeenCalled();
  });

  it('cesa el alquiler de una unidad declarada perdida en la recepción', async () => {
    const lost = contract({
      devoluciones: [
        {
          id: 'dev-1',
          fechaDevolucion: new Date('2026-10-05T12:00:00Z'),
          items: [
            { equipoId: 'eq-1', cantidadRetornada: 0, cantidadPerdida: 1 },
          ],
        },
      ],
    });
    const tx: any = {
      contrato: { findUnique: jest.fn().mockResolvedValue(lost) },
      devolucion: { update: jest.fn().mockResolvedValue({}) },
      factura: { findMany: jest.fn().mockResolvedValue([]) },
      liquidacionRetorno: { create: jest.fn(async ({ data }) => data) },
    };
    const service = new OperationsService({} as any);

    const result = await (service as any).createEarlyReturnSettlementIfComplete(
      tx,
      'ctr-1',
      'dev-1',
    );
    expect(result).toEqual(
      expect.objectContaining({ diasCobrados: 4, montoDevengado: 400 }),
    );
  });

  it('es idempotente si otra aprobación concluyó mientras esperaba el lock', async () => {
    const pending = {
      id: 'liq-1',
      contratoId: 'ctr-1',
      devolucionCierreId: 'dev-1',
      estado: EstadoLiquidacionRetorno.PENDIENTE_APROBACION,
    };
    const approved = { ...pending, estado: EstadoLiquidacionRetorno.APROBADA };
    const tx: any = {
      liquidacionRetorno: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(pending)
          .mockResolvedValueOnce(approved),
        update: jest.fn(),
      },
      contrato: { findUnique: jest.fn(), update: jest.fn() },
      corteFacturacion: { update: jest.fn() },
      reserva: { updateMany: jest.fn() },
      auditoria: { create: jest.fn() },
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    const prisma: any = {
      $transaction: (callback: (client: any) => unknown) => callback(tx),
    };
    const service = new OperationsService(prisma);

    await expect(
      service.approveReturnSettlement('dev-1', empresaId, 'user-1'),
    ).resolves.toEqual(approved);
    expect(tx.contrato.findUnique).not.toHaveBeenCalled();
    expect(tx.liquidacionRetorno.update).not.toHaveBeenCalled();
    expect(tx.auditoria.create).not.toHaveBeenCalled();
  });

  it('preserva inmutables los cortes con estado FACTURADO durante la aprobación', async () => {
    const pending = {
      id: 'liq-1',
      contratoId: 'ctr-1',
      devolucionCierreId: 'dev-1',
      estado: EstadoLiquidacionRetorno.PENDIENTE_APROBACION,
      fechaRecepcion: new Date('2026-10-05T12:00:00Z'),
      montoDevengado: 400,
      diasCobrados: 4,
    };
    const contractWithBilledCut = contract({
      cortesFacturacion: [
        {
          id: 'cut-billed-1',
          estado: 'FACTURADO',
          monto: 500,
          fechaInicio: new Date('2026-10-01'),
          fechaFin: new Date('2026-10-05'),
        },
        {
          id: 'cut-pending-2',
          estado: 'PENDIENTE',
          monto: 500,
          fechaInicio: new Date('2026-10-06'),
          fechaFin: new Date('2026-10-11'),
        },
      ],
    });
    const tx: any = {
      liquidacionRetorno: {
        findFirst: jest.fn().mockResolvedValue(pending),
        update: jest.fn().mockResolvedValue({
          ...pending,
          estado: EstadoLiquidacionRetorno.APROBADA,
        }),
      },
      contrato: {
        findUnique: jest.fn().mockResolvedValue(contractWithBilledCut),
        update: jest.fn().mockResolvedValue({}),
      },
      factura: {
        findMany: jest.fn().mockResolvedValue([{ total: 500 }]),
      },
      corteFacturacion: {
        update: jest.fn(),
      },
      reserva: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      auditoria: { create: jest.fn().mockResolvedValue({}) },
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    const prisma: any = {
      $transaction: (callback: (client: any) => unknown) => callback(tx),
    };
    const service = new OperationsService(prisma);

    await service.approveReturnSettlement('dev-1', empresaId, 'user-1');

    // El corte FACTURADO nunca se actualiza ni se anula
    expect(tx.corteFacturacion.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cut-billed-1' } }),
    );
    // El corte PENDIENTE posterior a la fecha de retorno se anula
    expect(tx.corteFacturacion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cut-pending-2' },
        data: expect.objectContaining({ estado: 'ANULADO' }),
      }),
    );
  });

  it('selectReturnCreditDestination permite seleccionar REEMBOLSO o SALDO_FAVOR tras aprobación', async () => {
    const approved = {
      id: 'liq-1',
      devolucionCierreId: 'dev-1',
      estado: EstadoLiquidacionRetorno.APROBADA,
      creditoCliente: 600,
    };
    const tx: any = {
      liquidacionRetorno: {
        findFirst: jest.fn().mockResolvedValue(approved),
        update: jest
          .fn()
          .mockResolvedValue({ ...approved, destinoCredito: 'SALDO_FAVOR' }),
      },
      auditoria: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma: any = {
      $transaction: (callback: (client: any) => unknown) => callback(tx),
    };
    const service = new OperationsService(prisma);

    const result = await service.selectReturnCreditDestination(
      'dev-1',
      'SALDO_FAVOR',
      empresaId,
      'user-1',
    );
    expect(result.destinoCredito).toBe('SALDO_FAVOR');
    expect(tx.liquidacionRetorno.update).toHaveBeenCalledWith({
      where: { id: 'liq-1' },
      data: { destinoCredito: 'SALDO_FAVOR' },
    });
  });

  it('selectReturnCreditDestination rechaza si la liquidación aún no está aprobada', async () => {
    const pending = {
      id: 'liq-1',
      devolucionCierreId: 'dev-1',
      estado: EstadoLiquidacionRetorno.PENDIENTE_APROBACION,
      creditoCliente: 600,
    };
    const tx: any = {
      liquidacionRetorno: {
        findFirst: jest.fn().mockResolvedValue(pending),
      },
    };
    const prisma: any = {
      $transaction: (callback: (client: any) => unknown) => callback(tx),
    };
    const service = new OperationsService(prisma);

    await expect(
      service.selectReturnCreditDestination('dev-1', 'REEMBOLSO', empresaId),
    ).rejects.toThrow('Primero debe aprobarse manualmente la liquidación');
  });
});
