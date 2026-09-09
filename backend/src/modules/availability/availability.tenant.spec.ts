import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';

describe('Availability tenant isolation', () => {
  const start = '2026-09-01T00:00:00.000Z';
  const end = '2026-09-30T00:00:00.000Z';

  function setup() {
    const prisma = {
      reserva: { findMany: jest.fn().mockResolvedValue([]) },
      contrato: { findMany: jest.fn().mockResolvedValue([]) },
      despacho: { findMany: jest.fn().mockResolvedValue([]) },
    };
    return { prisma, service: new AvailabilityService(prisma as unknown as PrismaService) };
  }

  it.each(['company-a', 'company-b'])('scopes all calendar sources and nested equipment to %s', async empresaId => {
    const { prisma, service } = setup();
    await service.getReservations(start, end, empresaId);

    expect(prisma.reserva.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        equipo: { empresaId },
        contrato: { sucursal: { empresaId }, cliente: { empresaId } },
        AND: [{ fechaInicio: { lte: new Date(end) } }, { fechaFin: { gte: new Date(start) } }],
      },
    }));
    expect(prisma.contrato.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        sucursal: { empresaId }, cliente: { empresaId },
        AND: [{ fechaInicio: { lte: new Date(end) } }, { fechaFin: { gte: new Date(start) } }],
      },
      include: expect.objectContaining({ items: expect.objectContaining({ where: { equipo: { empresaId } } }) }),
    }));
    expect(prisma.despacho.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { sucursal: { empresaId }, contrato: { sucursal: { empresaId }, cliente: { empresaId } } },
      include: expect.objectContaining({ items: expect.objectContaining({ where: { equipo: { empresaId } } }) }),
    }));
  });

  it.each([undefined, null, '', '   '])('rejects missing tenant %s before querying the database', async empresaId => {
    const { prisma, service } = setup();
    await expect(service.getReservations(start, end, empresaId as unknown as string)).rejects.toThrow(ForbiddenException);
    for (const delegate of Object.values(prisma)) expect(delegate.findMany).not.toHaveBeenCalled();
  });

  it('passes the authenticated tenant from the controller to the service', async () => {
    const getReservations = jest.fn().mockResolvedValue([{ id: 'reservation-a' }]);
    const controller = new AvailabilityController({ getReservations } as unknown as AvailabilityService);
    await expect(controller.getReservations(start, end, 'company-a')).resolves.toEqual({
      success: true, data: [{ id: 'reservation-a' }],
    });
    expect(getReservations).toHaveBeenCalledWith(start, end, 'company-a');
  });
});
