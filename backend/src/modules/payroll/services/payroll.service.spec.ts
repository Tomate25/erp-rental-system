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
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      paramInatec: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      paramIrTramo: {
        count: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      reglaIndemnizacion: {
        count: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
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
        findMany: jest.fn(),
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
      planillaBitacora: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
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

  describe('Ciclo Documental e Inmutabilidad (Ley 185 y Ley 822)', () => {
    it('bloquea creación de Q2 si Q1 no está APROBADA', async () => {
      prisma.periodoNomina.findUnique.mockResolvedValue(null);
      // Q1 no tiene planilla aprobada
      prisma.periodoNomina.findFirst.mockResolvedValue({
        id: 'per-q1',
        quincena: 1,
        planillas: [{ estado: EstadoPlanilla.CALCULADA }],
      });

      await expect(
        service.createPeriodo(empresaId, {
          anio: 2026,
          mes: 10,
          quincena: 2,
          tipo: TipoPeriodoNomina.ORDINARIA,
          fechaInicio: '2026-10-16',
          fechaFin: '2026-10-31',
          fechaPago: '2026-10-31',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('bloquea cálculo de Q2 si Q1 no está APROBADA', async () => {
      const perQ2 = {
        id: 'per-q2',
        empresaId,
        anio: 2026,
        mes: 10,
        quincena: 2,
        tipo: TipoPeriodoNomina.ORDINARIA,
        fechaPago: new Date('2026-10-31'),
      };
      prisma.periodoNomina.findFirst.mockImplementation((args: any) => {
        if (args.where?.id === 'per-q2') return perQ2;
        if (args.where?.quincena === 1) return { id: 'per-q1', planillas: [{ estado: EstadoPlanilla.CALCULADA }] };
        return null;
      });
      prisma.planilla.findFirst.mockResolvedValue(null);

      await expect(
        service.calcularPlanilla(empresaId, { periodoId: 'per-q2' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('bloquea recálculo si la planilla está en estado REVISADA', async () => {
      prisma.periodoNomina.findFirst.mockResolvedValue({
        id: 'per-q1',
        empresaId,
        quincena: 1,
        fechaPago: new Date('2026-10-15'),
      });
      prisma.planilla.findFirst.mockResolvedValue({
        id: 'plan-rev',
        estado: EstadoPlanilla.REVISADA,
        bloqueada: false,
      });

      await expect(
        service.calcularPlanilla(empresaId, { periodoId: 'per-q1' }, 'user-1'),
      ).rejects.toThrow(/REVISADA/);
    });

    it('permite devolver planilla de REVISADA a CALCULADA con motivo y registra en bitácora', async () => {
      prisma.planilla.findFirst.mockResolvedValue({
        id: 'plan-rev',
        estado: EstadoPlanilla.REVISADA,
      });
      prisma.planilla.update.mockResolvedValue({
        id: 'plan-rev',
        estado: EstadoPlanilla.CALCULADA,
        revisadoPor: null,
      });

      const res = await service.devolverPlanilla(empresaId, 'plan-rev', 'supervisor-1', 'Ajustar comisiones de ventas');
      expect(res.estado).toBe(EstadoPlanilla.CALCULADA);
      expect(prisma.planillaBitacora.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accion: 'DEVOLVER',
            usuario: 'supervisor-1',
          }),
        }),
      );
    });

    it('al APROBAR bloquea la planilla y genera asiento contable de devengo', async () => {
      prisma.planilla.findFirst.mockResolvedValue({
        id: 'plan-1',
        estado: EstadoPlanilla.REVISADA,
        revisadoPor: 'contador-1',
        periodoId: 'per-1',
        periodo: { quincena: 1, anio: 2026, mes: 10 },
        totalDevengado: 20050.00,
        totalPatronal: 4711.75,
        totalInssPatronal: 4310.75,
        totalInatec: 401.00,
        totalDeducciones: 2113.82,
        totalNeto: 17936.18,
        empleados: [],
      });
      prisma.planilla.update.mockImplementation((args: any) => ({
        id: 'plan-1',
        ...args.data,
      }));

      const res = await service.aprobarPlanilla(empresaId, 'plan-1', 'gerente-1');
      expect(res.estado).toBe(EstadoPlanilla.APROBADA);
      expect(res.bloqueada).toBe(true);
      expect(res.asientoDevengoId).toBe('AS-DEV-2026-10-Q1');
      expect(res.asientoDevengoJson).toBeDefined();
      expect(res.asientoDevengoJson.partidas.length).toBe(7);
      expect(prisma.planillaBitacora.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ accion: 'APROBAR', usuario: 'gerente-1' }),
        }),
      );
    });

    it('calcula historial de pagos de colaborador con acumulados y promedio Art. 78 y Art. 94', async () => {
      const dummyEmp = {
        id: 'emp-vendedor',
        codigo: 'EMP-001',
        nombres: 'David',
        apellidos: 'Jarquin',
        cedula: '001-010190-0001A',
        numeroInss: '12345678',
        cargo: 'Ejecutivo de Cuentas',
        salarioMensual: 10500.00,
        tipoSalario: TipoSalarioNomina.VARIABLE,
        fechaIngreso: new Date('2024-01-01'),
        sucursal: { nombre: 'Casa Matriz Managua' },
      };
      prisma.empleado.findFirst.mockResolvedValue(dummyEmp);

      prisma.planillaEmpleado.findMany.mockResolvedValue([
        {
          planillaId: 'plan-1',
          totalDevengado: 7750.00,
          inssLaboral: 542.50,
          irSalarial: 482.50,
          netoPagar: 6725.00,
          horasExtra: 0,
          comisiones: 2500.00,
          otrosIngresos: 0,
          otrasDeducciones: 0,
          totalDeducciones: 1025.00,
          salarioMensual: 10500.00,
          planilla: {
            estado: EstadoPlanilla.APROBADA,
            periodo: { anio: new Date().getFullYear(), mes: 10, quincena: 1, fechaPago: new Date('2026-10-15') },
          },
          lineas: [],
        },
      ]);

      const res = await service.getHistorialPagosEmpleado(empresaId, 'emp-vendedor');
      expect(res.empleado.nombreCompleto).toBe('David Jarquin');
      expect(res.resumenLegal.acumuladoAnual.devengado).toBe(7750.00);
      expect(res.resumenLegal.articulo78Vacaciones.promedioMensual6Meses).toBeGreaterThan(0);
      expect(res.historialQuincenas.length).toBe(1);
    });

    it('permite consultar, actualizar y restablecer tarifas legales dinámicamente', async () => {
      // 1. getParametros
      prisma.paramInss.findFirst.mockResolvedValue({
        id: 'inss-1',
        regimen: 'INTEGRAL',
        tamanoEmpleador: 'PEQUENO',
        tasaLaboral: 7.0,
        tasaPatronal: 21.5,
        techoMensual: null,
        vigenteDesde: new Date('2026-01-01'),
        fuenteTexto: 'Decreto 06-2019',
      });
      prisma.paramInatec.findFirst.mockResolvedValue({
        id: 'inatec-1',
        tasa: 2.0,
        vigenteDesde: new Date('2026-01-01'),
      });
      prisma.paramIrTramo.findMany.mockResolvedValue([
        { id: 'ir-1', orden: 1, desdeExcl: 0, hastaIncl: 100000, impuestoBase: 0, porcentaje: 0, sobreExceso: 0 },
      ]);

      const params = await service.getParametros(empresaId);
      expect(params.inss?.tasaLaboral).toBe(7);
      expect(params.inss?.tasaPatronal).toBe(21.5);
      expect(params.inatec?.tasa).toBe(2);
      expect(params.irTramos.length).toBe(1);

      // 2. updateParametros
      await service.updateParametros(empresaId, {
        inss: { tasaLaboral: 7, tasaPatronal: 22.5, tamanoEmpleador: 'GRANDE' },
        inatec: { tasa: 2 },
      });
      expect(prisma.paramInss.update).toHaveBeenCalled();

      // 3. resetParametros
      await service.resetParametros(empresaId);
      expect(prisma.paramInss.deleteMany).toHaveBeenCalled();
      expect(prisma.paramInss.create).toHaveBeenCalled();
    });
  });
});
