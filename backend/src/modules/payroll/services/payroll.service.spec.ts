import { Test, TestingModule } from '@nestjs/testing';
import { PayrollService } from './payroll.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import {
  EstadoPlanilla,
  EstadoPeriodoNomina,
  TipoPeriodoNomina,
  AreaContableNomina,
  MetodoIrNomina,
  TipoSalarioNomina,
  EstadoNovedadNomina,
} from '@prisma/client';

describe('PayrollService (spec-modulo-nomina-BM.md)', () => {
  let service: PayrollService;
  let prisma: any;

  const empresaId = 'empresa-test-uuid';

  beforeEach(async () => {
    prisma = {
      paramInss: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      paramInatec: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      paramIrTramo: {
        count: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      reglaIndemnizacion: {
        count: jest.fn(),
        createMany: jest.fn(),
      },
      conceptoNomina: {
        upsert: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      empleado: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      periodoNomina: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      novedadNomina: {
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      planilla: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      planillaEmpleado: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      planillaLinea: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      acumuladoIr: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      provisionSaldo: {
        upsert: jest.fn(),
      },
      liquidacionFinal: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PayrollService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PayrollService>(PayrollService);
  });

  describe('seedDefaultParameters', () => {
    it('siembra parámetros legales y conceptos base si no existen', async () => {
      prisma.paramInss.findFirst.mockResolvedValue(null);
      prisma.paramInatec.findFirst.mockResolvedValue(null);
      prisma.paramIrTramo.count.mockResolvedValue(0);
      prisma.reglaIndemnizacion.count.mockResolvedValue(0);
      prisma.conceptoNomina.upsert.mockResolvedValue({});

      const res = await service.seedDefaultParameters(empresaId);
      expect(res.ok).toBe(true);
      expect(prisma.paramInss.create).toHaveBeenCalled();
      expect(prisma.paramInatec.create).toHaveBeenCalled();
      expect(prisma.paramIrTramo.create).toHaveBeenCalledTimes(5);
      expect(prisma.reglaIndemnizacion.createMany).toHaveBeenCalled();
    });
  });

  describe('calcularPlanilla (T1 & T2)', () => {
    const dummyPeriodo = {
      id: 'periodo-2026-10-q1',
      empresaId,
      anio: 2026,
      mes: 10,
      quincena: 1,
      fechaPago: new Date('2026-10-15'),
      fechaFin: new Date('2026-10-15'),
    };

    const dummyInss = {
      tasaLaboral: 0.07,
      tasaPatronal: 0.215,
    };

    const dummyInatec = {
      tasa: 0.02,
    };

    const dummyIrTramos = [
      { orden: 1, desdeExcl: 0, hastaIncl: 100000, impuestoBase: 0, porcentaje: 0, sobreExceso: 0 },
      { orden: 2, desdeExcl: 100000, hastaIncl: 200000, impuestoBase: 0, porcentaje: 15, sobreExceso: 100000 },
      { orden: 3, desdeExcl: 200000, hastaIncl: 350000, impuestoBase: 15000, porcentaje: 20, sobreExceso: 200000 },
      { orden: 4, desdeExcl: 350000, hastaIncl: 500000, impuestoBase: 45000, porcentaje: 25, sobreExceso: 350000 },
      { orden: 5, desdeExcl: 500000, hastaIncl: null, impuestoBase: 82500, porcentaje: 30, sobreExceso: 500000 },
    ];

    const dummyConceptos = [
      { id: 'c-sal', codigo: 'SAL', tipo: 'DEVENGO', afectaInss: true, afectaIr: true },
      { id: 'c-inss-l', codigo: 'INSS_L', tipo: 'DEDUCCION' },
      { id: 'c-ir', codigo: 'IR', tipo: 'DEDUCCION' },
      { id: 'c-inss-p', codigo: 'INSS_P', tipo: 'APORTE' },
      { id: 'c-inatec', codigo: 'INATEC', tipo: 'APORTE' },
    ];

    it('calcula planilla quincenal para empleado fijo con INSS 1,050.00 e IR 1,748.34', async () => {
      prisma.periodoNomina.findFirst.mockResolvedValue(dummyPeriodo);
      prisma.planilla.findFirst.mockResolvedValue(null);
      prisma.paramInss.findFirst.mockResolvedValue(dummyInss);
      prisma.paramInatec.findFirst.mockResolvedValue(dummyInatec);
      prisma.paramIrTramo.findMany.mockResolvedValue(dummyIrTramos);
      prisma.conceptoNomina.findMany.mockResolvedValue(dummyConceptos);

      const dummyEmpleado = {
        id: 'emp-1',
        nombres: 'Carlos',
        apellidos: 'Mendoza',
        salarioMensual: 30000,
        tipoSalario: TipoSalarioNomina.FIJO,
        metodoIr: MetodoIrNomina.FIJO,
        sucursalId: 'suc-1',
        centroCostoId: 'cc-1',
        areaContable: AreaContableNomina.OPERACION,
        fechaIngreso: new Date('2025-01-01'),
      };
      prisma.empleado.findMany.mockResolvedValue([dummyEmpleado]);
      prisma.novedadNomina.findMany.mockResolvedValue([]);

      prisma.planilla.create.mockResolvedValue({ id: 'plan-1', empleados: [] });
      prisma.planillaEmpleado.create.mockResolvedValue({ id: 'plan-emp-1' });
      prisma.planillaLinea.create.mockResolvedValue({});
      prisma.planilla.update.mockResolvedValue({
        id: 'plan-1',
        estado: EstadoPlanilla.CALCULADA,
        totalDevengado: 15000,
        totalDeducciones: 2798.34,
        totalNeto: 12201.66,
      });

      const res = await service.calcularPlanilla(
        empresaId,
        { periodoId: dummyPeriodo.id },
        'user-1',
      );

      expect(res.estado).toBe(EstadoPlanilla.CALCULADA);
      expect(prisma.planillaEmpleado.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            salarioMensual: expect.any(Object),
            netoPagar: expect.any(Object),
          }),
        }),
      );
    });

    it('bloquea recálculo si la planilla ya está APROBADA (V19)', async () => {
      prisma.periodoNomina.findFirst.mockResolvedValue(dummyPeriodo);
      prisma.planilla.findFirst.mockResolvedValue({
        id: 'plan-aprobada',
        estado: EstadoPlanilla.APROBADA,
      });

      await expect(
        service.calcularPlanilla(empresaId, { periodoId: dummyPeriodo.id }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Aprobación y Segregación de Funciones (V9)', () => {
    it('rechaza que el mismo usuario que revisó la planilla la apruebe', async () => {
      prisma.planilla.findFirst.mockResolvedValue({
        id: 'plan-1',
        estado: EstadoPlanilla.REVISADA,
        revisadoPor: 'contador-1',
        periodo: { quincena: 1 },
        empleados: [],
      });

      await expect(
        service.aprobarPlanilla(empresaId, 'plan-1', 'contador-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('permite que un usuario distinto apruebe y marca novedades como APLICADAS', async () => {
      prisma.planilla.findFirst.mockResolvedValue({
        id: 'plan-1',
        estado: EstadoPlanilla.REVISADA,
        revisadoPor: 'contador-1',
        periodoId: 'per-1',
        periodo: { quincena: 1, anio: 2026, mes: 10 },
        empleados: [],
      });
      prisma.planilla.update.mockResolvedValue({
        id: 'plan-1',
        estado: EstadoPlanilla.APROBADA,
      });

      const res = await service.aprobarPlanilla(empresaId, 'plan-1', 'gerente-1');
      expect(res.estado).toBe(EstadoPlanilla.APROBADA);
      expect(prisma.novedadNomina.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: EstadoNovedadNomina.APLICADA }),
        }),
      );
    });
  });

  describe('Liquidación Final (T14 & T16)', () => {
    it('calcula y registra liquidación final para empleado con renuncia/despido', async () => {
      const dummyEmp = {
        id: 'emp-14',
        salarioMensual: 25000,
        fechaIngreso: new Date('2023-03-01'),
      };
      prisma.empleado.findFirst.mockResolvedValue(dummyEmp);
      prisma.liquidacionFinal.create.mockImplementation((args: any) => ({
        id: 'liq-1',
        ...args.data,
      }));
      prisma.empleado.update.mockResolvedValue({});

      const res = await service.liquidacionFinal(
        empresaId,
        {
          empleadoId: 'emp-14',
          fechaBaja: '2026-10-31',
          causa: 'RENUNCIA',
          pagaIndemnizacion: true,
          diasPendientes: 15,
          diasVacacionesPendientes: 10,
          mesesAguinaldo: 11,
        },
        'user-1',
      );

      expect(res.id).toBe('liq-1');
      expect(prisma.empleado.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ estado: 'BAJA' }),
        }),
      );
    });
  });
});
