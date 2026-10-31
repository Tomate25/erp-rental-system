import { BadRequestException } from '@nestjs/common';
import { CxcNotasService } from './cxc-notas.service';
import { CxcRecibosService } from './cxc-recibos.service';
import { ContractsService } from '../../contracts/services/contracts.service';
import { TipoDocumentoSerie, MetodoPagoRecibo, TipoNotaCxc } from '@prisma/client';

describe('CxC & Numbering P0 Fixes - Unit Tests', () => {
  describe('CxcNotasService (P0-2)', () => {
    let service: CxcNotasService;
    let mockPrisma: any;
    let mockTipoCambio: any;
    let mockConfig: any;
    let mockNumbering: any;

    beforeEach(() => {
      mockPrisma = {
        cliente: {
          findUnique: jest.fn().mockResolvedValue({ id: 'cli-1', nombre: 'Cliente Test', esRetenedor: false }),
        },
        sucursal: {
          findFirst: jest.fn(),
        },
        notaDebito: {
          create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'nd-1', ...data })),
        },
        asientoContable: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'as-1', numeroAsiento: 'AS-2026-00001' }),
        },
        polizaContable: {
          create: jest.fn().mockResolvedValue({ id: 'pol-1' }),
        },
        $transaction: jest.fn().mockImplementation(async (callback) => {
          return callback(mockPrisma);
        }),
      };

      mockTipoCambio = {
        obtenerTasaDelDia: jest.fn().mockResolvedValue(36.6243),
      };

      mockConfig = {
        obtenerConfiguracion: jest.fn().mockResolvedValue({}),
      };

      mockNumbering = {
        next: jest.fn().mockResolvedValue('ND-000001'),
      };

      service = new CxcNotasService(mockPrisma, mockTipoCambio, mockConfig, mockNumbering);
    });

    it('P0-2.1: debe lanzar BadRequestException si sucursalId no existe en la empresa (evitando 500)', async () => {
      mockPrisma.sucursal.findFirst.mockResolvedValue(null);

      await expect(
        service.crearNota('emp-1', {
          clienteId: 'cli-1',
          sucursalId: 'INVALIDA',
          subtotal: 100,
          iva: 15,
          total: 115,
          concepto: 'Ajuste de flete',
        } as any)
      ).rejects.toThrow(BadRequestException);

      expect(mockNumbering.next).not.toHaveBeenCalled();
    });

    it('P0-2.2: debe resolver sucursal por código o UUID y emitir folio ND vía NumberingService', async () => {
      const sucursalReal = { id: 'uuid-sucursal-central', nombre: 'Sucursal Central', codigo: 'KM10' };
      mockPrisma.sucursal.findFirst.mockResolvedValue(sucursalReal);

      const nota = await service.crearNota(
        'emp-1',
        {
          clienteId: 'cli-1',
          sucursalId: 'KM10',
          tipoNota: TipoNotaCxc.DEBITO,
          subtotal: 100,
          iva: 15,
          total: 115,
          concepto: 'Daño en equipo',
        } as any,
        'usr-1'
      );

      // Debe llamar a NumberingService.next con el UUID real resuelto
      expect(mockNumbering.next).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          empresaId: 'emp-1',
          sucursalId: 'uuid-sucursal-central',
          tipoDocumento: TipoDocumentoSerie.NOTA_DEBITO,
          usuarioId: 'usr-1',
        })
      );

      // La nota creada debe tener el UUID de sucursal real resuelto y el folio emitido
      expect(mockPrisma.notaDebito.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sucursalId: 'uuid-sucursal-central',
            numeroNota: 'ND-000001',
          }),
        })
      );

      expect(nota.numeroNota).toBe('ND-000001');
    });

    it('P0-2.3: si no se provee sucursalId, debe resolver la primera sucursal activa de la empresa', async () => {
      const primeraSucursal = { id: 'uuid-sucursal-default', nombre: 'Default' };
      mockPrisma.sucursal.findFirst.mockResolvedValue(primeraSucursal);

      await service.crearNota('emp-1', {
        clienteId: 'cli-1',
        subtotal: 100,
        iva: 15,
        total: 115,
        concepto: 'Penalidad',
      } as any);

      expect(mockNumbering.next).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          sucursalId: 'uuid-sucursal-default',
        })
      );
    });
  });

  describe('CxcRecibosService (P0-1)', () => {
    let service: CxcRecibosService;
    let mockPrisma: any;
    let mockTipoCambio: any;
    let mockConfig: any;
    let mockNumbering: any;

    beforeEach(() => {
      mockPrisma = {
        cliente: {
          findUnique: jest.fn().mockResolvedValue({ id: 'cli-1', nombre: 'Cliente Test', esRetenedor: false }),
        },
        sucursal: {
          findFirst: jest.fn(),
        },
        factura: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        reciboCaja: {
          create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'rc-1', ...data })),
        },
        reciboCajaAplicacion: {
          create: jest.fn(),
        },
        anticipoCliente: {
          create: jest.fn().mockResolvedValue({ id: 'ant-1' }),
        },
        asientoContable: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'as-1', numeroAsiento: 'AS-2026-00001' }),
        },
        $transaction: jest.fn().mockImplementation(async (callback) => {
          return callback(mockPrisma);
        }),
      };

      mockTipoCambio = {
        getTipoCambioHoy: jest.fn().mockResolvedValue({ tasa: 36.6243 }),
      };

      mockConfig = {
        getConfiguracion: jest.fn().mockResolvedValue({}),
      };

      mockNumbering = {
        next: jest.fn().mockResolvedValue('RC-CENTRAL-00001'),
      };

      service = new CxcRecibosService(mockPrisma, mockTipoCambio, mockConfig, mockNumbering);
    });

    it('P0-1.1: debe emitir Recibo de Caja con payload correcto (fechaRecibo, metodoPago) y avanzar serie vía NumberingService', async () => {
      const sucursalReal = { id: 'uuid-sucursal-central', nombre: 'Sucursal Central', codigo: 'KM10' };
      mockPrisma.sucursal.findFirst.mockResolvedValue(sucursalReal);

      const recibo = await service.crearReciboCaja('emp-1', 'usr-1', {
        clienteId: 'cli-1',
        sucursalId: 'KM10',
        fechaRecibo: '2026-10-31T00:00:00.000Z',
        montoEfectivoBancos: 500,
        metodoPago: MetodoPagoRecibo.TRANSFERENCIA,
        numeroTransferenciaReferencia: 'REF-12345',
        aplicarAutoFifo: true,
      });

      expect(mockNumbering.next).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          empresaId: 'emp-1',
          sucursalId: 'uuid-sucursal-central',
          tipoDocumento: TipoDocumentoSerie.RECIBO_CAJA,
          usuarioId: 'usr-1',
        })
      );

      expect(mockPrisma.reciboCaja.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            numeroRecibo: 'RC-CENTRAL-00001',
            sucursalId: 'uuid-sucursal-central',
            metodoPago: MetodoPagoRecibo.TRANSFERENCIA,
          }),
        })
      );

      expect(recibo.recibo.numeroRecibo).toBe('RC-CENTRAL-00001');
    });

    it('P0-1.2: debe lanzar BadRequestException si la sucursal indicada no existe', async () => {
      mockPrisma.sucursal.findFirst.mockResolvedValue(null);

      await expect(
        service.crearReciboCaja('emp-1', 'usr-1', {
          clienteId: 'cli-1',
          sucursalId: 'INEXISTENTE',
          fechaRecibo: '2026-10-31',
          montoEfectivoBancos: 500,
          metodoPago: MetodoPagoRecibo.EFECTIVO,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('ContractsService (P0-3)', () => {
    it('P0-3: al emitir factura para primer corte de contrato CONTADO, debe usar NumberingService.next(FACTURA) en vez de prefijo estático', async () => {
      const mockNumbering = {
        next: jest.fn().mockResolvedValue('FAC-CENTRAL-000003'),
      };

      const mockContrato = {
        id: 'ctr-1',
        empresaId: 'emp-1',
        sucursalId: 'suc-1',
        clienteId: 'cli-1',
        codigo: 'CTR-2026-0001',
        fechaInicio: new Date('2026-11-01'),
        fechaFin: new Date('2026-11-30'),
        condiciones: 'CONTADO',
        items: [],
        cortesFacturacion: [],
        cotizacion: {
          id: 'cot-1',
          total: 1000,
          condiciones: 'CONTADO',
          fechaInicioRenta: new Date('2026-11-01'),
          fechaFinRenta: new Date('2026-11-30'),
        },
      };

      const mockPrisma: any = {
        contrato: {
          findFirst: jest.fn().mockResolvedValue(mockContrato),
          findUnique: jest.fn().mockResolvedValue(mockContrato),
          update: jest.fn().mockResolvedValue(mockContrato),
        },
        corteFacturacion: {
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          create: jest.fn().mockResolvedValue({ id: 'corte-1' }),
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
          findFirst: jest.fn().mockResolvedValue({
            id: 'corte-1',
            numeroCorte: 1,
            monto: 1000,
            estado: 'PENDIENTE',
          }),
          update: jest.fn().mockResolvedValue({ id: 'corte-1' }),
        },
        factura: {
          create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'fac-1', ...data })),
        },
        auditoria: {
          create: jest.fn().mockResolvedValue({ id: 'aud-1' }),
        },
        reserva: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        $transaction: jest.fn().mockImplementation(async (callback) => {
          return callback(mockPrisma);
        }),
      };

      const service = new ContractsService(mockPrisma, undefined, mockNumbering as any);
      (service as any).findOne = jest.fn().mockResolvedValue(mockContrato);
      (service as any).generateCortesForContractTx = jest.fn().mockResolvedValue([]);

      await service.openContract('ctr-1', 30, 'emp-1', 'usr-1');

      // Debe llamar a NumberingService.next con FACTURA y sucursal del contrato
      expect(mockNumbering.next).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          empresaId: 'emp-1',
          sucursalId: 'suc-1',
          tipoDocumento: TipoDocumentoSerie.FACTURA,
          documentoId: 'corte-1',
          usuarioId: 'usr-1',
        })
      );

      // Y la factura creada debe tener el folio devuelto por NumberingService
      expect(mockPrisma.factura.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            folio: 'FAC-CENTRAL-000003',
            contratoId: 'ctr-1',
            corteId: 'corte-1',
          }),
        })
      );
    });
  });
});
