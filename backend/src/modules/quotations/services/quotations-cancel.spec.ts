import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  EstadoContrato,
  EstadoCorteFacturacion,
  EstadoCotizacion,
  EstadoEquipo,
  EstadoFactura,
  EstadoReserva,
  TipoControlEquipo,
} from '@prisma/client';
import { QuotationsService } from './quotations.service';

describe('QuotationsService.cancelQuotation', () => {
  let prisma: any;
  let service: QuotationsService;

  beforeEach(() => {
    prisma = {
      $executeRaw: jest.fn().mockResolvedValue(1),
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
      cotizacion: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      equipo: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      reserva: {
        update: jest.fn(),
      },
      solicitudDespacho: {
        updateMany: jest.fn(),
      },
      corteFacturacion: {
        updateMany: jest.fn(),
      },
      contrato: {
        update: jest.fn(),
      },
      auditoria: {
        create: jest.fn(),
      },
    };

    service = new QuotationsService(prisma);
  });

  it('cancela una cotización aprobada internamente (ENVIADA) y revoca su enlace público', async () => {
    prisma.cotizacion.findFirst.mockResolvedValue({
      id: 'cot-1',
      empresaId: 'emp-1',
      numeroCotizacion: 'COT-0010',
      version: 1,
      estado: EstadoCotizacion.ENVIADA,
      asesorId: 'user-1',
      facturas: [],
      contratos: [],
    });
    prisma.cotizacion.update.mockResolvedValue({
      id: 'cot-1',
      numeroCotizacion: 'COT-0010',
      estado: EstadoCotizacion.CANCELADA,
      motivoRechazo: 'El cliente desistió de la renta',
      tokenPublicoRevocado: true,
    });

    const res = await service.cancelQuotation(
      'cot-1',
      'emp-1',
      'El cliente desistió de la renta',
      'user-1',
      { id: 'user-1', roles: ['ADMIN'] },
    );

    expect(res.success).toBe(true);
    expect(res.data.estado).toBe(EstadoCotizacion.CANCELADA);
    expect(prisma.cotizacion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cot-1' },
        data: expect.objectContaining({
          estado: EstadoCotizacion.CANCELADA,
          tokenPublicoRevocado: true,
          motivoRechazo: 'El cliente desistió de la renta',
        }),
      }),
    );
    expect(prisma.auditoria.create).toHaveBeenCalled();
  });

  it('cancela una cotización ACEPTADA, cancela su contrato sin despachos ni facturas y libera equipos reservados', async () => {
    prisma.cotizacion.findFirst.mockResolvedValue({
      id: 'cot-2',
      empresaId: 'emp-1',
      numeroCotizacion: 'COT-0011',
      version: 1,
      estado: EstadoCotizacion.ACEPTADA,
      asesorId: 'user-1',
      facturas: [],
      contratos: [
        {
          id: 'ctr-1',
          codigo: 'CTR-2026-0011',
          estado: EstadoContrato.SIN_ABRIR,
          condiciones: 'Condición de pago: CONTADO.',
          despachos: [],
          facturas: [],
          items: [{ equipoId: 'eq-serial', cantidad: 1 }],
          reservas: [
            {
              id: 'res-1',
              equipoId: 'eq-serial',
              estado: EstadoReserva.CONFIRMADA,
            },
          ],
        },
      ],
    });
    prisma.equipo.findUnique.mockResolvedValue({
      id: 'eq-serial',
      tipoControl: TipoControlEquipo.SERIALIZADO,
      cantidadTotal: 1,
      cantidadDisponible: 0,
      estado: EstadoEquipo.RESERVADO,
    });
    prisma.cotizacion.update.mockResolvedValue({
      id: 'cot-2',
      numeroCotizacion: 'COT-0011',
      estado: EstadoCotizacion.CANCELADA,
      motivoRechazo: 'Obra cancelada por el cliente',
    });

    const res = await service.cancelQuotation(
      'cot-2',
      'emp-1',
      'Obra cancelada por el cliente',
      'admin-1',
      { id: 'admin-1', roles: ['ADMIN'] },
    );

    expect(res.success).toBe(true);
    expect(res.contratosCancelados).toEqual(['CTR-2026-0011']);
    expect(prisma.equipo.update).toHaveBeenCalledWith({
      where: { id: 'eq-serial' },
      data: {
        cantidadDisponible: 1,
        estado: EstadoEquipo.DISPONIBLE,
      },
    });
    expect(prisma.reserva.update).toHaveBeenCalledWith({
      where: { id: 'res-1' },
      data: { estado: EstadoReserva.CANCELADA },
    });
    expect(prisma.corteFacturacion.updateMany).toHaveBeenCalledWith({
      where: { contratoId: 'ctr-1', estado: EstadoCorteFacturacion.PENDIENTE },
      data: { estado: EstadoCorteFacturacion.ANULADO },
    });
    expect(prisma.contrato.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ctr-1' },
        data: expect.objectContaining({ estado: EstadoContrato.CANCELADO }),
      }),
    );
  });

  it('bloquea la cancelación si el contrato asociado ya tiene despachos ejecutados', async () => {
    prisma.cotizacion.findFirst.mockResolvedValue({
      id: 'cot-3',
      empresaId: 'emp-1',
      numeroCotizacion: 'COT-0012',
      version: 1,
      estado: EstadoCotizacion.ACEPTADA,
      facturas: [],
      contratos: [
        {
          id: 'ctr-2',
          codigo: 'CTR-2026-0012',
          estado: EstadoContrato.ACTIVO,
          despachos: [{ id: 'desp-1' }],
          facturas: [],
          reservas: [],
          items: [],
        },
      ],
    });

    await expect(
      service.cancelQuotation(
        'cot-3',
        'emp-1',
        'Cliente ya no quiere el equipo',
        'admin-1',
        { id: 'admin-1', roles: ['ADMIN'] },
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.cotizacion.update).not.toHaveBeenCalled();
  });

  it('bloquea la cancelación si existen facturas activas o la cotización no ha sido aprobada', async () => {
    prisma.cotizacion.findFirst.mockResolvedValueOnce({
      id: 'cot-4',
      empresaId: 'emp-1',
      estado: EstadoCotizacion.BORRADOR,
      facturas: [],
      contratos: [],
    });

    await expect(
      service.cancelQuotation('cot-4', 'emp-1', 'Motivo válido', 'admin-1', {
        id: 'admin-1',
        roles: ['ADMIN'],
      }),
    ).rejects.toThrow(BadRequestException);

    prisma.cotizacion.findFirst.mockResolvedValueOnce({
      id: 'cot-5',
      empresaId: 'emp-1',
      estado: EstadoCotizacion.ACEPTADA,
      facturas: [{ id: 'fac-1', estado: EstadoFactura.PENDIENTE }],
      contratos: [],
    });

    await expect(
      service.cancelQuotation('cot-5', 'emp-1', 'Motivo válido', 'admin-1', {
        id: 'admin-1',
        roles: ['ADMIN'],
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('lanza NotFoundException si la cotización no pertenece a la empresa', async () => {
    prisma.cotizacion.findFirst.mockResolvedValue(null);

    await expect(
      service.cancelQuotation('cot-x', 'emp-1', 'Motivo válido', 'admin-1', {
        id: 'admin-1',
        roles: ['ADMIN'],
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
