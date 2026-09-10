import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { OperationsService } from './operations.service';

describe('OperationsService tenant isolation', () => {
  function setup() {
    const tx = {
      contrato: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'contrato-a',
          codigo: 'CTR-A',
          sucursalId: 'sucursal-a',
          cliente: {},
        }),
      },
      solicitudDespacho: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      solicitudRetorno: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      despacho: { create: jest.fn().mockResolvedValue({ id: 'despacho-a' }) },
      devolucion: { create: jest.fn() },
      equipo: { findFirst: jest.fn(), update: jest.fn() },
      lecturaHorometro: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    return {
      tx,
      service: new OperationsService(prisma as unknown as PrismaService),
    };
  }

  it('rechaza una solicitud de despacho ajena antes de crear el despacho', async () => {
    const { service, tx } = setup();

    await expect(
      service.createDespacho(
        {
          contratoId: 'contrato-a',
          solicitudDespachoId: 'solicitud-b',
          items: [],
        } as any,
        'empresa-a',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(tx.solicitudDespacho.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'solicitud-b',
        empresaId: 'empresa-a',
        contratoId: 'contrato-a',
      },
      select: { id: true },
    });
    expect(tx.despacho.create).not.toHaveBeenCalled();
  });

  it('rechaza una solicitud de retorno ajena antes de crear la devolución', async () => {
    const { service, tx } = setup();

    await expect(
      service.createRetorno(
        {
          contratoId: 'contrato-a',
          solicitudRetornoId: 'solicitud-b',
          items: [],
        } as any,
        'empresa-a',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(tx.solicitudRetorno.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'solicitud-b',
        empresaId: 'empresa-a',
        contratoId: 'contrato-a',
      },
      select: { id: true },
    });
    expect(tx.devolucion.create).not.toHaveBeenCalled();
  });

  it('rechaza equipo que no pertenece a la empresa y al contrato del despacho', async () => {
    const { service, tx } = setup();

    await expect(service.createDespacho({
      contratoId: 'contrato-a',
      items: [{ equipoId: 'equipo-b' }],
    } as any, 'empresa-a')).rejects.toThrow(BadRequestException);

    expect(tx.equipo.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'equipo-b',
        empresaId: 'empresa-a',
        detallesContrato: { some: { contratoId: 'contrato-a' } },
      },
    });
  });
});
