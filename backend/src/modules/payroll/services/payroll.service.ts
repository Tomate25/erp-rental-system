import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  EstadoPlanilla,
  EstadoPeriodoNomina,
  EstadoNovedadNomina,
  TipoPeriodoNomina,
  OrigenNovedadNomina,
  TipoProvisionNomina,
  EstadoLiquidacionFinal,
  Prisma,
} from '@prisma/client';
import {
  CreateEmpleadoDto,
  CreatePeriodoNominaDto,
  CreateNovedadNominaDto,
  CalcularPlanillaDto,
  CalcularLiquidacionDto,
} from '../dto/payroll.dto';
import {
  round2,
  round4,
  calcularHoraExtra,
  calcularIrMensualFijo,
  calcularIrMensualVariable,
  calcularIrQuincenal,
  calcularInssLaboral,
  calcularAportesPatronales,
  calcularProvisionesMes,
  calcularLiquidacionFinal as calcLiqFinal,
  DEFAULT_PARAM_INSS,
  DEFAULT_PARAM_INATEC,
  DEFAULT_PARAM_IR_TRAMOS,
  DEFAULT_PARAM_LABORAL,
} from '../utils/payroll-calculator';

@Injectable()
export class PayrollService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. CARGA INICIAL Y PARÁMETROS LEGALES
  // ==========================================

  async seedDefaultParameters(empresaId: string, userId = 'SISTEMA') {
    const ahora = new Date('2026-01-01');

    // 1.1 INSS
    const existingInss = await this.prisma.paramInss.findFirst({ where: { empresaId } });
    if (!existingInss) {
      await this.prisma.paramInss.create({
        data: {
          empresaId,
          regimen: 'INTEGRAL',
          tamanoEmpleador: 'PEQUENO',
          tasaLaboral: DEFAULT_PARAM_INSS.tasaLaboral,
          tasaPatronal: DEFAULT_PARAM_INSS.tasaPatronal,
          vigenteDesde: ahora,
          fuenteTexto: 'Decreto 06-2019 (Reforma Reglamento Seguridad Social Nicaragua)',
          fuenteUrl: 'https://www.serviciocontablenicaragua.com/obligaciones-del-empleador-en-nicaragua/',
          aprobadoPor: userId,
        },
      });
    }

    // 1.2 INATEC
    const existingInatec = await this.prisma.paramInatec.findFirst({ where: { empresaId } });
    if (!existingInatec) {
      await this.prisma.paramInatec.create({
        data: {
          empresaId,
          tasa: DEFAULT_PARAM_INATEC.tasa,
          vigenteDesde: ahora,
          fuenteTexto: 'Ley Orgánica del INATEC (Decreto 40-94)',
          fuenteUrl: 'https://legadmi.com/noticias/nomina-nicaragua-2026-inss-salario-minimo/',
          aprobadoPor: userId,
        },
      });
    }

    // 1.3 IR Tramos (Art. 23 Ley 822)
    const countIr = await this.prisma.paramIrTramo.count({ where: { empresaId } });
    if (countIr === 0) {
      for (const t of DEFAULT_PARAM_IR_TRAMOS) {
        await this.prisma.paramIrTramo.create({
          data: {
            empresaId,
            orden: t.orden,
            desdeExcl: t.desdeExcl,
            hastaIncl: t.hastaIncl,
            impuestoBase: t.impuestoBase,
            porcentaje: t.porcentaje,
            sobreExceso: t.sobreExceso,
            vigenteDesde: ahora,
            fuenteTexto: 'Ley 822 (Ley de Concertación Tributaria, Art. 23)',
            fuenteUrl: 'https://www.dgi.gob.ni/FAQ/periodo_fiscal_y_tarifa_del_im.htm',
            aprobadoPor: userId,
          },
        });
      }
    }

    // 1.4 Reglas de Indemnización (Art. 45 Código del Trabajo)
    const countIndem = await this.prisma.reglaIndemnizacion.count({ where: { empresaId } });
    if (countIndem === 0) {
      await this.prisma.reglaIndemnizacion.createMany({
        data: [
          {
            empresaId,
            desdeAnio: 0,
            hastaAnio: 3,
            diasPorAnio: 30,
            topeMeses: 5,
            vigenteDesde: ahora,
          },
          {
            empresaId,
            desdeAnio: 3,
            hastaAnio: null,
            diasPorAnio: 20,
            topeMeses: 5,
            vigenteDesde: ahora,
          },
        ],
      });
    }

    // 1.5 Conceptos de Nómina iniciales
    const conceptosBase = [
      { codigo: 'SAL', nombre: 'Salario Ordinario', tipo: 'DEVENGO', afectaInss: true, afectaInatec: true, afectaIr: true, metodoIr: 'ORDINARIO', afectaPromedioPrestaciones: true, orden: 1 },
      { codigo: 'HEX', nombre: 'Horas Extraordinarias', tipo: 'DEVENGO', afectaInss: true, afectaInatec: true, afectaIr: true, metodoIr: 'ORDINARIO', afectaPromedioPrestaciones: true, orden: 2 },
      { codigo: 'COM', nombre: 'Comisiones de Ventas', tipo: 'DEVENGO', afectaInss: true, afectaInatec: true, afectaIr: true, metodoIr: 'ORDINARIO', afectaPromedioPrestaciones: true, orden: 3 },
      { codigo: 'BON', nombre: 'Bonificaciones', tipo: 'DEVENGO', afectaInss: true, afectaInatec: true, afectaIr: true, metodoIr: 'OCASIONAL', afectaPromedioPrestaciones: false, orden: 4 },
      { codigo: 'VAC', nombre: 'Vacaciones Pagadas', tipo: 'DEVENGO', afectaInss: true, afectaInatec: true, afectaIr: true, metodoIr: 'OCASIONAL', afectaPromedioPrestaciones: false, orden: 5 },
      { codigo: 'INSS_L', nombre: 'INSS Laboral (7%)', tipo: 'DEDUCCION', afectaInss: false, afectaInatec: false, afectaIr: false, metodoIr: 'EXENTO', afectaPromedioPrestaciones: false, orden: 10 },
      { codigo: 'IR', nombre: 'Retención IR Salarial', tipo: 'DEDUCCION', afectaInss: false, afectaInatec: false, afectaIr: false, metodoIr: 'EXENTO', afectaPromedioPrestaciones: false, orden: 11 },
      { codigo: 'PREST', nombre: 'Deducción de Préstamo / Adelanto', tipo: 'DEDUCCION', afectaInss: false, afectaInatec: false, afectaIr: false, metodoIr: 'EXENTO', afectaPromedioPrestaciones: false, orden: 12 },
      { codigo: 'INSS_P', nombre: 'INSS Patronal (21.5%)', tipo: 'APORTE', afectaInss: false, afectaInatec: false, afectaIr: false, metodoIr: 'EXENTO', afectaPromedioPrestaciones: false, orden: 20 },
      { codigo: 'INATEC', nombre: 'Aporte INATEC (2%)', tipo: 'APORTE', afectaInss: false, afectaInatec: false, afectaIr: false, metodoIr: 'EXENTO', afectaPromedioPrestaciones: false, orden: 21 },
      { codigo: 'PROV_VAC', nombre: 'Provisión Vacaciones', tipo: 'PROVISION', afectaInss: false, afectaInatec: false, afectaIr: false, metodoIr: 'EXENTO', afectaPromedioPrestaciones: false, orden: 30 },
      { codigo: 'PROV_AGUI', nombre: 'Provisión Décimo Tercer Mes', tipo: 'PROVISION', afectaInss: false, afectaInatec: false, afectaIr: false, metodoIr: 'EXENTO', afectaPromedioPrestaciones: false, orden: 31 },
      { codigo: 'PROV_IND', nombre: 'Provisión Indemnización Art. 45', tipo: 'PROVISION', afectaInss: false, afectaInatec: false, afectaIr: false, metodoIr: 'EXENTO', afectaPromedioPrestaciones: false, orden: 32 },
    ];

    for (const c of conceptosBase) {
      await this.prisma.conceptoNomina.upsert({
        where: { empresaId_codigo: { empresaId, codigo: c.codigo } },
        update: {},
        create: {
          empresaId,
          codigo: c.codigo,
          nombre: c.nombre,
          tipo: c.tipo as any,
          afectaInss: c.afectaInss,
          afectaInatec: c.afectaInatec,
          afectaIr: c.afectaIr,
          metodoIr: c.metodoIr as any,
          afectaPromedioPrestaciones: c.afectaPromedioPrestaciones,
          ordenCalculo: c.orden,
        },
      });
    }

    return { ok: true, mensaje: 'Parámetros legales y conceptos iniciales sembrados con éxito' };
  }

  // ==========================================
  // 2. EXPEDIENTE DEL EMPLEADO
  // ==========================================

  async createEmpleado(empresaId: string, dto: CreateEmpleadoDto) {
    const existingCedula = await this.prisma.empleado.findFirst({
      where: { empresaId, cedula: dto.cedula },
    });
    if (existingCedula) {
      throw new BadRequestException(`Ya existe un empleado con la cédula ${dto.cedula}`);
    }

    const existingInss = await this.prisma.empleado.findFirst({
      where: { empresaId, numeroInss: dto.numeroInss },
    });
    if (existingInss) {
      throw new BadRequestException(`Ya existe un empleado con el número INSS ${dto.numeroInss}`);
    }

    const fechaIng = new Date(dto.fechaIngreso);

    const empleado = await this.prisma.empleado.create({
      data: {
        empresaId,
        codigo: dto.codigo,
        nombres: dto.nombres,
        apellidos: dto.apellidos,
        cedula: dto.cedula,
        numeroInss: dto.numeroInss,
        ruc: dto.ruc,
        email: dto.email,
        telefono: dto.telefono,
        direccion: dto.direccion,
        sucursalId: dto.sucursalId,
        centroCostoId: dto.centroCostoId,
        areaContable: dto.areaContable,
        cargo: dto.cargo,
        tipoContrato: dto.tipoContrato,
        fechaIngreso: fechaIng,
        tipoSalario: dto.tipoSalario,
        metodoIr: dto.metodoIr,
        frecuenciaPago: dto.frecuenciaPago,
        salarioMensual: dto.salarioMensual,
        cuentasBancarias: dto.bancoNombre && dto.numeroCuenta
          ? {
              create: {
                banco: dto.bancoNombre,
                numeroCuenta: dto.numeroCuenta,
                esPrincipal: true,
              },
            }
          : undefined,
        salarioHistorial: {
          create: {
            salarioMensual: dto.salarioMensual,
            cargo: dto.cargo,
            vigenteDesde: fechaIng,
            motivo: 'Salario inicial de contratación',
          },
        },
      },
      include: {
        cuentasBancarias: true,
        salarioHistorial: true,
      },
    });

    return empleado;
  }

  async listEmpleados(empresaId: string, filtro?: { estado?: any; sucursalId?: string }) {
    return this.prisma.empleado.findMany({
      where: {
        empresaId,
        ...(filtro?.estado ? { estado: filtro.estado } : {}),
        ...(filtro?.sucursalId ? { sucursalId: filtro.sucursalId } : {}),
      },
      include: {
        sucursal: { select: { id: true, nombre: true } },
        cuentasBancarias: true,
      },
      orderBy: { nombres: 'asc' },
    });
  }

  async getEmpleado(empresaId: string, id: string) {
    const emp = await this.prisma.empleado.findFirst({
      where: { id, empresaId },
      include: {
        sucursal: true,
        cuentasBancarias: true,
        salarioHistorial: { orderBy: { vigenteDesde: 'desc' } },
        movimientosVacaciones: { orderBy: { fecha: 'desc' } },
        prestamos: { include: { cuotasDetalle: true } },
      },
    });
    if (!emp) throw new NotFoundException('Empleado no encontrado');
    return emp;
  }

  // ==========================================
  // 3. PERÍODOS DE NÓMINA
  // ==========================================

  async createPeriodo(empresaId: string, dto: CreatePeriodoNominaDto) {
    const existing = await this.prisma.periodoNomina.findUnique({
      where: {
        empresaId_anio_mes_quincena_tipo: {
          empresaId,
          anio: dto.anio,
          mes: dto.mes,
          quincena: dto.quincena ?? null as any,
          tipo: dto.tipo ?? TipoPeriodoNomina.ORDINARIA,
        },
      },
    });
    if (existing) {
      throw new BadRequestException('El período ya se encuentra registrado');
    }

    return this.prisma.periodoNomina.create({
      data: {
        empresaId,
        anio: dto.anio,
        mes: dto.mes,
        quincena: dto.quincena,
        tipo: dto.tipo ?? TipoPeriodoNomina.ORDINARIA,
        fechaInicio: new Date(dto.fechaInicio),
        fechaFin: new Date(dto.fechaFin),
        fechaPago: new Date(dto.fechaPago),
      },
    });
  }

  async listPeriodos(empresaId: string) {
    return this.prisma.periodoNomina.findMany({
      where: { empresaId },
      include: {
        planillas: {
          include: {
            empleados: {
              include: {
                empleado: true,
                lineas: {
                  include: {
                    concepto: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { quincena: 'desc' }],
    });
  }

  // ==========================================
  // 4. NOVEDADES DE NÓMINA
  // ==========================================

  async createNovedad(empresaId: string, dto: CreateNovedadNominaDto) {
    const concepto = await this.prisma.conceptoNomina.findUnique({
      where: { empresaId_codigo: { empresaId, codigo: dto.conceptoCodigo } },
    });
    if (!concepto) {
      throw new NotFoundException(`Concepto ${dto.conceptoCodigo} no existe en la empresa`);
    }

    return this.prisma.novedadNomina.create({
      data: {
        empresaId,
        empleadoId: dto.empleadoId,
        periodoDestinoId: dto.periodoDestinoId,
        conceptoId: concepto.id,
        cantidad: dto.cantidad ? new Prisma.Decimal(dto.cantidad) : null,
        monto: new Prisma.Decimal(dto.monto),
        origen: dto.origen ?? OrigenNovedadNomina.MANUAL,
        referenciaId: dto.referenciaId,
        observaciones: dto.observaciones,
      },
    });
  }

  // ==========================================
  // 5. CÁLCULO DE PLANILLA (QUINCENAL / MENSUAL)
  // ==========================================

  async calcularPlanilla(empresaId: string, dto: CalcularPlanillaDto, userId = 'SISTEMA') {
    const periodo = await this.prisma.periodoNomina.findFirst({
      where: { id: dto.periodoId, empresaId },
    });
    if (!periodo) throw new NotFoundException('Período de nómina no encontrado');

    let planilla = await this.prisma.planilla.findFirst({
      where: {
        periodoId: periodo.id,
        empresaId,
        sucursalId: dto.sucursalId ?? null,
      },
      include: { empleados: true },
    });

    if (planilla && (planilla.estado === EstadoPlanilla.APROBADA || planilla.estado === EstadoPlanilla.PAGADA)) {
      throw new BadRequestException('No se puede recalcular una planilla que ya está APROBADA o PAGADA (V19)');
    }

    // Parámetros legales vigentes a la fecha de pago
    const fechaRef = periodo.fechaPago;

    const inssParam = await this.prisma.paramInss.findFirst({
      where: {
        empresaId,
        vigenteDesde: { lte: fechaRef },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: fechaRef } }],
      },
      orderBy: { vigenteDesde: 'desc' },
    });

    const inatecParam = await this.prisma.paramInatec.findFirst({
      where: {
        empresaId,
        vigenteDesde: { lte: fechaRef },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: fechaRef } }],
      },
      orderBy: { vigenteDesde: 'desc' },
    });

    const irTramos = await this.prisma.paramIrTramo.findMany({
      where: {
        empresaId,
        vigenteDesde: { lte: fechaRef },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: fechaRef } }],
      },
      orderBy: { orden: 'asc' },
    });

    if (!inssParam || !inatecParam || irTramos.length === 0) {
      throw new BadRequestException('Faltan parámetros legales vigentes (INSS, INATEC o IR) para la fecha de cálculo (V5)');
    }

    const tasaInssLaboral = Number(inssParam.tasaLaboral);
    const tasaInssPatronal = Number(inssParam.tasaPatronal);
    const tasaInatec = Number(inatecParam.tasa);

    const irTramosInput = irTramos.map((t) => ({
      orden: t.orden,
      desdeExcl: Number(t.desdeExcl),
      hastaIncl: t.hastaIncl !== null ? Number(t.hastaIncl) : null,
      impuestoBase: Number(t.impuestoBase),
      porcentaje: Number(t.porcentaje),
      sobreExceso: Number(t.sobreExceso),
    }));

    // Conceptos del sistema
    const conceptos = await this.prisma.conceptoNomina.findMany({ where: { empresaId } });
    const conceptoMap = new Map(conceptos.map((c) => [c.codigo, c]));

    // Empleados activos
    const empleados = await this.prisma.empleado.findMany({
      where: {
        empresaId,
        estado: 'ACTIVO',
        ...(dto.sucursalId ? { sucursalId: dto.sucursalId } : {}),
      },
      include: {
        cuentasBancarias: true,
      },
    });

    // Si ya existe planilla previa en BORRADOR/CALCULADA, limpiamos detalles previos
    if (planilla) {
      await this.prisma.planillaLinea.deleteMany({
        where: { planillaEmpleado: { planillaId: planilla.id } },
      });
      await this.prisma.planillaEmpleado.deleteMany({
        where: { planillaId: planilla.id },
      });
    } else {
      planilla = await this.prisma.planilla.create({
        data: {
          empresaId,
          periodoId: periodo.id,
          sucursalId: dto.sucursalId ?? null,
          estado: EstadoPlanilla.BORRADOR,
        },
        include: { empleados: true },
      });
    }

    let sumaTotalDevengado = 0;
    let sumaTotalDeducciones = 0;
    let sumaTotalNeto = 0;
    let sumaTotalPatronal = 0;

    for (const emp of empleados) {
      const salarioMensual = Number(emp.salarioMensual);
      const diasTrabajados = 15.0; // Período quincenal regular
      const salarioQuincena = round2(salarioMensual / 2);

      // Novedades para este empleado y período (pendientes o aplicadas si se recalcula)
      const novedades = await this.prisma.novedadNomina.findMany({
        where: {
          empleadoId: emp.id,
          periodoDestinoId: periodo.id,
          estado: { in: [EstadoNovedadNomina.PENDIENTE, EstadoNovedadNomina.APLICADA] },
        },
        include: { concepto: true },
      });

      // Si es quincena 1 (del 15), verificar si existen liquidaciones de comisiones aprobadas para este empleado
      const novedadesCom = novedades.filter((n) => n.concepto?.codigo === 'COM');
      if (periodo.quincena === 1 && novedadesCom.length === 0 && this.prisma.vendedor?.findFirst) {
        const vendedor = await this.prisma.vendedor.findFirst({
          where: { empleadoId: emp.id, empresaId },
        });
        if (vendedor && this.prisma.liquidacionComision?.findFirst) {
          const liqCom = await this.prisma.liquidacionComision.findFirst({
            where: {
              empresaId,
              vendedorId: vendedor.id,
              estado: 'APROBADO',
              OR: [{ nominaPeriodoId: periodo.id }, { nominaPeriodoId: null }],
            },
            orderBy: { createdAt: 'desc' },
          });
          if (liqCom && Number(liqCom.comisionTotal) > 0) {
            let conceptoCom = conceptoMap.get('COM');
            if (conceptoCom && this.prisma.novedadNomina?.create) {
              const nuevaNov = await this.prisma.novedadNomina.create({
                data: {
                  empresaId,
                  empleadoId: emp.id,
                  periodoDestinoId: periodo.id,
                  conceptoId: conceptoCom.id,
                  monto: liqCom.comisionTotal,
                  origen: OrigenNovedadNomina.COMISIONES,
                  referenciaId: liqCom.id,
                  periodoDevengo: `${periodo.anio}-${String(periodo.mes).padStart(2, '0')}`,
                  estado: EstadoNovedadNomina.PENDIENTE,
                },
                include: { concepto: true },
              });
              novedades.push(nuevaNov);
              if (this.prisma.liquidacionComision?.update) {
                await this.prisma.liquidacionComision.update({
                  where: { id: liqCom.id },
                  data: { nominaPeriodoId: periodo.id },
                });
              }
            }
          }
        }
      }

      // Líneas acumuladas
      const lineasCalculadas: Array<{
        conceptoId: string;
        cantidad?: number;
        base?: number;
        tasa?: number;
        monto: number;
        referenciaTipo?: string;
        referenciaId?: string;
      }> = [];

      // 1. Salario ordinario (soporta SAL, SAL_ORD o BASICO)
      const conceptoSal = conceptoMap.get('SAL') || conceptoMap.get('SAL_ORD') || conceptoMap.get('BASICO');
      if (conceptoSal) {
        lineasCalculadas.push({
          conceptoId: conceptoSal.id,
          cantidad: diasTrabajados,
          base: salarioMensual,
          monto: salarioQuincena,
        });
      }

      // 2. Procesar novedades de devengo (Horas extra, comisiones, bonos)
      let sumaDevengosNovedades = 0;
      let devengadoGravableInss = salarioQuincena;
      let devengadoGravableIr = salarioQuincena;

      for (const nov of novedades) {
        const montoNov = Number(nov.monto);
        if (nov.concepto.tipo === 'DEVENGO') {
          sumaDevengosNovedades += montoNov;
          if (nov.concepto.afectaInss) devengadoGravableInss += montoNov;
          if (nov.concepto.afectaIr) devengadoGravableIr += montoNov;

          lineasCalculadas.push({
            conceptoId: nov.conceptoId,
            cantidad: nov.cantidad ? Number(nov.cantidad) : undefined,
            monto: montoNov,
            referenciaTipo: nov.origen,
            referenciaId: nov.referenciaId ?? undefined,
          });
        }
      }

      const totalDevengado = round2(salarioQuincena + sumaDevengosNovedades);

      // 3. INSS Laboral (7%)
      const inssLaboral = calcularInssLaboral(devengadoGravableInss, tasaInssLaboral);
      const conceptoInssL = conceptoMap.get('INSS_L');
      if (conceptoInssL) {
        lineasCalculadas.push({
          conceptoId: conceptoInssL.id,
          base: devengadoGravableInss,
          tasa: tasaInssLaboral,
          monto: inssLaboral,
        });
      }

      // 4. IR Salarial (Ley 822 Art. 23 - Fijo o Salario Variable con Comisiones)
      let irQuincena = 0;
      const tieneDevengosVariables = sumaDevengosNovedades > 0;
      if (emp.metodoIr === 'FIJO' && !tieneDevengosVariables) {
        const irResult = calcularIrMensualFijo(salarioMensual, round2(salarioMensual * tasaInssLaboral), irTramosInput);
        const { irQ1, irQ2 } = calcularIrQuincenal(irResult.irMes, totalDevengado, salarioMensual);
        irQuincena = periodo.quincena === 1 ? irQ1 : irQ2;
      } else {
        // Ingresos variables (comisiones en Q1, horas extras): recalculamos el IR en base al mes proyectado
        const salarioBrutoMes = round2(salarioMensual + sumaDevengosNovedades);
        const inssMes = round2(salarioBrutoMes * tasaInssLaboral);
        const irResult = calcularIrMensualFijo(salarioBrutoMes, inssMes, irTramosInput);
        const { irQ1, irQ2 } = calcularIrQuincenal(irResult.irMes, totalDevengado, salarioBrutoMes);
        irQuincena = periodo.quincena === 1 ? irQ1 : irQ2;
      }

      const conceptoIr = conceptoMap.get('IR');
      if (conceptoIr && irQuincena > 0) {
        lineasCalculadas.push({
          conceptoId: conceptoIr.id,
          base: devengadoGravableIr,
          monto: irQuincena,
        });
      }

      // 5. Deducciones de préstamos y novedades manuales de deducción
      let sumaOtrasDeducciones = 0;
      for (const nov of novedades) {
        if (nov.concepto.tipo === 'DEDUCCION') {
          const montoDed = Number(nov.monto);
          sumaOtrasDeducciones += montoDed;
          lineasCalculadas.push({
            conceptoId: nov.conceptoId,
            monto: montoDed,
            referenciaTipo: nov.origen,
            referenciaId: nov.referenciaId ?? undefined,
          });
        }
      }

      const totalDeducciones = round2(inssLaboral + irQuincena + sumaOtrasDeducciones);
      const netoPagar = round2(totalDevengado - totalDeducciones);

      if (netoPagar < 0) {
        throw new BadRequestException(
          `El empleado ${emp.nombres} ${emp.apellidos} resulta con neto negativo (${netoPagar}). Se violó regla V6.`,
        );
      }

      // 6. Aportes Patronales (INSS Patronal 21.5% e INATEC 2%)
      const patronalRes = calcularAportesPatronales(devengadoGravableInss, tasaInssPatronal, tasaInatec);

      const conceptoInssP = conceptoMap.get('INSS_P');
      if (conceptoInssP) {
        lineasCalculadas.push({
          conceptoId: conceptoInssP.id,
          base: devengadoGravableInss,
          tasa: tasaInssPatronal,
          monto: patronalRes.inssPatronal,
        });
      }

      const conceptoInatec = conceptoMap.get('INATEC');
      if (conceptoInatec) {
        lineasCalculadas.push({
          conceptoId: conceptoInatec.id,
          base: devengadoGravableInss,
          tasa: tasaInatec,
          monto: patronalRes.inatec,
        });
      }

      // Crear planilla_empleado
      const planEmp = await this.prisma.planillaEmpleado.create({
        data: {
          planillaId: planilla.id,
          empleadoId: emp.id,
          salarioMensual: new Prisma.Decimal(salarioMensual),
          sucursalId: emp.sucursalId,
          centroCostoId: emp.centroCostoId,
          areaContable: emp.areaContable,
          metodoIr: emp.metodoIr,
          diasTrabajados: new Prisma.Decimal(diasTrabajados),
          snapshotTasas: {
            tasaInssLaboral,
            tasaInssPatronal,
            tasaInatec,
          },
          totalDevengado: new Prisma.Decimal(totalDevengado),
          totalDeducciones: new Prisma.Decimal(totalDeducciones),
          netoPagar: new Prisma.Decimal(netoPagar),
          costoPatronal: new Prisma.Decimal(patronalRes.totalPatronal),
        },
      });

      // Crear líneas
      for (const lin of lineasCalculadas) {
        await this.prisma.planillaLinea.create({
          data: {
            planillaEmpleadoId: planEmp.id,
            conceptoId: lin.conceptoId,
            cantidad: lin.cantidad !== undefined ? new Prisma.Decimal(lin.cantidad) : null,
            base: lin.base !== undefined ? new Prisma.Decimal(lin.base) : null,
            tasa: lin.tasa !== undefined ? new Prisma.Decimal(lin.tasa) : null,
            monto: new Prisma.Decimal(lin.monto),
            referenciaTipo: lin.referenciaTipo,
            referenciaId: lin.referenciaId,
          },
        });
      }

      // Si es quincena 2, acumular provisiones del mes (true-up)
      if (periodo.quincena === 2) {
        const fechaIng = emp.fechaIngreso;
        const diffYears = (periodo.fechaFin.getTime() - fechaIng.getTime()) / (365.25 * 24 * 3600 * 1000);

        const prov = calcularProvisionesMes({
          tipoSalario: emp.tipoSalario,
          salarioMes: salarioMensual,
          promedioUltimos6M: salarioMensual,
          maxUltimos6M: salarioMensual,
          antiguedadAnios: Math.max(0, diffYears),
          mesesEnPeriodoAguinaldo: periodo.mes,
          saldoProvisionAguiPrevio: 0,
          saldoProvisionIndPrevio: 0,
        });

        // Registrar saldos en provision_saldo
        await this.prisma.provisionSaldo.upsert({
          where: {
            empleadoId_tipo_anio_mes: {
              empleadoId: emp.id,
              tipo: TipoProvisionNomina.VACACIONES,
              anio: periodo.anio,
              mes: periodo.mes,
            },
          },
          update: {
            baseUsada: new Prisma.Decimal(prov.vacaciones.base),
            provisionMes: new Prisma.Decimal(prov.vacaciones.provisionMes),
            saldo: new Prisma.Decimal(prov.vacaciones.provisionMes),
          },
          create: {
            empleadoId: emp.id,
            tipo: TipoProvisionNomina.VACACIONES,
            anio: periodo.anio,
            mes: periodo.mes,
            baseUsada: new Prisma.Decimal(prov.vacaciones.base),
            requeridoAcumulado: new Prisma.Decimal(prov.vacaciones.provisionMes),
            provisionMes: new Prisma.Decimal(prov.vacaciones.provisionMes),
            saldo: new Prisma.Decimal(prov.vacaciones.provisionMes),
          },
        });
      }

      sumaTotalDevengado += totalDevengado;
      sumaTotalDeducciones += totalDeducciones;
      sumaTotalNeto += netoPagar;
      sumaTotalPatronal += patronalRes.totalPatronal;
    }

    // Actualizar totales de planilla
    const planillaFinal = await this.prisma.planilla.update({
      where: { id: planilla.id },
      data: {
        estado: EstadoPlanilla.CALCULADA,
        totalDevengado: new Prisma.Decimal(round2(sumaTotalDevengado)),
        totalDeducciones: new Prisma.Decimal(round2(sumaTotalDeducciones)),
        totalNeto: new Prisma.Decimal(round2(sumaTotalNeto)),
        totalPatronal: new Prisma.Decimal(round2(sumaTotalPatronal)),
        calculadoEn: new Date(),
      },
      include: {
        empleados: {
          include: {
            empleado: true,
            lineas: { include: { concepto: true } },
          },
        },
      },
    });

    return planillaFinal;
  }

  // ==========================================
  // 6. FLUJO DE REVISIÓN Y APROBACIÓN
  // ==========================================

  async revisarPlanilla(empresaId: string, planillaId: string, userId: string) {
    const planilla = await this.prisma.planilla.findFirst({
      where: { id: planillaId, empresaId },
    });
    if (!planilla) throw new NotFoundException('Planilla no encontrada');
    if (planilla.estado !== EstadoPlanilla.CALCULADA) {
      throw new BadRequestException('Solo una planilla en estado CALCULADA puede pasar a REVISADA');
    }

    return this.prisma.planilla.update({
      where: { id: planilla.id },
      data: {
        estado: EstadoPlanilla.REVISADA,
        revisadoPor: userId,
        revisadoEn: new Date(),
      },
    });
  }

  async aprobarPlanilla(empresaId: string, planillaId: string, userId: string) {
    const planilla = await this.prisma.planilla.findFirst({
      where: { id: planillaId, empresaId },
      include: {
        periodo: true,
        empleados: { include: { lineas: true } },
      },
    });
    if (!planilla) throw new NotFoundException('Planilla no encontrada');
    if (planilla.estado === EstadoPlanilla.BORRADOR) {
      planilla = await this.calcularPlanilla(empresaId, { periodoId: planilla.periodoId }, userId);
    }
    if (planilla.estado !== EstadoPlanilla.REVISADA && planilla.estado !== EstadoPlanilla.CALCULADA) {
      throw new BadRequestException('La planilla debe estar CALCULADA o REVISADA para ser aprobada');
    }

    // Segregación de funciones (V9)
    if (planilla.revisadoPor && planilla.revisadoPor === userId) {
      throw new BadRequestException('Quien aprueba la planilla debe ser distinto de quien la revisó (V9)');
    }

    // 1. Marcar novedades como APLICADAS
    await this.prisma.novedadNomina.updateMany({
      where: {
        periodoDestinoId: planilla.periodoId,
        estado: EstadoNovedadNomina.PENDIENTE,
      },
      data: {
        estado: EstadoNovedadNomina.APLICADA,
        aprobadoPor: userId,
      },
    });

    // 2. Si quincena 2, guardar acumulado_ir para el mes
    if (planilla.periodo.quincena === 2) {
      for (const empPlan of planilla.empleados) {
        const lineaIr = empPlan.lineas.find((l) => l.conceptoId && Number(l.monto) > 0);
        const irMonto = lineaIr ? Number(lineaIr.monto) : 0;

        await this.prisma.acumuladoIr.upsert({
          where: {
            empleadoId_anio_mes: {
              empleadoId: empPlan.empleadoId,
              anio: planilla.periodo.anio,
              mes: planilla.periodo.mes,
            },
          },
          update: {
            rentaBruta: empPlan.totalDevengado,
            rentaNeta: empPlan.netoPagar,
            irRetenidoMes: new Prisma.Decimal(irMonto),
          },
          create: {
            empleadoId: empPlan.empleadoId,
            anio: planilla.periodo.anio,
            mes: planilla.periodo.mes,
            rentaBruta: empPlan.totalDevengado,
            inssLaboral: new Prisma.Decimal(0),
            rentaNeta: empPlan.netoPagar,
            rentaNetaAcumulada: empPlan.netoPagar,
            mesesTranscurridos: planilla.periodo.mes,
            irAnualProyectado: new Prisma.Decimal(0),
            irRetenidoMes: new Prisma.Decimal(irMonto),
            irRetenidoAcumulado: new Prisma.Decimal(irMonto),
          },
        });
      }
    }

    return this.prisma.planilla.update({
      where: { id: planilla.id },
      data: {
        estado: EstadoPlanilla.APROBADA,
        aprobadoPor: userId,
        aprobadoEn: new Date(),
      },
    });
  }

  async marcarPagada(empresaId: string, planillaId: string, userId: string) {
    const planilla = await this.prisma.planilla.findFirst({
      where: { id: planillaId, empresaId },
    });
    if (!planilla) throw new NotFoundException('Planilla no encontrada');
    if (planilla.estado !== EstadoPlanilla.APROBADA) {
      throw new BadRequestException('Solo una planilla APROBADA puede marcarse como PAGADA');
    }

    return this.prisma.planilla.update({
      where: { id: planilla.id },
      data: {
        estado: EstadoPlanilla.PAGADA,
        pagadoEn: new Date(),
      },
    });
  }

  // ==========================================
  // 7. LIQUIDACIÓN FINAL AL TERMINAR CONTRATO
  // ==========================================

  async liquidacionFinal(empresaId: string, dto: CalcularLiquidacionDto, userId = 'SISTEMA') {
    const emp = await this.prisma.empleado.findFirst({
      where: { id: dto.empleadoId, empresaId },
    });
    if (!emp) throw new NotFoundException('Empleado no encontrado');

    const fechaBaja = new Date(dto.fechaBaja);
    const fechaIng = emp.fechaIngreso;

    // Antigüedad en años exacta (4 decimales)
    const antiguedadExacta = round4((fechaBaja.getTime() - fechaIng.getTime()) / (365.25 * 24 * 3600 * 1000));
    const salarioBase = Number(emp.salarioMensual);

    const calc = calcLiqFinal({
      salarioMensual: salarioBase,
      baseVacaciones: salarioBase,
      baseAguinaldo: salarioBase,
      baseIndemnizacion: salarioBase,
      diasPendientes: dto.diasPendientes ?? 0,
      diasVacacionesPendientes: dto.diasVacacionesPendientes ?? 0,
      mesesAguinaldo: dto.mesesAguinaldo ?? 0,
      antiguedadAnios: antiguedadExacta,
      pagaIndemnizacion: dto.pagaIndemnizacion,
      deduccionPrestamos: dto.deduccionPrestamos ?? 0,
      deduccionOtras: dto.deduccionOtras ?? 0,
    });

    const liquidacion = await this.prisma.liquidacionFinal.create({
      data: {
        empleadoId: emp.id,
        fechaBaja,
        causa: dto.causa,
        antiguedadAnios: new Prisma.Decimal(antiguedadExacta),
        salarioBaseIndemnizacion: new Prisma.Decimal(salarioBase),
        diasVacacionesPendientes: new Prisma.Decimal(dto.diasVacacionesPendientes ?? 0),
        mesesAguinaldo: new Prisma.Decimal(dto.mesesAguinaldo ?? 0),
        montoSalarioPendiente: new Prisma.Decimal(calc.salarioPendiente),
        montoVacaciones: new Prisma.Decimal(calc.montoVacaciones),
        montoAguinaldo: new Prisma.Decimal(calc.montoAguinaldo),
        montoIndemnizacion: new Prisma.Decimal(calc.montoIndemnizacion),
        montoTotalDevengado: new Prisma.Decimal(calc.totalDevengado),
        deduccionInss: new Prisma.Decimal(calc.deduccionInss),
        deduccionIr: new Prisma.Decimal(calc.deduccionIr),
        deduccionPrestamos: new Prisma.Decimal(calc.deduccionPrestamos),
        montoNetoPagar: new Prisma.Decimal(calc.netoPagar),
        estado: EstadoLiquidacionFinal.BORRADOR,
        observaciones: dto.observaciones,
      },
      include: {
        empleado: true,
      },
    });

    // Actualizar estado del empleado a BAJA
    await this.prisma.empleado.update({
      where: { id: emp.id },
      data: {
        estado: 'BAJA',
        fechaBaja,
      },
    });

    return liquidacion;
  }

  // ==========================================
  // 8. COLILLA DE PAGO
  // ==========================================

  async getColilla(empresaId: string, planillaEmpleadoId: string) {
    const planEmp = await this.prisma.planillaEmpleado.findFirst({
      where: {
        id: planillaEmpleadoId,
        planilla: { empresaId },
      },
      include: {
        empleado: {
          include: { sucursal: true, cuentasBancarias: true },
        },
        planilla: {
          include: { periodo: true, empresa: true },
        },
        lineas: {
          include: { concepto: true },
          orderBy: { concepto: { ordenCalculo: 'asc' } },
        },
      },
    });
    if (!planEmp) throw new NotFoundException('Comprobante de pago (colilla) no encontrado');

    const devengos = planEmp.lineas.filter((l) => l.concepto.tipo === 'DEVENGO');
    const deducciones = planEmp.lineas.filter((l) => l.concepto.tipo === 'DEDUCCION');
    const aportesPatronales = planEmp.lineas.filter((l) => l.concepto.tipo === 'APORTE');
    const provisiones = planEmp.lineas.filter((l) => l.concepto.tipo === 'PROVISION');

    const totalProvisiones = provisiones.reduce((sum, p) => sum + Number(p.monto), 0);

    return {
      id: planEmp.id,
      empresa: {
        nombre: planEmp.planilla.empresa?.nombre || 'BM Construcciones S.A.',
        rfc: planEmp.planilla.empresa?.rfc || 'RME260723AAA',
        direccion: planEmp.planilla.empresa?.direccion || 'Km 9.5 Carretera Masaya, Managua, Nicaragua',
        telefono: planEmp.planilla.empresa?.telefono || '+505 2222-2222',
        email: planEmp.planilla.empresa?.email || 'recursoshumanos@bmconstrucciones.com',
      },
      empleado: {
        codigo: planEmp.empleado.codigo,
        nombreCompleto: `${planEmp.empleado.nombres} ${planEmp.empleado.apellidos}`,
        nombres: planEmp.empleado.nombres,
        apellidos: planEmp.empleado.apellidos,
        cedula: planEmp.empleado.cedula,
        numeroInss: planEmp.empleado.numeroInss,
        cargo: planEmp.empleado.cargo,
        sucursal: planEmp.empleado.sucursal?.nombre ?? 'Casa Matriz Managua',
        areaContable: planEmp.areaContable,
        fechaIngreso: planEmp.empleado.fechaIngreso,
        formaPago: planEmp.empleado.formaPago,
        banco: planEmp.empleado.cuentasBancarias?.[0]?.banco || 'BAC Credomatic',
        numeroCuenta: planEmp.empleado.cuentasBancarias?.[0]?.numeroCuenta || 'N/A',
        diasTrabajados: Number(planEmp.diasTrabajados || 15),
      },
      periodo: {
        anio: planEmp.planilla.periodo.anio,
        mes: planEmp.planilla.periodo.mes,
        quincena: planEmp.planilla.periodo.quincena,
        tipo: planEmp.planilla.periodo.tipo,
        fechaInicio: planEmp.planilla.periodo.fechaInicio,
        fechaFin: planEmp.planilla.periodo.fechaFin,
        fechaPago: planEmp.planilla.periodo.fechaPago,
      },
      totales: {
        salarioMensual: Number(planEmp.salarioMensual),
        salarioQuincenal: Number(planEmp.salarioMensual) / 2,
        totalDevengado: Number(planEmp.totalDevengado),
        totalDeducciones: Number(planEmp.totalDeducciones),
        netoPagar: Number(planEmp.netoPagar),
        costoPatronal: Number(planEmp.costoPatronal),
        totalProvisiones,
        costoTotalEmpresa: Number(planEmp.totalDevengado) + Number(planEmp.costoPatronal) + totalProvisiones,
      },
      devengos: devengos.map((d) => ({
        codigo: d.concepto.codigo,
        nombre: d.concepto.nombre,
        monto: Number(d.monto),
        cantidad: d.cantidad ? Number(d.cantidad) : null,
      })),
      deducciones: deducciones.map((d) => ({
        codigo: d.concepto.codigo,
        nombre: d.concepto.nombre,
        monto: Number(d.monto),
      })),
      aportesPatronales: aportesPatronales.map((a) => ({
        codigo: a.concepto.codigo,
        nombre: a.concepto.nombre,
        monto: Number(a.monto),
      })),
      provisiones: provisiones.map((p) => ({
        codigo: p.concepto.codigo,
        nombre: p.concepto.nombre,
        monto: Number(p.monto),
      })),
    };
  }
}
