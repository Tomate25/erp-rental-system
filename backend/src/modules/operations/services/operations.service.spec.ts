import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  EstadoEquipo,
  EstadoSolicitudOperativa,
  OrigenLecturaHorometro,
  SeveridadDano,
  TipoControlEquipo,
  TipoMantenimiento,
  EstadoMantenimiento,
} from '@prisma/client';
import { OperationsService } from './operations.service';
import {
  CreateDespachoDto,
  CreateRetornoDto,
  CreateSolicitudDespachoDto,
  CreateSolicitudRetornoDto,
  UpdateEstadoSolicitudDto,
} from '../dto/create-operations.dto';

describe('OperationsService', () => {
  const empresaId = 'empresa-test-id';

  function createMockPrisma() {
    const mockTx = {
      contrato: {
        findFirst: jest.fn(),
      },
      solicitudDespacho: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      solicitudRetorno: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      equipo: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      detalleDespacho: {
        findMany: jest.fn(),
      },
      detalleDevolucion: {
        findMany: jest.fn(),
      },
      despacho: {
        create: jest.fn(),
      },
      devolucion: {
        create: jest.fn(),
      },
      lecturaHorometro: {
        create: jest.fn(),
      },
      mantenimiento: { create: jest.fn() },
      detalleContrato: { update: jest.fn() },
      reserva: { updateMany: jest.fn() },
      auditoria: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
      $executeRaw: jest.fn().mockResolvedValue(1),
    };

    const mockPrisma: any = {
      contrato: {
        findFirst: jest.fn(),
      },
      equipo: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      solicitudDespacho: {
        count: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      solicitudRetorno: {
        count: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      despacho: {
        findMany: jest.fn(),
      },
      devolucion: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn(
        async (callback: (tx: typeof mockTx) => Promise<unknown>) =>
          callback({
            ...mockTx,
            solicitudDespacho: {
              ...mockPrisma.solicitudDespacho,
              ...mockTx.solicitudDespacho,
            },
            solicitudRetorno: {
              ...mockPrisma.solicitudRetorno,
              ...mockTx.solicitudRetorno,
            },
            auditoria: mockTx.auditoria,
          }),
      ),
    };

    return { mockPrisma, mockTx };
  }

  describe('Solicitudes de Despacho', () => {
    it('createSolicitudDespacho - lanza NotFoundException si no encuentra el contrato', async () => {
      const { mockPrisma } = createMockPrisma();
      mockPrisma.contrato.findFirst.mockResolvedValue(null);
      const service = new OperationsService(mockPrisma);

      const dto: CreateSolicitudDespachoDto = {
        contratoId: 'non-existent',
        solicitadoPor: 'Juan Perez',
        fechaProgramada: new Date().toISOString(),
      };

      await expect(
        service.createSolicitudDespacho(dto, empresaId),
      ).rejects.toThrow(NotFoundException);
    });

    it('createSolicitudDespacho - crea la solicitud con dirección explícita', async () => {
      const { mockPrisma } = createMockPrisma();
      mockPrisma.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        sucursalId: 'suc-1',
        cliente: { direccion: 'Dirección Cliente' },
      });
      mockPrisma.solicitudDespacho.count.mockResolvedValue(4);
      mockPrisma.solicitudDespacho.create.mockResolvedValue({
        id: 'sol-1',
        codigo: 'SOL-DESP-0005',
      });
      const service = new OperationsService(mockPrisma);

      const dto: CreateSolicitudDespachoDto = {
        contratoId: 'ctr-1',
        solicitadoPor: 'Juan Perez',
        fechaProgramada: '2026-10-01T10:00:00.000Z',
        direccionEntrega: 'Obra Central',
        comentarios: 'Urgente',
      };

      const result = await service.createSolicitudDespacho(dto, empresaId);

      expect(mockPrisma.solicitudDespacho.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            codigo: 'SOL-DESP-0005',
            empresaId,
            sucursalId: 'suc-1',
            contratoId: 'ctr-1',
            direccionEntrega: 'Obra Central',
            estado: EstadoSolicitudOperativa.PENDIENTE,
          }),
        }),
      );
      expect(result).toEqual({ id: 'sol-1', codigo: 'SOL-DESP-0005' });
    });

    it('createSolicitudDespacho - usa la dirección del cliente si no se envía direccionEntrega', async () => {
      const { mockPrisma } = createMockPrisma();
      mockPrisma.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        sucursalId: 'suc-1',
        cliente: { direccion: 'Dirección Cliente Registrada' },
      });
      mockPrisma.solicitudDespacho.count.mockResolvedValue(0);
      mockPrisma.solicitudDespacho.create.mockResolvedValue({ id: 'sol-1' });
      const service = new OperationsService(mockPrisma);

      await service.createSolicitudDespacho(
        {
          contratoId: 'ctr-1',
          solicitadoPor: 'Juan Perez',
          fechaProgramada: '2026-10-01T10:00:00.000Z',
        },
        empresaId,
      );

      expect(mockPrisma.solicitudDespacho.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            direccionEntrega: 'Dirección Cliente Registrada',
          }),
        }),
      );
    });

    it('findAllSolicitudesDespacho - consulta con y sin filtro de estado', async () => {
      const { mockPrisma } = createMockPrisma();
      mockPrisma.solicitudDespacho.findMany.mockResolvedValue([
        { id: 'sol-1' },
      ]);
      const service = new OperationsService(mockPrisma);

      const all = await service.findAllSolicitudesDespacho(empresaId);
      expect(mockPrisma.solicitudDespacho.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { empresaId } }),
      );
      expect(all).toHaveLength(1);

      await service.findAllSolicitudesDespacho(
        empresaId,
        EstadoSolicitudOperativa.PENDIENTE,
      );
      expect(mockPrisma.solicitudDespacho.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { empresaId, estado: EstadoSolicitudOperativa.PENDIENTE },
        }),
      );
    });

    it('scheduleSolicitudDespacho - guarda la nueva fecha solo para una solicitud pendiente de la empresa', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockPrisma.solicitudDespacho.findFirst.mockResolvedValue({
        id: 'sol-1',
        contratoId: 'ctr-1',
        estado: EstadoSolicitudOperativa.PENDIENTE,
        fechaProgramada: new Date('2026-09-25T18:00:00.000Z'),
      });
      mockTx.solicitudDespacho.update.mockResolvedValue({ id: 'sol-1' });
      const service = new OperationsService(mockPrisma);

      await service.scheduleSolicitudDespacho(
        'sol-1',
        { fechaProgramada: '2026-09-26T18:00:00.000Z' },
        empresaId,
      );

      expect(mockPrisma.solicitudDespacho.findFirst).toHaveBeenCalledWith({
        where: { id: 'sol-1', empresaId },
      });
      expect(mockTx.solicitudDespacho.update).toHaveBeenCalledWith({
        where: { id: 'sol-1' },
        data: { fechaProgramada: new Date('2026-09-26T18:00:00.000Z') },
      });
    });

    it('scheduleSolicitudDespacho - rechaza solicitudes completadas', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockPrisma.solicitudDespacho.findFirst.mockResolvedValue({
        id: 'sol-1',
        estado: EstadoSolicitudOperativa.COMPLETADA,
      });
      const service = new OperationsService(mockPrisma);

      await expect(
        service.scheduleSolicitudDespacho(
          'sol-1',
          { fechaProgramada: '2026-09-26T18:00:00.000Z' },
          empresaId,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockTx.solicitudDespacho.update).not.toHaveBeenCalled();
    });

    it('updateEstadoSolicitudDespacho - lanza NotFoundException si no existe', async () => {
      const { mockPrisma } = createMockPrisma();
      mockPrisma.solicitudDespacho.findFirst.mockResolvedValue(null);
      const service = new OperationsService(mockPrisma);

      await expect(
        service.updateEstadoSolicitudDespacho(
          'sol-999',
          { estado: EstadoSolicitudOperativa.COMPLETADA },
          empresaId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('updateEstadoSolicitudDespacho - actualiza estado y comentarios', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockPrisma.solicitudDespacho.findFirst.mockResolvedValue({
        id: 'sol-1',
        comentarios: 'Antiguos comentarios',
      });
      mockTx.solicitudDespacho.update.mockResolvedValue({
        id: 'sol-1',
        estado: EstadoSolicitudOperativa.CANCELADA,
      });
      const service = new OperationsService(mockPrisma);

      const dto: UpdateEstadoSolicitudDto = {
        estado: EstadoSolicitudOperativa.CANCELADA,
        comentarios: 'Cancelado por cliente',
      };
      const result = await service.updateEstadoSolicitudDespacho(
        'sol-1',
        dto,
        empresaId,
      );

      expect(mockTx.solicitudDespacho.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sol-1' },
          data: {
            estado: EstadoSolicitudOperativa.CANCELADA,
            comentarios: 'Cancelado por cliente',
          },
        }),
      );
      expect(result).toEqual({
        id: 'sol-1',
        estado: EstadoSolicitudOperativa.CANCELADA,
      });
    });
  });

  describe('Solicitudes de Retorno', () => {
    it('createSolicitudRetorno - lanza NotFoundException si contrato no existe', async () => {
      const { mockPrisma } = createMockPrisma();
      mockPrisma.contrato.findFirst.mockResolvedValue(null);
      const service = new OperationsService(mockPrisma);

      const dto: CreateSolicitudRetornoDto = {
        contratoId: 'non-existent',
        solicitadoPor: 'Carlos Lopez',
        fechaProgramada: new Date().toISOString(),
      };

      await expect(
        service.createSolicitudRetorno(dto, empresaId),
      ).rejects.toThrow(NotFoundException);
    });

    it('createSolicitudRetorno - crea solicitud exitosamente con lugarRecoleccion explícito', async () => {
      const { mockPrisma } = createMockPrisma();
      mockPrisma.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        sucursalId: 'suc-1',
        cliente: { direccion: 'Dir Cliente' },
      });
      mockPrisma.solicitudRetorno.count.mockResolvedValue(2);
      mockPrisma.solicitudRetorno.create.mockResolvedValue({
        id: 'ret-1',
        codigo: 'SOL-RET-0003',
      });
      const service = new OperationsService(mockPrisma);

      const dto: CreateSolicitudRetornoDto = {
        contratoId: 'ctr-1',
        solicitadoPor: 'Carlos Lopez',
        fechaProgramada: '2026-10-02T10:00:00.000Z',
        lugarRecoleccion: 'Patio Sur',
      };

      const result = await service.createSolicitudRetorno(dto, empresaId);
      expect(mockPrisma.solicitudRetorno.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            codigo: 'SOL-RET-0003',
            lugarRecoleccion: 'Patio Sur',
            estado: EstadoSolicitudOperativa.PENDIENTE,
          }),
        }),
      );
      expect(result).toEqual({ id: 'ret-1', codigo: 'SOL-RET-0003' });
    });

    it('createSolicitudRetorno - usa dirección cliente si lugarRecoleccion está vacío', async () => {
      const { mockPrisma } = createMockPrisma();
      mockPrisma.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        sucursalId: 'suc-1',
        cliente: { direccion: 'Dir Cliente Principal' },
      });
      mockPrisma.solicitudRetorno.count.mockResolvedValue(0);
      mockPrisma.solicitudRetorno.create.mockResolvedValue({ id: 'ret-1' });
      const service = new OperationsService(mockPrisma);

      await service.createSolicitudRetorno(
        {
          contratoId: 'ctr-1',
          solicitadoPor: 'Carlos',
          fechaProgramada: '2026-10-02T10:00:00.000Z',
        },
        empresaId,
      );

      expect(mockPrisma.solicitudRetorno.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lugarRecoleccion: 'Dir Cliente Principal',
          }),
        }),
      );
    });

    it('findAllSolicitudesRetorno - consulta con y sin filtro de estado', async () => {
      const { mockPrisma } = createMockPrisma();
      mockPrisma.solicitudRetorno.findMany.mockResolvedValue([{ id: 'ret-1' }]);
      const service = new OperationsService(mockPrisma);

      await service.findAllSolicitudesRetorno(empresaId);
      expect(mockPrisma.solicitudRetorno.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { empresaId } }),
      );

      await service.findAllSolicitudesRetorno(
        empresaId,
        EstadoSolicitudOperativa.COMPLETADA,
      );
      expect(mockPrisma.solicitudRetorno.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { empresaId, estado: EstadoSolicitudOperativa.COMPLETADA },
        }),
      );
    });

    it('updateEstadoSolicitudRetorno - lanza NotFoundException si no existe', async () => {
      const { mockPrisma } = createMockPrisma();
      mockPrisma.solicitudRetorno.findFirst.mockResolvedValue(null);
      const service = new OperationsService(mockPrisma);

      await expect(
        service.updateEstadoSolicitudRetorno(
          'ret-999',
          { estado: EstadoSolicitudOperativa.COMPLETADA },
          empresaId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('updateEstadoSolicitudRetorno - actualiza estado exitosamente', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockPrisma.solicitudRetorno.findFirst.mockResolvedValue({
        id: 'ret-1',
        comentarios: 'Previos comentarios',
      });
      mockTx.solicitudRetorno.update.mockResolvedValue({ id: 'ret-1' });
      const service = new OperationsService(mockPrisma);

      await service.updateEstadoSolicitudRetorno(
        'ret-1',
        { estado: EstadoSolicitudOperativa.COMPLETADA },
        empresaId,
      );

      expect(mockTx.solicitudRetorno.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ret-1' },
          data: {
            estado: EstadoSolicitudOperativa.COMPLETADA,
            comentarios: 'Previos comentarios',
          },
        }),
      );
    });
  });

  describe('createDespacho', () => {
    it('lanza NotFoundException si el contrato no existe para la empresa', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue(null);
      const service = new OperationsService(mockPrisma);

      const dto: CreateDespachoDto = {
        contratoId: 'ctr-404',
        items: [],
      };

      await expect(service.createDespacho(dto, empresaId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza BadRequestException si el contrato no está en estado ACTIVO', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        estado: 'BORRADOR',
        sucursal: { empresaId },
      });
      const service = new OperationsService(mockPrisma);

      const dto: CreateDespachoDto = {
        contratoId: 'ctr-1',
        items: [],
      };

      await expect(service.createDespacho(dto, empresaId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si la solicitudDespachoId no pertenece a la empresa o contrato', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        estado: 'ACTIVO',
        sucursal: { empresaId },
      });
      mockTx.solicitudDespacho.findFirst.mockResolvedValue(null);
      const service = new OperationsService(mockPrisma);

      const dto: CreateDespachoDto = {
        contratoId: 'ctr-1',
        solicitudDespachoId: 'sol-ajena',
        items: [],
      };

      await expect(service.createDespacho(dto, empresaId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si el equipo no pertenece al contrato o empresa', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        estado: 'ACTIVO',
        sucursal: { empresaId },
      });
      mockTx.equipo.findFirst.mockResolvedValue(null);
      const service = new OperationsService(mockPrisma);

      const dto: CreateDespachoDto = {
        contratoId: 'ctr-1',
        items: [{ equipoId: 'eq-ajeno', cantidad: 1 }],
      };

      await expect(service.createDespacho(dto, empresaId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si la cantidad no es un entero mayor a cero', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        estado: 'ACTIVO',
        sucursal: { empresaId },
      });
      mockTx.equipo.findFirst.mockResolvedValue({
        id: 'eq-1',
        modelo: 'GEN-500',
        tipoControl: TipoControlEquipo.POR_CANTIDAD,
      });
      const service = new OperationsService(mockPrisma);

      const dto: CreateDespachoDto = {
        contratoId: 'ctr-1',
        items: [{ equipoId: 'eq-1', cantidad: 0 }],
      };

      await expect(service.createDespacho(dto, empresaId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException por sobredespacho si supera la cantidad contratada', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        estado: 'ACTIVO',
        sucursal: { empresaId },
        items: [{ equipoId: 'eq-1', cantidad: 5 }],
      });
      mockTx.equipo.findFirst.mockResolvedValue({
        id: 'eq-1',
        modelo: 'GEN-500',
        tipoControl: TipoControlEquipo.POR_CANTIDAD,
      });
      mockTx.detalleDespacho.findMany.mockResolvedValue([
        { cantidad: 3 },
        { cantidad: 1 },
      ]);
      const service = new OperationsService(mockPrisma);

      const dto: CreateDespachoDto = {
        contratoId: 'ctr-1',
        items: [{ equipoId: 'eq-1', cantidad: 2 }], // 4 previos + 2 = 6 > 5
      };

      await expect(service.createDespacho(dto, empresaId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si se intenta despachar un equipo serializado con cantidad !== 1', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        estado: 'ACTIVO',
        sucursal: { empresaId },
        items: [{ equipoId: 'eq-serial', cantidad: 2 }],
      });
      mockTx.equipo.findFirst.mockResolvedValue({
        id: 'eq-serial',
        modelo: 'CAT-320',
        tipoControl: TipoControlEquipo.SERIALIZADO,
      });
      mockTx.detalleDespacho.findMany.mockResolvedValue([]);
      const service = new OperationsService(mockPrisma);

      const dto: CreateDespachoDto = {
        contratoId: 'ctr-1',
        items: [{ equipoId: 'eq-serial', cantidad: 2 }],
      };

      await expect(service.createDespacho(dto, empresaId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException por doble despacho de equipo serializado', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        estado: 'ACTIVO',
        sucursal: { empresaId },
        items: [{ equipoId: 'eq-serial', cantidad: 1 }],
      });
      mockTx.equipo.findFirst.mockResolvedValue({
        id: 'eq-serial',
        modelo: 'CAT-320',
        tipoControl: TipoControlEquipo.SERIALIZADO,
      });
      mockTx.detalleDespacho.findMany.mockResolvedValue([{ cantidad: 1 }]);
      const service = new OperationsService(mockPrisma);

      const dto: CreateDespachoDto = {
        contratoId: 'ctr-1',
        items: [{ equipoId: 'eq-serial', cantidad: 1 }],
      };

      await expect(service.createDespacho(dto, empresaId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('mueve el calendario de renta diaria al día del primer despacho físico', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-27T16:00:00Z'));
      try {
        const { mockPrisma, mockTx } = createMockPrisma();
        mockTx.contrato.findFirst.mockResolvedValue({
          id: 'ctr-1',
          codigo: 'CTR-1',
          sucursalId: 'suc-1',
          estado: 'ACTIVO',
          fechaInicio: new Date('2026-09-25T12:00:00Z'),
          fechaFin: new Date('2026-11-15T12:00:00Z'),
          items: [{ equipoId: 'eq-1', cantidad: 1, tipoTarifa: 'DIA' }],
        });
        mockTx.equipo.findFirst.mockResolvedValue({
          id: 'eq-1',
          empresaId,
          modelo: 'EQ',
          tipoControl: TipoControlEquipo.SERIALIZADO,
          horometro: 0,
        });
        mockTx.detalleDespacho.findMany.mockResolvedValue([]);
        (mockTx.despacho as any).count = jest.fn().mockResolvedValue(0);
        mockTx.despacho.create.mockResolvedValue({
          id: 'dispatch-1',
          contratoId: 'ctr-1',
        });
        (mockTx as any).corteFacturacion = {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'cut-1',
              estado: 'PENDIENTE',
              fechaInicio: new Date('2026-09-25T12:00:00Z'),
              fechaFin: new Date('2026-10-17T12:00:00Z'),
            },
          ]),
          update: jest.fn(),
        };
        (mockTx.contrato as any).update = jest.fn();
        (mockTx as any).reserva = { updateMany: jest.fn() };
        const service = new OperationsService(mockPrisma);

        await service.createDespacho(
          { contratoId: 'ctr-1', items: [{ equipoId: 'eq-1', cantidad: 1 }] },
          empresaId,
        );

        expect((mockTx.contrato as any).update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              fechaInicio: new Date('2026-09-27T12:00:00Z'),
              fechaFin: new Date('2026-11-17T12:00:00Z'),
            }),
          }),
        );
        expect((mockTx as any).corteFacturacion.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: {
              fechaInicio: new Date('2026-09-27T12:00:00Z'),
              fechaFin: new Date('2026-10-19T12:00:00Z'),
            },
          }),
        );
      } finally {
        jest.useRealTimers();
      }
    });

    it('crea despacho exitoso, actualiza equipo a DESPACHADO, crea inspeccion y horometro', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        codigo: 'CTR-2026-001',
        sucursalId: 'suc-1',
        estado: 'ACTIVO',
        sucursal: { empresaId },
        items: [{ equipoId: 'eq-serial', cantidad: 1 }],
      });
      mockTx.solicitudDespacho.findFirst.mockResolvedValue({ id: 'sol-1' });
      mockTx.equipo.findFirst.mockResolvedValue({
        id: 'eq-serial',
        modelo: 'CAT-320',
        tipoControl: TipoControlEquipo.SERIALIZADO,
        horometro: 100.0,
      });
      mockTx.detalleDespacho.findMany.mockResolvedValue([]);
      mockTx.despacho.create.mockResolvedValue({
        id: 'desp-001',
        contratoId: 'ctr-1',
      });
      const service = new OperationsService(mockPrisma);

      const dto: CreateDespachoDto = {
        contratoId: 'ctr-1',
        solicitudDespachoId: 'sol-1',
        operadorNombre: 'Manuel Gomez',
        vehiculoEnvio: 'Plataforma 04',
        comentarios: 'Salida autorizada',
        actaEntregaData: {
          recibidoPor: 'Cliente de prueba',
          items: [
            {
              itemNum: '01',
              cant: '1',
              descripcion: 'CAT-320',
              horas: '120',
              combustible: '5 BARRAS',
            },
          ],
        },
        items: [
          {
            equipoId: 'eq-serial',
            numeroSerie: 'SN-CAT-999',
            cantidad: 1,
            horometroInicial: 120.0,
            estadoSalida: 'BUENO',
            checklistOk: true,
            inspeccionSalida: {
              combustible: '100%',
              nivelCombustible: 100,
              aceiteOk: true,
              llantasOk: true,
              hidraulicoOk: true,
              motorOk: true,
              fugasDetectadas: false,
              observaciones: 'Impecable',
            },
          },
        ],
      };

      const result = await service.createDespacho(dto, empresaId);

      expect(mockTx.despacho.create).toHaveBeenCalled();
      expect(mockTx.despacho.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actaEntregaData: dto.actaEntregaData,
          }),
        }),
      );
      expect(mockTx.solicitudDespacho.update).toHaveBeenCalledWith({
        where: { id: 'sol-1' },
        data: { estado: EstadoSolicitudOperativa.COMPLETADA },
      });
      expect(mockTx.equipo.update).toHaveBeenCalledWith({
        where: { id: 'eq-serial' },
        data: {
          estado: EstadoEquipo.DESPACHADO,
          cantidadDisponible: 0,
          horometro: 120.0,
        },
      });
      expect(mockTx.lecturaHorometro.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            equipoId: 'eq-serial',
            horometroAnterior: 100.0,
            horometroNuevo: 120.0,
            horasTrabajadas: 20.0,
            origen: OrigenLecturaHorometro.DESPACHO,
            registradoPor: 'Manuel Gomez',
          }),
        }),
      );
      expect(result).toEqual({ id: 'desp-001', contratoId: 'ctr-1' });
    });
  });

  describe('createRetorno', () => {
    it('lanza NotFoundException si el contrato no existe para la empresa', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue(null);
      const service = new OperationsService(mockPrisma);

      const dto: CreateRetornoDto = {
        contratoId: 'ctr-404',
        recibidoPor: 'Receptor Test',
        items: [],
      };

      await expect(service.createRetorno(dto, empresaId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza BadRequestException si solicitudRetornoId no pertenece a la empresa o contrato', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        sucursal: { empresaId },
      });
      mockTx.solicitudRetorno.findFirst.mockResolvedValue(null);
      const service = new OperationsService(mockPrisma);

      const dto: CreateRetornoDto = {
        contratoId: 'ctr-1',
        recibidoPor: 'Receptor Test',
        solicitudRetornoId: 'ret-ajena',
        items: [],
      };

      await expect(service.createRetorno(dto, empresaId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si el equipo no pertenece al contrato', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        sucursal: { empresaId },
      });
      mockTx.equipo.findFirst.mockResolvedValue(null);
      const service = new OperationsService(mockPrisma);

      const defaultInspeccionEstado = {
        funcionamiento: 'FUNCIONA' as const,
        estadoFisico: 'BUENO' as const,
        accesoriosCompletos: true,
      };

      const dto: CreateRetornoDto = {
        contratoId: 'ctr-1',
        recibidoPor: 'Receptor Test',
        items: [
          {
            equipoId: 'eq-ajeno',
            cantidadRetornada: 1,
            inspeccionEstado: defaultInspeccionEstado,
          },
        ],
      };

      await expect(service.createRetorno(dto, empresaId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException si cantidadRetornada es inválida', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        sucursal: { empresaId },
      });
      mockTx.equipo.findFirst.mockResolvedValue({
        id: 'eq-1',
        tipoControl: TipoControlEquipo.POR_CANTIDAD,
      });
      const service = new OperationsService(mockPrisma);

      const defaultInspeccionEstado = {
        funcionamiento: 'FUNCIONA' as const,
        estadoFisico: 'BUENO' as const,
        accesoriosCompletos: true,
      };

      const dto: CreateRetornoDto = {
        contratoId: 'ctr-1',
        recibidoPor: 'Receptor Test',
        items: [
          {
            equipoId: 'eq-1',
            cantidadRetornada: -1,
            inspeccionEstado: defaultInspeccionEstado,
          },
        ],
      };

      await expect(service.createRetorno(dto, empresaId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException por doble retorno si ya no quedan unidades pendientes', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        sucursal: { empresaId },
      });
      mockTx.equipo.findFirst.mockResolvedValue({
        id: 'eq-1',
        horometro: 100,
        tipoControl: TipoControlEquipo.POR_CANTIDAD,
      });
      mockTx.detalleDespacho.findMany.mockResolvedValue([{ cantidad: 2 }]);
      mockTx.detalleDevolucion.findMany.mockResolvedValue([
        { cantidadRetornada: 2 },
      ]);
      const service = new OperationsService(mockPrisma);

      const defaultInspeccionEstado = {
        funcionamiento: 'FUNCIONA' as const,
        estadoFisico: 'BUENO' as const,
        accesoriosCompletos: true,
      };

      const dto: CreateRetornoDto = {
        contratoId: 'ctr-1',
        recibidoPor: 'Receptor Test',
        items: [
          {
            equipoId: 'eq-1',
            cantidadRetornada: 1,
            inspeccionEstado: defaultInspeccionEstado,
          },
        ],
      };

      await expect(service.createRetorno(dto, empresaId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza BadRequestException por retorno excesivo si cantidadRetornada > pendientes', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        sucursal: { empresaId },
      });
      mockTx.equipo.findFirst.mockResolvedValue({
        id: 'eq-1',
        horometro: 100,
        tipoControl: TipoControlEquipo.POR_CANTIDAD,
      });
      mockTx.detalleDespacho.findMany.mockResolvedValue([{ cantidad: 5 }]);
      mockTx.detalleDevolucion.findMany.mockResolvedValue([
        { cantidadRetornada: 3 },
      ]);
      const service = new OperationsService(mockPrisma);

      const defaultInspeccionEstado = {
        funcionamiento: 'FUNCIONA' as const,
        estadoFisico: 'BUENO' as const,
        accesoriosCompletos: true,
      };

      const dto: CreateRetornoDto = {
        contratoId: 'ctr-1',
        recibidoPor: 'Receptor Test',
        items: [
          {
            equipoId: 'eq-1',
            cantidadRetornada: 3,
            inspeccionEstado: defaultInspeccionEstado,
          },
        ], // 2 pendientes vs 3 retornados
      };

      await expect(service.createRetorno(dto, empresaId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('crea retorno de equipo serializado con daños: pasa a EN_MANTENIMIENTO y cantidadDisponible 0', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        codigo: 'CTR-2026-001',
        sucursalId: 'suc-1',
        sucursal: { empresaId },
      });
      mockTx.solicitudRetorno.findFirst.mockResolvedValue({ id: 'ret-sol-1' });
      mockTx.equipo.findFirst.mockResolvedValue({
        id: 'eq-serial',
        horometro: 120.0,
        tipoControl: TipoControlEquipo.SERIALIZADO,
        cantidadDisponible: 0,
      });
      mockTx.detalleDespacho.findMany.mockResolvedValue([{ cantidad: 1 }]);
      mockTx.detalleDevolucion.findMany.mockResolvedValue([]);
      mockTx.devolucion.create.mockResolvedValue({
        id: 'dev-001',
        items: [{ id: 'detail-1', equipoId: 'eq-serial' }],
      });
      const service = new OperationsService(mockPrisma);

      const dto: CreateRetornoDto = {
        contratoId: 'ctr-1',
        solicitudRetornoId: 'ret-sol-1',
        recibidoPor: 'Receptor Bodega',
        items: [
          {
            equipoId: 'eq-serial',
            cantidadRetornada: 1,
            cantidadDañada: 1,
            horometroFinal: 150.0,
            inspeccionEstado: {
              funcionamiento: 'NO_FUNCIONA',
              estadoFisico: 'DANADO',
              accesoriosCompletos: true,
            },
            daniosDetectados: true,
            descripcionDanios: 'Golpe en cabina',
            danios: [
              {
                componente: 'Cabina',
                tipoDano: 'Abolladura',
                severidad: SeveridadDano.MEDIA,
                cobrable: true,
                costoEstimado: 350.0,
              },
            ],
          },
        ],
      };

      const result = await service.createRetorno(dto, empresaId);

      expect(mockTx.devolucion.create).toHaveBeenCalled();
      expect(mockTx.mantenimiento.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          equipoId: 'eq-serial',
          detalleDevolucionId: 'detail-1',
          tipo: 'CORRECTIVO',
          estado: 'EN_PROCESO',
          costo: 0,
          cobrableCliente: true,
        }),
      });
      expect(mockTx.solicitudRetorno.update).toHaveBeenCalledWith({
        where: { id: 'ret-sol-1' },
        data: { estado: EstadoSolicitudOperativa.COMPLETADA },
      });
      expect(mockTx.equipo.update).toHaveBeenCalledWith({
        where: { id: 'eq-serial' },
        data: {
          estado: EstadoEquipo.EN_MANTENIMIENTO,
          cantidadDisponible: 0,
          horometro: 150.0,
        },
      });
      expect(mockTx.lecturaHorometro.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            equipoId: 'eq-serial',
            horometroAnterior: 120.0,
            horometroNuevo: 150.0,
            horasTrabajadas: 30.0,
            origen: OrigenLecturaHorometro.RETORNO,
          }),
        }),
      );
      expect(result).toEqual({
        id: 'dev-001',
        items: [{ id: 'detail-1', equipoId: 'eq-serial' }],
      });
    });

    it('rechaza una lectura final de horómetro menor que la registrada', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        codigo: 'CTR-2026-001',
        sucursalId: 'suc-1',
        sucursal: { empresaId },
      });
      mockTx.equipo.findFirst.mockResolvedValue({
        id: 'eq-serial',
        modelo: 'Compactadora',
        horometro: 120,
        tipoControl: TipoControlEquipo.SERIALIZADO,
        cantidadDisponible: 0,
      });
      mockTx.detalleDespacho.findMany.mockResolvedValue([{ cantidad: 1 }]);
      mockTx.detalleDevolucion.findMany.mockResolvedValue([]);
      const service = new OperationsService(mockPrisma);

      await expect(
        service.createRetorno(
          {
            contratoId: 'ctr-1',
            recibidoPor: 'Receptor Test',
            items: [
              {
                equipoId: 'eq-serial',
                cantidadRetornada: 1,
                horometroFinal: 119,
                inspeccionEstado: {
                  funcionamiento: 'FUNCIONA',
                  estadoFisico: 'BUENO',
                  accesoriosCompletos: true,
                },
              },
            ],
          },
          empresaId,
        ),
      ).rejects.toThrow(
        'El horómetro final del equipo Compactadora no puede ser menor',
      );
      expect(mockTx.devolucion.create).not.toHaveBeenCalled();
    });

    it('permite retorno sin horómetro para equipos sin motor (tieneHorometro: false, ej. andamios)', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        codigo: 'CTR-2026-001',
        sucursalId: 'suc-1',
        sucursal: { empresaId },
      });
      mockTx.equipo.findFirst.mockResolvedValue({
        id: 'eq-andamio',
        modelo: 'Andamio Estándar',
        horometro: 0,
        tieneHorometro: false,
        tipoControl: TipoControlEquipo.SERIALIZADO,
        cantidadDisponible: 0,
      });
      mockTx.detalleDespacho.findMany.mockResolvedValue([{ cantidad: 1 }]);
      mockTx.detalleDevolucion.findMany.mockResolvedValue([]);
      mockTx.devolucion.create.mockResolvedValue({
        id: 'dev-andamio-1',
        items: [{ id: 'detail-andamio-1', equipoId: 'eq-andamio' }],
      });
      mockTx.equipo.update.mockResolvedValue({});
      mockTx.solicitudRetorno.findFirst.mockResolvedValue(null);

      const service = new OperationsService(mockPrisma);

      const result = await service.createRetorno(
        {
          contratoId: 'ctr-1',
          recibidoPor: 'Receptor Test',
          items: [
            {
              equipoId: 'eq-andamio',
              cantidadRetornada: 1,
              // Sin horometroFinal provisto
              inspeccionEstado: {
                funcionamiento: 'FUNCIONA',
                estadoFisico: 'BUENO',
                accesoriosCompletos: true,
              },
            },
          ],
        },
        empresaId,
      );

      expect(mockTx.devolucion.create).toHaveBeenCalled();
      expect(mockTx.equipo.update).toHaveBeenCalledWith({
        where: { id: 'eq-andamio' },
        data: {
          estado: EstadoEquipo.DISPONIBLE,
          cantidadDisponible: 1,
          horometro: 0,
        },
      });
      // No debe generar lectura de horómetro
      expect(mockTx.lecturaHorometro.create).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 'dev-andamio-1',
        items: [{ id: 'detail-andamio-1', equipoId: 'eq-andamio' }],
      });
    });

    it('no devuelve al inventario sano unidades dañadas de un lote sin cantidad especificada', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        codigo: 'CTR-2026-001',
        sucursalId: 'suc-1',
        sucursal: { empresaId },
      });
      mockTx.equipo.findFirst.mockResolvedValue({
        id: 'eq-lote',
        modelo: 'Andamio',
        horometro: 0,
        tipoControl: TipoControlEquipo.POR_CANTIDAD,
        cantidadDisponible: 0,
        cantidadTotal: 3,
      });
      const service = new OperationsService(mockPrisma);

      await expect(
        service.createRetorno(
          {
            contratoId: 'ctr-1',
            recibidoPor: 'Receptor Test',
            items: [
              {
                equipoId: 'eq-lote',
                cantidadRetornada: 2,
                cantidadDañada: 0,
                inspeccionEstado: {
                  funcionamiento: 'NO_FUNCIONA',
                  estadoFisico: 'DANADO',
                  accesoriosCompletos: true,
                },
              },
            ],
          },
          empresaId,
        ),
      ).rejects.toThrow('Indique cuántas unidades del lote retornaron dañadas');
      expect(mockTx.equipo.update).not.toHaveBeenCalled();
    });

    it('crea retorno de equipo serializado sin daños: pasa a DISPONIBLE y cantidadDisponible 1', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        codigo: 'CTR-2026-001',
        sucursalId: 'suc-1',
        sucursal: { empresaId },
      });
      mockTx.equipo.findFirst.mockResolvedValue({
        id: 'eq-serial',
        horometro: 120.0,
        tipoControl: TipoControlEquipo.SERIALIZADO,
        cantidadDisponible: 0,
      });
      mockTx.detalleDespacho.findMany.mockResolvedValue([{ cantidad: 1 }]);
      mockTx.detalleDevolucion.findMany.mockResolvedValue([]);
      mockTx.devolucion.create.mockResolvedValue({ id: 'dev-002' });
      const service = new OperationsService(mockPrisma);

      const dto: CreateRetornoDto = {
        contratoId: 'ctr-1',
        recibidoPor: 'Receptor Test',
        items: [
          {
            equipoId: 'eq-serial',
            cantidadRetornada: 1,
            horometroFinal: 130.0,
            inspeccionEstado: {
              funcionamiento: 'FUNCIONA',
              estadoFisico: 'BUENO',
              accesoriosCompletos: true,
            },
          },
        ],
      };

      await service.createRetorno(dto, empresaId);

      expect(mockTx.equipo.update).toHaveBeenCalledWith({
        where: { id: 'eq-serial' },
        data: {
          estado: EstadoEquipo.DISPONIBLE,
          cantidadDisponible: 1,
          horometro: 130.0,
        },
      });
    });

    it('crea retorno de equipo por cantidad: calcula unidades sanas y restaura stock disponible', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        codigo: 'CTR-2026-001',
        sucursalId: 'suc-1',
        sucursal: { empresaId },
      });
      mockTx.equipo.findFirst.mockResolvedValue({
        id: 'eq-cant',
        horometro: 50.0,
        tipoControl: TipoControlEquipo.POR_CANTIDAD,
        cantidadTotal: 10,
        cantidadDisponible: 3,
        estado: EstadoEquipo.DESPACHADO,
      });
      mockTx.detalleDespacho.findMany.mockResolvedValue([{ cantidad: 6 }]);
      mockTx.detalleDevolucion.findMany.mockResolvedValue([]);
      mockTx.devolucion.create.mockResolvedValue({ id: 'dev-003' });
      const service = new OperationsService(mockPrisma);

      const dto: CreateRetornoDto = {
        contratoId: 'ctr-1',
        recibidoPor: 'Receptor Test',
        items: [
          {
            equipoId: 'eq-cant',
            cantidadRetornada: 5,
            cantidadDañada: 1,
            cantidadPerdida: 1,
            inspeccionEstado: {
              funcionamiento: 'FUNCIONA',
              estadoFisico: 'DESGASTE_NORMAL',
              accesoriosCompletos: true,
            },
            // 5 recibidas (1 dañada) y 1 perdida = 4 sanas.
            // Disponibles previas 3 + 4 = 7.
          },
        ],
      };

      await service.createRetorno(dto, empresaId);

      expect(mockTx.equipo.update).toHaveBeenCalledWith({
        where: { id: 'eq-cant' },
        data: {
          estado: EstadoEquipo.DISPONIBLE,
          cantidadDisponible: 7,
          horometro: 50.0,
        },
      });
    });
  });

  describe('Consultas generales', () => {
    it('findAllDespachos - retorna lista filtrada por sucursal.empresaId', async () => {
      const { mockPrisma } = createMockPrisma();
      mockPrisma.despacho.findMany.mockResolvedValue([{ id: 'desp-1' }]);
      const service = new OperationsService(mockPrisma);

      const result = await service.findAllDespachos(empresaId);
      expect(mockPrisma.despacho.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sucursal: { empresaId } },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toHaveLength(1);
    });

    it('findAllRetornos - retorna lista filtrada por sucursal.empresaId', async () => {
      const { mockPrisma } = createMockPrisma();
      mockPrisma.devolucion.findMany.mockResolvedValue([{ id: 'dev-1' }]);
      const service = new OperationsService(mockPrisma);

      const result = await service.findAllRetornos(empresaId);
      expect(mockPrisma.devolucion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sucursal: { empresaId } },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('Sustitución de Equipos por Avería (Equipment Swap)', () => {
    it('getCompatibleReplacements - retorna el equipo actual y lista ordenada de disponibles', async () => {
      const { mockPrisma } = createMockPrisma();
      mockPrisma.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        codigo: 'CTR-2026-0001',
        sucursalId: 'suc-1',
        cliente: { nombre: 'Cliente Test' },
      });
      mockPrisma.equipo.findFirst.mockResolvedValue({
        id: 'eq-viejo',
        modelo: 'Retroexcavadora JCB 3CX',
        categoriaId: 'cat-amarilla',
        subcategoriaId: 'sub-retro',
      });
      mockPrisma.equipo.findMany.mockResolvedValue([
        {
          id: 'eq-otro',
          modelo: 'Vibrador Manual',
          categoriaId: 'cat-concreto',
          subcategoriaId: 'sub-vib',
          estado: EstadoEquipo.DISPONIBLE,
          cantidadDisponible: 2,
        },
        {
          id: 'eq-gemelo',
          modelo: 'Retroexcavadora JCB 3CX',
          categoriaId: 'cat-amarilla',
          subcategoriaId: 'sub-retro',
          estado: EstadoEquipo.DISPONIBLE,
          cantidadDisponible: 1,
        },
      ]);

      const service = new OperationsService(mockPrisma);
      const res = await service.getCompatibleReplacements('ctr-1', 'eq-viejo', empresaId);

      expect(res.contrato.codigo).toBe('CTR-2026-0001');
      expect(res.equipoActual.id).toBe('eq-viejo');
      expect(res.reemplazosDisponibles).toHaveLength(2);
      // El reemplazo directo debe quedar en primer lugar
      expect(res.reemplazosDisponibles[0].id).toBe('eq-gemelo');
      expect(res.reemplazosDisponibles[0].esReemplazoDirecto).toBe(true);
    });

    it('swapEquipment - rechaza si el equipo actual y el nuevo son el mismo ID', async () => {
      const { mockPrisma } = createMockPrisma();
      const service = new OperationsService(mockPrisma);

      await expect(
        service.swapEquipment(
          {
            contratoId: 'ctr-1',
            equipoActualId: 'eq-1',
            equipoNuevoId: 'eq-1',
            motivo: 'Falla',
          },
          empresaId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('swapEquipment - ejecuta la sustitución completa: retira a taller, asigna nuevo a contrato y genera despacho', async () => {
      const { mockPrisma, mockTx } = createMockPrisma();
      mockTx.contrato.findFirst.mockResolvedValue({
        id: 'ctr-1',
        codigo: 'CTR-2026-0001',
        sucursalId: 'suc-1',
        estado: 'VIGENTE',
        fechaInicio: new Date('2026-10-01'),
        fechaFin: new Date('2026-10-10'),
        cliente: { nombre: 'Constructora S.A.', rfc: 'J0310000001' },
        items: [
          {
            id: 'det-1',
            equipoId: 'eq-roto',
            tipoControl: TipoControlEquipo.SERIALIZADO,
            equipo: { id: 'eq-roto', modelo: 'CAT 320' },
          },
        ],
      });
      mockTx.equipo.findFirst
        .mockResolvedValueOnce({
          id: 'eq-roto',
          modelo: 'CAT 320',
          numeroSerie: 'SN-ROTO',
          horometro: 120.0,
          tieneHorometro: true,
          tipoControl: TipoControlEquipo.SERIALIZADO,
        })
        .mockResolvedValueOnce({
          id: 'eq-nuevo',
          modelo: 'CAT 320 Sustituto',
          numeroSerie: 'SN-NUEVO',
          horometro: 50.0,
          tieneHorometro: true,
          estado: EstadoEquipo.DISPONIBLE,
          cantidadDisponible: 1,
          tipoControl: TipoControlEquipo.SERIALIZADO,
        });

      mockTx.mantenimiento.create.mockResolvedValue({ id: 'mant-1' });
      mockTx.despacho.create.mockResolvedValue({ id: 'desp-swap-1' });

      const service = new OperationsService(mockPrisma);
      const res = await service.swapEquipment(
        {
          contratoId: 'ctr-1',
          equipoActualId: 'eq-roto',
          equipoNuevoId: 'eq-nuevo',
          motivo: 'Manguera rota al descargar en obra',
          horometroFinalActual: 120.0,
          responsableEntrega: 'Juan Almacén',
          responsableRecepcion: 'Ing. Carlos',
        },
        empresaId,
        'usr-1',
      );

      expect(res.contratoId).toBe('ctr-1');
      expect(res.equipoSaliente.estado).toBe(EstadoEquipo.EN_MANTENIMIENTO);
      expect(res.equipoEntrante.estado).toBe(EstadoEquipo.DESPACHADO);

      // 1. Equipo roto pasa a EN_MANTENIMIENTO
      expect(mockTx.equipo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'eq-roto' },
          data: expect.objectContaining({
            estado: EstadoEquipo.EN_MANTENIMIENTO,
            cantidadDisponible: 0,
          }),
        }),
      );

      // 2. Se genera orden de taller correctivo
      expect(mockTx.mantenimiento.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            equipoId: 'eq-roto',
            tipo: TipoMantenimiento.CORRECTIVO,
            estado: EstadoMantenimiento.EN_PROCESO,
          }),
        }),
      );

      // 3. DetalleContrato se actualiza al nuevo equipo
      expect(mockTx.detalleContrato.update).toHaveBeenCalledWith({
        where: { id: 'det-1' },
        data: expect.objectContaining({
          equipoId: 'eq-nuevo',
          horometroInicial: 50.0,
        }),
      });

      // 4. Equipo nuevo pasa a DESPACHADO
      expect(mockTx.equipo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'eq-nuevo' },
          data: expect.objectContaining({
            estado: EstadoEquipo.DESPACHADO,
            cantidadDisponible: 0,
          }),
        }),
      );

      // 5. Se crea Despacho con acta de sustitución
      expect(mockTx.despacho.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contratoId: 'ctr-1',
            actaEntregaData: expect.objectContaining({
              tipoActa: 'SUSTITUCION',
            }),
          }),
        }),
      );
    });
  });
});
