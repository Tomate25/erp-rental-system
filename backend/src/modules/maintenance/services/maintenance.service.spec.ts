import { NotFoundException } from '@nestjs/common';
import {
  EstadoEquipo,
  EstadoMantenimiento,
  TipoMantenimiento,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMaintenanceDto } from '../dto/create-maintenance.dto';
import { MaintenanceService } from './maintenance.service';

describe('MaintenanceService', () => {
  const empresaId = 'empresa-id';
  const equipoId = 'equipo-id';
  const mantenimientoId = 'mantenimiento-id';

  let service: MaintenanceService;
  let prisma: {
    mantenimiento: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    equipo: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    auditoria: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  const createDto: CreateMaintenanceDto = {
    equipoId,
    tipo: TipoMantenimiento.PREVENTIVO,
    estado: EstadoMantenimiento.EN_PROCESO,
    fechaProgramacion: '2026-09-10',
    descripcion: 'Cambio de aceite y filtros',
    costo: 250,
  };

  beforeEach(() => {
    prisma = {
      mantenimiento: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      equipo: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      auditoria: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
    );
    service = new MaintenanceService(prisma as unknown as PrismaService);
  });

  it('creates maintenance for equipment in the company and marks it as under maintenance', async () => {
    const equipo = { id: equipoId, empresaId, horometro: 125 };
    const mantenimiento = {
      id: mantenimientoId,
      equipoId,
      estado: EstadoMantenimiento.EN_PROCESO,
    };
    prisma.equipo.findFirst.mockResolvedValue(equipo);
    prisma.mantenimiento.create.mockResolvedValue(mantenimiento);

    await expect(service.create(createDto, empresaId)).resolves.toBe(
      mantenimiento,
    );

    expect(prisma.equipo.findFirst).toHaveBeenCalledWith({
      where: { id: equipoId, empresaId },
    });
    expect(prisma.mantenimiento.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          equipoId,
          estado: EstadoMantenimiento.EN_PROCESO,
          horometroServicio: 125,
        }),
      }),
    );
    expect(prisma.equipo.update).toHaveBeenCalledWith({
      where: { id: equipoId },
      data: { estado: EstadoEquipo.EN_MANTENIMIENTO },
    });
  });

  it('rejects creation when equipment does not exist or belongs to another company', async () => {
    prisma.equipo.findFirst.mockResolvedValue(null);

    await expect(service.create(createDto, empresaId)).rejects.toThrow(
      NotFoundException,
    );

    expect(prisma.equipo.findFirst).toHaveBeenCalledWith({
      where: { id: equipoId, empresaId },
    });
    expect(prisma.mantenimiento.create).not.toHaveBeenCalled();
    expect(prisma.equipo.update).not.toHaveBeenCalled();
  });

  it('marks equipment as available and stores its service hour meter when created completed', async () => {
    const dto = {
      ...createDto,
      estado: EstadoMantenimiento.COMPLETADO,
      horometroServicio: 180,
    };
    prisma.equipo.findFirst.mockResolvedValue({
      id: equipoId,
      empresaId,
      horometro: 175,
    });
    prisma.mantenimiento.create.mockResolvedValue({ id: mantenimientoId });

    await service.create(dto, empresaId);

    expect(prisma.equipo.update).toHaveBeenCalledWith({
      where: { id: equipoId },
      data: {
        estado: EstadoEquipo.DISPONIBLE,
        horometroUltimoServicio: 180,
      },
    });
  });

  it('marks equipment as under maintenance when an update starts the work', async () => {
    prisma.mantenimiento.findFirst.mockResolvedValue({
      id: mantenimientoId,
      equipoId,
      estado: EstadoMantenimiento.PROGRAMADO,
    });
    prisma.mantenimiento.update.mockResolvedValue({
      id: mantenimientoId,
      equipoId,
      estado: EstadoMantenimiento.EN_PROCESO,
    });

    await service.update(
      mantenimientoId,
      { estado: EstadoMantenimiento.EN_PROCESO },
      empresaId,
    );

    expect(prisma.equipo.update).toHaveBeenCalledWith({
      where: { id: equipoId },
      data: { estado: EstadoEquipo.EN_MANTENIMIENTO },
    });
  });

  it('marks equipment as available and stores the service hour meter on completion', async () => {
    prisma.mantenimiento.findFirst.mockResolvedValue({
      id: mantenimientoId,
      equipoId,
      estado: EstadoMantenimiento.EN_PROCESO,
    });
    prisma.mantenimiento.update.mockResolvedValue({
      id: mantenimientoId,
      equipoId,
      estado: EstadoMantenimiento.COMPLETADO,
      horometroServicio: 240,
    });

    await service.update(
      mantenimientoId,
      {
        estado: EstadoMantenimiento.COMPLETADO,
        horometroServicio: 240,
      },
      empresaId,
    );

    expect(prisma.equipo.update).toHaveBeenCalledWith({
      where: { id: equipoId },
      data: {
        estado: EstadoEquipo.DISPONIBLE,
        horometroUltimoServicio: 240,
      },
    });
  });

  it('returns equipment to available when in-progress maintenance is cancelled', async () => {
    prisma.mantenimiento.findFirst.mockResolvedValue({
      id: mantenimientoId,
      equipoId,
      estado: EstadoMantenimiento.EN_PROCESO,
    });
    prisma.mantenimiento.update.mockResolvedValue({
      id: mantenimientoId,
      equipoId,
      estado: EstadoMantenimiento.CANCELADO,
    });

    await service.update(
      mantenimientoId,
      { estado: EstadoMantenimiento.CANCELADO },
      empresaId,
    );

    expect(prisma.equipo.update).toHaveBeenCalledWith({
      where: { id: equipoId },
      data: { estado: EstadoEquipo.DISPONIBLE },
    });
  });

  it('findAll applies the strict company relationship filter', async () => {
    const records = [{ id: mantenimientoId }];
    prisma.mantenimiento.findMany.mockResolvedValue(records);

    await expect(service.findAll(empresaId)).resolves.toBe(records);

    expect(prisma.mantenimiento.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { equipo: { empresaId } } }),
    );
  });

  it('findOne applies the strict company relationship filter', async () => {
    const record = { id: mantenimientoId, equipoId };
    prisma.mantenimiento.findFirst.mockResolvedValue(record);

    await expect(service.findOne(mantenimientoId, empresaId)).resolves.toBe(
      record,
    );

    expect(prisma.mantenimiento.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mantenimientoId, equipo: { empresaId } },
      }),
    );
  });

  it('calcula el costo real de reparación desde gastos desglosados', async () => {
    prisma.mantenimiento.findFirst.mockResolvedValue({
      id: mantenimientoId, equipoId, estado: EstadoMantenimiento.EN_PROCESO,
      detalleDevolucionId: 'detail-1', detalleDevolucion: { devolucion: { facturaCargo: null } },
      equipo: { tipoControl: 'SERIALIZADO', cantidadTotal: 1, cantidadDisponible: 0 },
    });
    prisma.mantenimiento.update.mockResolvedValue({ id: mantenimientoId, estado: EstadoMantenimiento.COMPLETADO, horometroServicio: 100 });

    await service.update(mantenimientoId, {
      estado: EstadoMantenimiento.COMPLETADO,
      gastos: [
        { tipo: 'REPUESTO', descripcion: 'Rodamiento', monto: 200.25 },
        { tipo: 'MANO_OBRA', descripcion: 'Instalación', monto: 50.75 },
      ],
    }, empresaId);

    expect(prisma.mantenimiento.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ costo: 251, gastos: expect.arrayContaining([expect.objectContaining({ monto: 200.25 })]) }),
    }));
    expect(prisma.equipo.update).toHaveBeenCalledWith({
      where: { id: equipoId },
      data: { estado: EstadoEquipo.DISPONIBLE, cantidadDisponible: 1, horometroUltimoServicio: 100 },
    });
  });

  it('congela la reparación después de emitir su factura', async () => {
    prisma.mantenimiento.findFirst.mockResolvedValue({
      id: mantenimientoId, equipoId, detalleDevolucionId: 'detail-1',
      detalleDevolucion: { devolucion: { facturaCargo: { id: 'fac-1' } } },
    });
    await expect(service.update(mantenimientoId, { costo: 500 }, empresaId)).rejects.toThrow(/ya fue facturada/);
    expect(prisma.mantenimiento.update).not.toHaveBeenCalled();
  });

  it('findOne rejects maintenance from another company', async () => {
    prisma.mantenimiento.findFirst.mockResolvedValue(null);

    await expect(service.findOne(mantenimientoId, empresaId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('remove rejects maintenance from another company without deleting it', async () => {
    prisma.mantenimiento.findFirst.mockResolvedValue(null);

    await expect(service.remove(mantenimientoId, empresaId)).rejects.toThrow(
      NotFoundException,
    );

    expect(prisma.mantenimiento.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mantenimientoId, equipo: { empresaId } },
      }),
    );
    expect(prisma.mantenimiento.delete).not.toHaveBeenCalled();
  });
});
