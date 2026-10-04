import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { calcularBalanceRetorno } from '../utils/return-balance';

describe('calcularBalanceRetorno', () => {
  it('cuenta unidades perdidas como fuera de alquiler', () => {
    const b = calcularBalanceRetorno(
      [{ items: [{ cantidad: 3 }] }],
      [{ items: [{ cantidadRetornada: 2, cantidadPerdida: 1 }] }],
    );
    expect(b).toEqual({ totalDespachado: 3, totalRetornado: 3, pendiente: 0 });
  });

  it('reporta pendiente cuando faltan unidades y tolera datos vacíos', () => {
    expect(
      calcularBalanceRetorno([{ items: [{ cantidad: 5 }] }], [{ items: [{ cantidadRetornada: 2 }] }]).pendiente,
    ).toBe(3);
    expect(calcularBalanceRetorno(null, undefined).pendiente).toBe(0);
  });
});

describe('ContractsService.finalizeContract', () => {
  let tx: any;
  let prisma: any;
  let service: ContractsService;

  const contrato = (over: any = {}) => ({
    id: 'ctr-1',
    codigo: 'CTR-2026-0001',
    estado: 'ACTIVO',
    despachos: [{ items: [{ cantidad: 3 }] }],
    devoluciones: [{ items: [{ cantidadRetornada: 2, cantidadPerdida: 1 }] }],
    ...over,
  });

  beforeEach(() => {
    tx = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      contrato: {
        findFirst: jest.fn().mockResolvedValue(contrato()),
        update: jest.fn().mockResolvedValue({ id: 'ctr-1', estado: 'FINALIZADO' }),
      },
      reserva: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      auditoria: { create: jest.fn().mockResolvedValue({}) },
    };
    prisma = { $transaction: jest.fn(async (cb: any) => cb(tx)), contrato: { findFirst: jest.fn() } };
    service = new ContractsService(prisma);
  });

  it('finaliza cuando lo despachado = retornado + perdido', async () => {
    const res = await service.finalizeContract('ctr-1', 'empresa-a', 'user-1');
    expect(res.estado).toBe('FINALIZADO');
    expect(tx.reserva.updateMany).toHaveBeenCalled();
  });

  it('valida DENTRO de la transacción, con bloqueo de fila y filtro de tenant', async () => {
    await service.finalizeContract('ctr-1', 'empresa-a', 'user-1');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(prisma.contrato.findFirst).not.toHaveBeenCalled();
    expect(tx.contrato.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'ctr-1', sucursal: { empresaId: 'empresa-a' } } }),
    );
  });

  it('rechaza si quedan unidades pendientes y no modifica nada', async () => {
    tx.contrato.findFirst.mockResolvedValue(
      contrato({ devoluciones: [{ items: [{ cantidadRetornada: 1, cantidadPerdida: 1 }] }] }),
    );
    await expect(service.finalizeContract('ctr-1', 'empresa-a')).rejects.toThrow(BadRequestException);
    expect(tx.contrato.update).not.toHaveBeenCalled();
    expect(tx.reserva.updateMany).not.toHaveBeenCalled();
  });

  it('rechaza contratos no ACTIVOS (incluida una segunda finalización concurrente)', async () => {
    tx.contrato.findFirst.mockResolvedValue(contrato({ estado: 'FINALIZADO' }));
    await expect(service.finalizeContract('ctr-1', 'empresa-a')).rejects.toThrow(/ACTIVO/);
    expect(tx.contrato.update).not.toHaveBeenCalled();
  });

  it('contrato de otra empresa => NotFound', async () => {
    tx.contrato.findFirst.mockResolvedValue(null);
    await expect(service.finalizeContract('ctr-1', 'empresa-b')).rejects.toThrow(NotFoundException);
  });
});