import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CommissionsV2Service } from './commissions-v2.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  BaseCalculoComision,
  EstadoAjusteComision,
  EstadoLiquidacionComision,
  EstadoPeriodoComision,
  EstadoVersionPlan,
  MetodoCalculoComision,
  Prisma,
  TratamientoNegativoComision,
} from '@prisma/client';

describe('CommissionsV2Service (spec-modulo-comisiones-BM.md)', () => {
  let service: CommissionsV2Service;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (cb) => cb(prisma)),
      planComision: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      vendedor: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      asignacionVendedorPlan: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      periodoComision: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
      },
      liquidacionComision: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      liquidacionComisionDocumento: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      liquidacionComisionTramo: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      saldoArrastreComision: {
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      ajusteComision: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      factura: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      periodoNomina: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      conceptoNomina: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      novedadNomina: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionsV2Service,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CommissionsV2Service>(CommissionsV2Service);
  });

  describe('seedDefaultPlans (R2)', () => {
    it('siembra los planes de David y Nylska con sus tramos escalonados oficiales', async () => {
      prisma.planComision.findFirst.mockResolvedValue(null);
      prisma.planComision.create.mockImplementation(({ data }: any) => ({
        id: `plan-${data.codigo}`,
        ...data,
      }));
      prisma.vendedor.findFirst.mockResolvedValue(null);
      prisma.vendedor.create.mockImplementation(({ data }: any) => ({
        id: `vend-${data.codigo}`,
        ...data,
      }));
      prisma.asignacionVendedorPlan.findFirst.mockResolvedValue(null);
      prisma.asignacionVendedorPlan.create.mockResolvedValue({ id: 'asig-1' });

      const res = await service.seedDefaultPlans('empresa-1');
      expect(res.planes).toHaveLength(2);
      expect(res.vendedores).toHaveLength(2);
      expect(prisma.planComision.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('generarLiquidacion (R1 a R7, T7 a T11)', () => {
    const mockPeriodo = {
      id: 'per-oct-2026',
      empresaId: 'empresa-1',
      anio: 2026,
      mes: 10,
      fechaInicio: new Date('2026-10-01T00:00:00.000Z'),
      fechaFin: new Date('2026-10-31T23:59:59.999Z'),
      fechaPago: new Date('2026-11-15T00:00:00.000Z'),
      estado: EstadoPeriodoComision.ABIERTO,
    };

    const mockVendedorDavid = {
      id: 'vend-david',
      empresaId: 'empresa-1',
      codigo: 'DAVID',
      nombreMostrar: 'David',
      empleadoId: 'emp-david',
    };

    const mockAsignacionDavid = {
      id: 'asig-david',
      vendedorId: 'vend-david',
      plan: {
        versiones: [
          {
            id: 'ver-david-1',
            version: 1,
            metodo: MetodoCalculoComision.ESCALONADO,
            base: BaseCalculoComision.FACTURADO,
            incluyeIva: false,
            tratamientoNegativo: TratamientoNegativoComision.ARRASTRAR,
            tramos: [
              { orden: 1, desdeExcl: new Prisma.Decimal(0), hastaIncl: new Prisma.Decimal(800000), porcentaje: new Prisma.Decimal(3) },
              { orden: 2, desdeExcl: new Prisma.Decimal(800000), hastaIncl: new Prisma.Decimal(1200000), porcentaje: new Prisma.Decimal(2) },
              { orden: 3, desdeExcl: new Prisma.Decimal(1200000), hastaIncl: null, porcentaje: new Prisma.Decimal(1) },
            ],
          },
        ],
      },
    };

    it('T7 & T8 & T9: Acumula el mes completo sin IVA, excluye anuladas y calcula 26,400.00 (Ejemplo 2.2)', async () => {
      prisma.periodoComision.findFirst.mockResolvedValue(mockPeriodo);
      prisma.vendedor.findFirst.mockResolvedValue(mockVendedorDavid);
      prisma.liquidacionComision.findFirst.mockResolvedValue(null);
      prisma.asignacionVendedorPlan.findFirst.mockResolvedValue(mockAsignacionDavid);
      prisma.saldoArrastreComision.findMany.mockResolvedValue([]);

      // Facturas de David en octubre:
      // Factura 1: Subtotal 350,000 / IVA 52,500 / Total 402,500
      // Factura 2: Subtotal 420,000 / IVA 63,000 / Total 483,000
      // Factura 3: Subtotal 180,000 / IVA 27,000 / Total 207,000
      prisma.factura.findMany
        .mockResolvedValueOnce([
          { id: 'f1', folio: 'A-000101', fechaEmision: new Date('2026-10-03'), subtotal: new Prisma.Decimal(350000), iva: new Prisma.Decimal(52500), total: new Prisma.Decimal(402500), sucursalId: 'km105' },
          { id: 'f2', folio: 'A-000115', fechaEmision: new Date('2026-10-12'), subtotal: new Prisma.Decimal(420000), iva: new Prisma.Decimal(63000), total: new Prisma.Decimal(483000), sucursalId: 'km105' },
          { id: 'f3', folio: 'B-000044', fechaEmision: new Date('2026-10-20'), subtotal: new Prisma.Decimal(180000), iva: new Prisma.Decimal(27000), total: new Prisma.Decimal(207000), sucursalId: 'ca' },
        ])
        // Notas de crédito:
        // NC 1: Subtotal 30,000 sobre factura de septiembre
        .mockResolvedValueOnce([
          { id: 'nc1', folio: 'NCA-000012', fechaEmision: new Date('2026-10-25'), subtotal: new Prisma.Decimal(30000), iva: new Prisma.Decimal(4500), total: new Prisma.Decimal(34500), sucursalId: 'km105', facturaPadreId: 'f-sep' },
        ]);

      prisma.liquidacionComision.create.mockImplementation(({ data }: any) => ({
        id: 'liq-1',
        ...data,
      }));

      prisma.liquidacionComision.findUnique.mockResolvedValue({
        id: 'liq-1',
        baseComisionable: new Prisma.Decimal(920000),
        comisionCalculada: new Prisma.Decimal(26400),
        comisionTotal: new Prisma.Decimal(26400),
      });

      const liq = await service.generarLiquidacion('empresa-1', 'per-oct-2026', 'vend-david');

      expect(prisma.liquidacionComision.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalVentas: new Prisma.Decimal(950000),
            totalNc: new Prisma.Decimal(-30000),
            baseComisionable: new Prisma.Decimal(920000),
            comisionCalculada: new Prisma.Decimal(26400),
            comisionTotal: new Prisma.Decimal(26400),
          }),
        }),
      );
      expect(liq.comisionTotal.toNumber()).toBe(26400);
    });

    it('T11: Base negativa genera arrastre y comisión 0', async () => {
      prisma.periodoComision.findFirst.mockResolvedValue(mockPeriodo);
      prisma.vendedor.findFirst.mockResolvedValue(mockVendedorDavid);
      prisma.liquidacionComision.findFirst.mockResolvedValue(null);
      prisma.asignacionVendedorPlan.findFirst.mockResolvedValue(mockAsignacionDavid);
      prisma.saldoArrastreComision.findMany.mockResolvedValue([]);

      // Ventas 20k, NC 50k => Base -30k
      prisma.factura.findMany
        .mockResolvedValueOnce([
          { id: 'f1', folio: 'A-1', fechaEmision: new Date('2026-10-05'), subtotal: new Prisma.Decimal(20000), iva: new Prisma.Decimal(3000), total: new Prisma.Decimal(23000) },
        ])
        .mockResolvedValueOnce([
          { id: 'nc1', folio: 'NC-1', fechaEmision: new Date('2026-10-10'), subtotal: new Prisma.Decimal(50000), iva: new Prisma.Decimal(7500), total: new Prisma.Decimal(57500), facturaPadreId: 'f0' },
        ]);

      prisma.liquidacionComision.create.mockImplementation(({ data }: any) => ({
        id: 'liq-neg',
        ...data,
      }));

      prisma.liquidacionComision.findUnique.mockResolvedValue({
        id: 'liq-neg',
        baseComisionable: new Prisma.Decimal(-30000),
        comisionCalculada: new Prisma.Decimal(0),
        arrastreGenerado: new Prisma.Decimal(-30000),
      });

      await service.generarLiquidacion('empresa-1', 'per-oct-2026', 'vend-david');

      expect(prisma.liquidacionComision.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            baseComisionable: new Prisma.Decimal(-30000),
            comisionCalculada: new Prisma.Decimal(0),
            arrastreGenerado: new Prisma.Decimal(-30000),
          }),
        }),
      );
    });

    it('T19: Bloquea recálculo si la liquidación ya está APROBADA', async () => {
      prisma.periodoComision.findFirst.mockResolvedValue(mockPeriodo);
      prisma.vendedor.findFirst.mockResolvedValue(mockVendedorDavid);
      prisma.liquidacionComision.findFirst.mockResolvedValue({
        id: 'liq-aprobada',
        estado: EstadoLiquidacionComision.APROBADO,
      });

      await expect(
        service.generarLiquidacion('empresa-1', 'per-oct-2026', 'vend-david'),
      ).rejects.toThrow(/Liquidación bloqueada/i);
    });
  });

  describe('Ajustes manuales y Segregación de Funciones (V14 & T20)', () => {
    it('rechaza que el mismo usuario que solicitó el ajuste lo apruebe (segregación V14)', async () => {
      prisma.ajusteComision.findFirst.mockResolvedValue({
        id: 'ajuste-1',
        solicitadoPor: 'user-supervisor',
        estado: EstadoAjusteComision.PENDIENTE,
        liquidacion: { empresaId: 'empresa-1' },
      });

      await expect(
        service.aprobarAjuste('empresa-1', 'ajuste-1', 'user-supervisor'),
      ).rejects.toThrow(/Segregación de funciones V14/i);
    });

    it('permite que un usuario distinto apruebe el ajuste y actualiza la comisión total', async () => {
      prisma.ajusteComision.findFirst.mockResolvedValue({
        id: 'ajuste-1',
        solicitadoPor: 'user-supervisor',
        estado: EstadoAjusteComision.PENDIENTE,
        monto: new Prisma.Decimal(1000),
        liquidacionId: 'liq-1',
        liquidacion: {
          empresaId: 'empresa-1',
          comisionCalculada: new Prisma.Decimal(26400),
        },
      });

      prisma.ajusteComision.update.mockResolvedValue({
        id: 'ajuste-1',
        estado: EstadoAjusteComision.APROBADO,
      });

      prisma.ajusteComision.findMany.mockResolvedValue([
        { id: 'ajuste-1', monto: new Prisma.Decimal(1000), estado: EstadoAjusteComision.APROBADO },
      ]);

      prisma.liquidacionComision.update.mockResolvedValue({
        id: 'liq-1',
        comisionTotal: new Prisma.Decimal(27400),
      });

      const res = await service.aprobarAjuste('empresa-1', 'ajuste-1', 'user-gerente-carlos');
      expect(res.estado).toBe(EstadoAjusteComision.APROBADO);
      expect(prisma.liquidacionComision.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalAjustes: new Prisma.Decimal(1000),
            comisionTotal: new Prisma.Decimal(27400),
          }),
        }),
      );
    });
  });

  describe('Aprobación e interfaz con Nómina (R9 / T22)', () => {
    it('al aprobar emite novedad de nómina COMISION a la Q1 del mes siguiente si hay empleadoId', async () => {
      prisma.liquidacionComision.findFirst.mockResolvedValue({
        id: 'liq-1',
        empresaId: 'empresa-1',
        periodoId: 'per-oct-2026',
        vendedorId: 'vend-david',
        estado: EstadoLiquidacionComision.REVISADO,
        comisionTotal: new Prisma.Decimal(26400),
        arrastreGenerado: new Prisma.Decimal(0),
        periodo: { anio: 2026, mes: 10 },
        vendedor: { id: 'vend-david', empleadoId: 'emp-david-1' },
        documentos: [{ tipoDoc: 'FACTURA', documentoId: 'f1' }],
        ajustes: [],
      });

      prisma.periodoNomina.findFirst.mockResolvedValue(null);
      prisma.periodoNomina.create.mockResolvedValue({ id: 'per-nom-nov-q1' });
      prisma.conceptoNomina.findFirst.mockResolvedValue({ id: 'conc-com' });
      prisma.novedadNomina.create.mockResolvedValue({ id: 'nov-1' });

      prisma.liquidacionComision.update.mockResolvedValue({
        id: 'liq-1',
        estado: EstadoLiquidacionComision.APROBADO,
      });

      await service.aprobarLiquidacion('empresa-1', 'liq-1', 'user-gerente');

      // Verifica que crea la novedad en Nómina con monto 26,400 y origen COMISIONES
      expect(prisma.novedadNomina.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          empresaId: 'empresa-1',
          empleadoId: 'emp-david-1',
          monto: new Prisma.Decimal(26400),
          origen: 'COMISIONES',
          referenciaId: 'liq-1',
          periodoDevengo: '2026-10',
          estado: 'PENDIENTE',
        }),
      });
    });
  });
});
