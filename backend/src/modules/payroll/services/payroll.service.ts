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
  EstadoCotizacion,
  TipoFactura,
  EstadoFactura,
  Prisma,
} from '@prisma/client';
import {
  CreateEmpleadoDto,
  UpdateEmpleadoDto,
  CreatePeriodoNominaDto,
  CreateNovedadNominaDto,
  CalcularPlanillaDto,
  CalcularLiquidacionDto,
  FiltroHistorialPlanillasDto,
  UpdateParametrosNominaDto,
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

  /**
   * Registra una acción en la bitácora documental de la planilla (Ley 185 y Ley 822)
   */
  async registrarBitacora(
    planillaId: string,
    accion: string,
    usuario: string,
    comentario?: string,
    totalesAntes?: any,
    totalesDespues?: any,
  ) {
    try {
      if (this.prisma.planillaBitacora?.create) {
        return await this.prisma.planillaBitacora.create({
          data: {
            planillaId,
            accion,
            usuario: usuario || 'SISTEMA',
            comentario: comentario ?? null,
            totalesAntes: totalesAntes ?? undefined,
            totalesDespues: totalesDespues ?? undefined,
          },
        });
      }
    } catch (error) {
      console.warn(`[PayrollService] No se pudo registrar evento de bitacora para planilla ${planillaId}:`, error);
    }
  }

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

  async getParametros(empresaId: string) {
    const inss = await this.prisma.paramInss.findFirst({
      where: { empresaId },
      orderBy: { vigenteDesde: 'desc' },
    });
    const inatec = await this.prisma.paramInatec.findFirst({
      where: { empresaId },
      orderBy: { vigenteDesde: 'desc' },
    });
    const irTramos = await this.prisma.paramIrTramo.findMany({
      where: { empresaId },
      orderBy: { orden: 'asc' },
    });
    const reglasIndemnizacion = await this.prisma.reglaIndemnizacion.findMany({
      where: { empresaId },
      orderBy: { desdeAnio: 'asc' },
    });

    return {
      inss: inss
        ? {
            id: inss.id,
            regimen: inss.regimen,
            tamanoEmpleador: inss.tamanoEmpleador,
            tasaLaboral: Number(inss.tasaLaboral),
            tasaPatronal: Number(inss.tasaPatronal),
            techoMensual: inss.techoMensual ? Number(inss.techoMensual) : null,
            vigenteDesde: inss.vigenteDesde,
            fuenteTexto: inss.fuenteTexto,
            fuenteUrl: inss.fuenteUrl,
          }
        : null,
      inatec: inatec
        ? {
            id: inatec.id,
            tasa: Number(inatec.tasa),
            vigenteDesde: inatec.vigenteDesde,
            fuenteTexto: inatec.fuenteTexto,
            fuenteUrl: inatec.fuenteUrl,
          }
        : null,
      irTramos: irTramos.map((t) => ({
        id: t.id,
        orden: t.orden,
        desdeExcl: Number(t.desdeExcl),
        hastaIncl: t.hastaIncl !== null ? Number(t.hastaIncl) : null,
        impuestoBase: Number(t.impuestoBase),
        porcentaje: Number(t.porcentaje),
        sobreExceso: Number(t.sobreExceso),
        vigenteDesde: t.vigenteDesde,
        fuenteTexto: t.fuenteTexto,
        fuenteUrl: t.fuenteUrl,
      })),
      reglasIndemnizacion: reglasIndemnizacion.map((r) => ({
        id: r.id,
        desdeAnio: Number(r.desdeAnio),
        hastaAnio: r.hastaAnio !== null ? Number(r.hastaAnio) : null,
        diasPorAnio: Number(r.diasPorAnio),
        topeMeses: Number(r.topeMeses),
      })),
    };
  }

  async updateParametros(empresaId: string, dto: UpdateParametrosNominaDto, userId = 'SISTEMA') {
    const ahora = new Date();

    // 1. Actualizar o crear INSS
    if (dto.inss) {
      const existingInss = await this.prisma.paramInss.findFirst({ where: { empresaId } });
      const rawLaboral = Number(dto.inss.tasaLaboral);
      const rawPatronal = Number(dto.inss.tasaPatronal);

      // Guardar uniformemente en formato porcentaje (ej: 7.0000, 21.5000)
      const tasaLaboralVal = rawLaboral <= 1 ? rawLaboral * 100 : rawLaboral;
      const tasaPatronalVal = rawPatronal <= 1 ? rawPatronal * 100 : rawPatronal;

      if (existingInss) {
        await this.prisma.paramInss.update({
          where: { id: existingInss.id },
          data: {
            tasaLaboral: new Prisma.Decimal(tasaLaboralVal),
            tasaPatronal: new Prisma.Decimal(tasaPatronalVal),
            techoMensual: dto.inss.techoMensual !== undefined
              ? (dto.inss.techoMensual ? new Prisma.Decimal(dto.inss.techoMensual) : null)
              : existingInss.techoMensual,
            tamanoEmpleador: dto.inss.tamanoEmpleador ?? existingInss.tamanoEmpleador,
            fuenteTexto: dto.inss.fuenteTexto ?? existingInss.fuenteTexto,
            fuenteUrl: dto.inss.fuenteUrl ?? existingInss.fuenteUrl,
            aprobadoPor: userId,
          },
        });
      } else {
        await this.prisma.paramInss.create({
          data: {
            empresaId,
            regimen: 'INTEGRAL',
            tamanoEmpleador: dto.inss.tamanoEmpleador ?? 'PEQUENO',
            tasaLaboral: new Prisma.Decimal(tasaLaboralVal),
            tasaPatronal: new Prisma.Decimal(tasaPatronalVal),
            techoMensual: dto.inss.techoMensual ? new Prisma.Decimal(dto.inss.techoMensual) : null,
            vigenteDesde: ahora,
            fuenteTexto: dto.inss.fuenteTexto ?? 'Ajuste administrativo de tarifas de ley',
            fuenteUrl: dto.inss.fuenteUrl,
            aprobadoPor: userId,
          },
        });
      }
    }

    // 2. Actualizar o crear INATEC
    if (dto.inatec) {
      const existingInatec = await this.prisma.paramInatec.findFirst({ where: { empresaId } });
      const rawInatec = Number(dto.inatec.tasa);
      const tasaInatecVal = rawInatec <= 1 ? rawInatec * 100 : rawInatec;

      if (existingInatec) {
        await this.prisma.paramInatec.update({
          where: { id: existingInatec.id },
          data: {
            tasa: new Prisma.Decimal(tasaInatecVal),
            fuenteTexto: dto.inatec.fuenteTexto ?? existingInatec.fuenteTexto,
            fuenteUrl: dto.inatec.fuenteUrl ?? existingInatec.fuenteUrl,
            aprobadoPor: userId,
          },
        });
      } else {
        await this.prisma.paramInatec.create({
          data: {
            empresaId,
            tasa: new Prisma.Decimal(tasaInatecVal),
            vigenteDesde: ahora,
            fuenteTexto: dto.inatec.fuenteTexto ?? 'Ley Orgánica del INATEC (Decreto 40-94)',
            fuenteUrl: dto.inatec.fuenteUrl,
            aprobadoPor: userId,
          },
        });
      }
    }

    // 3. Actualizar tramos de IR si se enviaron
    if (dto.irTramos && dto.irTramos.length > 0) {
      await this.prisma.paramIrTramo.deleteMany({ where: { empresaId } });
      for (const t of dto.irTramos) {
        const rawPct = Number(t.porcentaje);
        const pctVal = rawPct <= 1 ? rawPct * 100 : rawPct;
        await this.prisma.paramIrTramo.create({
          data: {
            empresaId,
            orden: t.orden,
            desdeExcl: new Prisma.Decimal(t.desdeExcl),
            hastaIncl: t.hastaIncl !== null && t.hastaIncl !== undefined ? new Prisma.Decimal(t.hastaIncl) : null,
            impuestoBase: new Prisma.Decimal(t.impuestoBase),
            porcentaje: new Prisma.Decimal(pctVal),
            sobreExceso: new Prisma.Decimal(t.sobreExceso),
            vigenteDesde: ahora,
            fuenteTexto: t.fuenteTexto ?? 'Ley 822 (Art. 23 LCT)',
            aprobadoPor: userId,
          },
        });
      }
    }

    return this.getParametros(empresaId);
  }

  async resetParametros(empresaId: string, userId = 'SISTEMA') {
    const ahora = new Date('2026-01-01');

    // 1. Limpiar o restaurar INSS
    await this.prisma.paramInss.deleteMany({ where: { empresaId } });
    await this.prisma.paramInss.create({
      data: {
        empresaId,
        regimen: 'INTEGRAL',
        tamanoEmpleador: 'PEQUENO',
        tasaLaboral: new Prisma.Decimal(7.0),
        tasaPatronal: new Prisma.Decimal(21.5),
        vigenteDesde: ahora,
        fuenteTexto: 'Decreto 06-2019 (Reglamento Seguridad Social Nicaragua)',
        fuenteUrl: 'https://www.inss.gob.ni',
        aprobadoPor: userId,
      },
    });

    // 2. Limpiar o restaurar INATEC
    await this.prisma.paramInatec.deleteMany({ where: { empresaId } });
    await this.prisma.paramInatec.create({
      data: {
        empresaId,
        tasa: new Prisma.Decimal(2.0),
        vigenteDesde: ahora,
        fuenteTexto: 'Ley Orgánica del INATEC (Decreto 40-94)',
        fuenteUrl: 'https://www.inatec.edu.ni',
        aprobadoPor: userId,
      },
    });

    // 3. Limpiar o restaurar IR tramos
    await this.prisma.paramIrTramo.deleteMany({ where: { empresaId } });
    for (const t of DEFAULT_PARAM_IR_TRAMOS) {
      await this.prisma.paramIrTramo.create({
        data: {
          empresaId,
          orden: t.orden,
          desdeExcl: new Prisma.Decimal(t.desdeExcl),
          hastaIncl: t.hastaIncl !== null ? new Prisma.Decimal(t.hastaIncl) : null,
          impuestoBase: new Prisma.Decimal(t.impuestoBase),
          porcentaje: new Prisma.Decimal(t.porcentaje),
          sobreExceso: new Prisma.Decimal(t.sobreExceso),
          vigenteDesde: ahora,
          fuenteTexto: 'Ley 822 (Art. 23 LCT)',
          fuenteUrl: 'https://www.dgi.gob.ni',
          aprobadoPor: userId,
        },
      });
    }

    return this.getParametros(empresaId);
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

  async updateEmpleado(
    empresaId: string,
    id: string,
    dto: UpdateEmpleadoDto,
    usuarioId: string,
  ) {
    const emp = await this.prisma.empleado.findFirst({
      where: { id, empresaId },
      include: { cuentasBancarias: true, vendedor: true },
    });
    if (!emp) {
      throw new NotFoundException('Colaborador no encontrado');
    }

    // Validar unicidad si cambia cedula
    if (dto.cedula && dto.cedula !== emp.cedula) {
      const existCedula = await this.prisma.empleado.findFirst({
        where: { empresaId, cedula: dto.cedula, id: { not: id } },
      });
      if (existCedula) {
        throw new BadRequestException(`Ya existe otro empleado con la cédula ${dto.cedula}`);
      }
    }

    // Validar unicidad si cambia numeroInss
    if (dto.numeroInss && dto.numeroInss !== emp.numeroInss) {
      const existInss = await this.prisma.empleado.findFirst({
        where: { empresaId, numeroInss: dto.numeroInss, id: { not: id } },
      });
      if (existInss) {
        throw new BadRequestException(`Ya existe otro empleado con el número INSS ${dto.numeroInss}`);
      }
    }

    const salarioAnterior = Number(emp.salarioMensual);
    const nuevoSalario = dto.salarioMensual !== undefined ? Number(dto.salarioMensual) : salarioAnterior;
    const huboCambioSalario = dto.salarioMensual !== undefined && nuevoSalario !== salarioAnterior;

    const dataUpdate: Prisma.EmpleadoUpdateInput = {};
    if (dto.nombres !== undefined) dataUpdate.nombres = dto.nombres;
    if (dto.apellidos !== undefined) dataUpdate.apellidos = dto.apellidos;
    if (dto.cedula !== undefined) dataUpdate.cedula = dto.cedula;
    if (dto.numeroInss !== undefined) dataUpdate.numeroInss = dto.numeroInss;
    if (dto.ruc !== undefined) dataUpdate.ruc = dto.ruc;
    if (dto.email !== undefined) dataUpdate.email = dto.email;
    if (dto.telefono !== undefined) dataUpdate.telefono = dto.telefono;
    if (dto.direccion !== undefined) dataUpdate.direccion = dto.direccion;
    if (dto.sucursalId !== undefined) {
      dataUpdate.sucursal = dto.sucursalId ? { connect: { id: dto.sucursalId } } : { disconnect: true };
    }
    if (dto.centroCostoId !== undefined) dataUpdate.centroCostoId = dto.centroCostoId;
    if (dto.areaContable !== undefined) dataUpdate.areaContable = dto.areaContable;
    if (dto.cargo !== undefined) dataUpdate.cargo = dto.cargo;
    if (dto.tipoContrato !== undefined) dataUpdate.tipoContrato = dto.tipoContrato;
    if (dto.fechaIngreso !== undefined) dataUpdate.fechaIngreso = new Date(dto.fechaIngreso);
    if (dto.tipoSalario !== undefined) dataUpdate.tipoSalario = dto.tipoSalario;
    if (dto.metodoIr !== undefined) dataUpdate.metodoIr = dto.metodoIr;
    if (dto.frecuenciaPago !== undefined) dataUpdate.frecuenciaPago = dto.frecuenciaPago;
    if (dto.salarioMensual !== undefined) dataUpdate.salarioMensual = new Prisma.Decimal(nuevoSalario);
    if (dto.estado !== undefined) dataUpdate.estado = dto.estado;

    // Manejar cuenta bancaria si se provee
    if (dto.bancoNombre && dto.numeroCuenta && this.prisma.empleadoCuentaBancaria) {
      const cuentaPrincipal = emp.cuentasBancarias?.find((c) => c.esPrincipal);
      if (cuentaPrincipal) {
        await this.prisma.empleadoCuentaBancaria.update({
          where: { id: cuentaPrincipal.id },
          data: {
            banco: dto.bancoNombre,
            numeroCuenta: dto.numeroCuenta,
            tipoCuenta: dto.tipoCuenta || cuentaPrincipal.tipoCuenta,
          },
        });
      } else {
        await this.prisma.empleadoCuentaBancaria.create({
          data: {
            empleadoId: id,
            banco: dto.bancoNombre,
            numeroCuenta: dto.numeroCuenta,
            tipoCuenta: dto.tipoCuenta || 'AHORRO',
            esPrincipal: true,
          },
        });
      }
    }

    // Historial salarial si cambió el salario
    if (huboCambioSalario && this.prisma.empleadoSalarioHist) {
      const ultimoHist = await this.prisma.empleadoSalarioHist.findFirst({
        where: { empleadoId: id, vigenteHasta: null },
        orderBy: { vigenteDesde: 'desc' },
      });
      const ahora = new Date();
      if (ultimoHist) {
        await this.prisma.empleadoSalarioHist.update({
          where: { id: ultimoHist.id },
          data: { vigenteHasta: ahora },
        });
      }

      await this.prisma.empleadoSalarioHist.create({
        data: {
          empleadoId: id,
          vigenteDesde: ahora,
          salarioMensual: new Prisma.Decimal(nuevoSalario),
          cargo: dto.cargo || emp.cargo,
          motivo: dto.motivoCambioSalario || `Ajuste salarial de C$ ${salarioAnterior.toLocaleString()} a C$ ${nuevoSalario.toLocaleString()}`,
          aprobadoPor: usuarioId,
        },
      });
    }

    const updated = await this.prisma.empleado.update({
      where: { id },
      data: dataUpdate,
      include: {
        sucursal: true,
        cuentasBancarias: true,
        salarioHistorial: { orderBy: { vigenteDesde: 'desc' } },
        vendedor: true,
      },
    });

    // Si tiene un vendedor vinculado y cambiaron nombres, sincronizar nombreMostrar
    if (emp.vendedor && (dto.nombres !== undefined || dto.apellidos !== undefined) && this.prisma.vendedor) {
      const nuevoNombre = `${updated.nombres} ${updated.apellidos}`.trim();
      await this.prisma.vendedor.update({
        where: { id: emp.vendedor.id },
        data: { nombreMostrar: nuevoNombre },
      });
    }

    return updated;
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

    // Regla Ley 185: No se puede crear ni abrir la Q2 si la Q1 del mismo mes no está APROBADA
    if (dto.quincena === 2) {
      const periodoQ1 = await this.prisma.periodoNomina.findFirst({
        where: {
          empresaId,
          anio: dto.anio,
          mes: dto.mes,
          quincena: 1,
          tipo: dto.tipo ?? TipoPeriodoNomina.ORDINARIA,
        },
        include: { planillas: true },
      });
      const q1Aprobada = periodoQ1?.planillas?.some(
        (p) => p.estado === EstadoPlanilla.APROBADA || p.estado === EstadoPlanilla.PAGADA,
      );
      if (!periodoQ1 || !q1Aprobada) {
        throw new BadRequestException(
          'No se puede crear ni abrir la Quincena 2 (Q2) sin que la Quincena 1 (Q1) del mismo mes esté APROBADA (Ley 185).',
        );
      }
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

    if (planilla && (planilla.estado === EstadoPlanilla.APROBADA || planilla.estado === EstadoPlanilla.PAGADA || (planilla as any).bloqueada)) {
      throw new BadRequestException('No se puede recalcular una planilla que ya está APROBADA o PAGADA. Se encuentra bloqueada por auditoría legal (V19).');
    }
    if (planilla && planilla.estado === EstadoPlanilla.REVISADA) {
      throw new BadRequestException('La planilla se encuentra en estado REVISADA. Para recalcularla, debe ser devuelta a CALCULADA por un supervisor.');
    }

    // Regla Ley 185: No se puede calcular ni abrir la Q2 si la Q1 del mismo mes no está APROBADA
    if (periodo.quincena === 2) {
      const periodoQ1 = await this.prisma.periodoNomina.findFirst({
        where: {
          empresaId,
          anio: periodo.anio,
          mes: periodo.mes,
          quincena: 1,
          tipo: periodo.tipo,
        },
        include: { planillas: true },
      });
      const q1Aprobada = periodoQ1?.planillas?.some(
        (p) => p.estado === EstadoPlanilla.APROBADA || p.estado === EstadoPlanilla.PAGADA,
      );
      if (!periodoQ1 || !q1Aprobada) {
        throw new BadRequestException(
          'No se puede procesar ni calcular la Quincena 2 (Q2) sin que la Quincena 1 (Q1) del mismo mes haya sido APROBADA.',
        );
      }
    }

    const esRecalculo = Boolean(planilla);
    const totalesAntes = esRecalculo && planilla ? {
      totalDevengado: Number(planilla.totalDevengado || 0),
      totalDeducciones: Number(planilla.totalDeducciones || 0),
      totalNeto: Number(planilla.totalNeto || 0),
      totalPatronal: Number(planilla.totalPatronal || 0),
      totalInssPatronal: Number((planilla as any).totalInssPatronal || 0),
      totalInatec: Number((planilla as any).totalInatec || 0),
    } : null;

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

    const rawTasaLaboral = Number(inssParam.tasaLaboral);
    const tasaInssLaboral = rawTasaLaboral > 1 ? rawTasaLaboral / 100 : rawTasaLaboral;

    const rawTasaPatronal = Number(inssParam.tasaPatronal);
    const tasaInssPatronal = rawTasaPatronal > 1 ? rawTasaPatronal / 100 : rawTasaPatronal;

    const rawTasaInatec = Number(inatecParam.tasa);
    const tasaInatec = rawTasaInatec > 1 ? rawTasaInatec / 100 : rawTasaInatec;

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
        sucursal: true,
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
    let sumaTotalInssPatronal = 0;
    let sumaTotalInatec = 0;

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

      // Si existen liquidaciones de comisiones aprobadas para este empleado/vendedor
      let novedadesCom = novedades.filter((n) => n.concepto?.codigo === 'COM');
      if (novedadesCom.length === 0 && this.prisma.vendedor?.findFirst) {
        let vendedor = await this.prisma.vendedor.findFirst({
          where: { empleadoId: emp.id, empresaId },
        });

        // Si no tiene empleadoId vinculado, detectar por email de usuario o nombre
        if (!vendedor) {
          vendedor = await this.prisma.vendedor.findFirst({
            where: {
              empresaId,
              OR: [
                ...(emp.email ? [{ usuario: { email: emp.email } }] : []),
                { nombreMostrar: { contains: emp.nombres, mode: 'insensitive' } },
              ],
            },
          });
          if (vendedor && !vendedor.empleadoId) {
            await this.prisma.vendedor.update({
              where: { id: vendedor.id },
              data: { empleadoId: emp.id },
            });
          }
        }

        let sumaComisiones = 0;
        let referenciaId: string | null = null;
        let liqsCom: any[] = [];

        if (vendedor && this.prisma.liquidacionComision?.findMany) {
          liqsCom = await this.prisma.liquidacionComision.findMany({
            where: {
              empresaId,
              vendedorId: vendedor.id,
              estado: 'APROBADO',
              OR: [{ nominaPeriodoId: periodo.id }, { nominaPeriodoId: null }],
            },
            orderBy: { createdAt: 'desc' },
          });

          sumaComisiones = liqsCom.reduce(
            (acc, curr) => acc + Number(curr.comisionTotal || 0),
            0,
          );
          if (liqsCom.length > 0) {
            referenciaId = liqsCom[0].id;
          }
        }

        // Si no hay liquidación formal aprobada, calcular automáticamente desde las cotizaciones y ventas ganadas en el período
        if (sumaComisiones === 0 && (vendedor || emp.areaContable === 'VENTAS') && this.prisma.cotizacion?.findMany) {
          const vendedorUsuarioId = vendedor?.usuarioId;
          const usuarioVentas = vendedorUsuarioId
            ? await this.prisma.usuario.findUnique({ where: { id: vendedorUsuarioId } })
            : await this.prisma.usuario.findFirst({
                where: {
                  empresaId,
                  OR: [
                    ...(emp.email ? [{ email: emp.email }] : []),
                    { nombre: { contains: emp.nombres.split(' ')[0], mode: 'insensitive' } },
                  ],
                },
              });

          const targetUserId = usuarioVentas?.id || vendedorUsuarioId;
          const fechaInicio = new Date(periodo.fechaInicio);
          const fechaFin = new Date(periodo.fechaFin);

          // Buscar cotizaciones ganadas para este asesor/vendedor en el período
          const wonQuotes = await this.prisma.cotizacion.findMany({
            where: {
              empresaId,
              estado: {
                in: [
                  EstadoCotizacion.ACEPTADA,
                  EstadoCotizacion.CONVERTIDA_A_CONTRATO,
                  EstadoCotizacion.FACTURADA,
                ],
              },
              OR: [
                ...(targetUserId ? [{ asesorId: targetUserId }] : []),
                ...(vendedor ? [{ vendedorId: vendedor.id }] : []),
                ...(targetUserId ? [{ cliente: { vendedorId: targetUserId } }] : []),
              ],
              fechaEmision: { lte: fechaFin },
              createdAt: { lte: fechaFin },
              NOT: {
                fechaAceptacion: { lt: fechaInicio },
              },
            },
          });

          // Facturas comerciales emitidas en el período que pertenezcan a este vendedor (excluyendo CARGO_DANOS)
          const directInvoices = this.prisma.factura?.findMany
            ? await this.prisma.factura.findMany({
                where: {
                  empresaId,
                  tipoFactura: { not: TipoFactura.CARGO_DANOS },
                  estado: { not: EstadoFactura.CANCELADA },
                  cotizacionId: null, // Evitar duplicar si proviene de cotización
                  ...(vendedor ? { vendedorId: vendedor.id } : {}),
                  fechaEmision: { gte: fechaInicio, lte: fechaFin },
                },
              })
            : [];

          const totalCotizaciones = wonQuotes.reduce((acc, q) => acc + Number(q.total || 0), 0);
          const totalFacturas = directInvoices.reduce((acc, f) => acc + Number(f.total || 0), 0);
          const montoVentasPeriodo = Math.round((totalCotizaciones + totalFacturas) * 100) / 100;

          if (montoVentasPeriodo > 0) {
            let porcentaje = 0;
            const reglas = this.prisma.reglaComision?.findMany
              ? await this.prisma.reglaComision.findMany({
                  where: { empresaId, activo: true },
                  orderBy: { montoMinimo: 'desc' },
                })
              : [];

            if (reglas.length > 0 && targetUserId) {
              const reglaUser = reglas.find(
                (r) =>
                  (r.usuarioId === targetUserId || (r.nombreVendedor && emp.nombres.toLowerCase().includes(r.nombreVendedor.toLowerCase()))) &&
                  Number(r.montoMinimo) <= montoVentasPeriodo &&
                  (r.montoMaximo === null || Number(r.montoMaximo) >= montoVentasPeriodo),
              );
              if (reglaUser) porcentaje = reglaUser.porcentaje;
            }

            if (porcentaje === 0) {
              // Escala estándar oficial de BM Construcciones:
              // <= 800,000 -> 3%
              // 800,001 a 1,200,000 -> 2%
              // > 1,200,000 -> 1%
              if (montoVentasPeriodo <= 800000) porcentaje = 3;
              else if (montoVentasPeriodo <= 1200000) porcentaje = 2;
              else porcentaje = 1;
            }

            sumaComisiones = Math.round(((montoVentasPeriodo * porcentaje) / 100) * 100) / 100;
            referenciaId = vendedor?.id || targetUserId || emp.id;
          }
        }

        if (sumaComisiones > 0) {
          let conceptoCom = conceptoMap.get('COM');
          if (conceptoCom && this.prisma.novedadNomina?.create) {
            const nuevaNov = await this.prisma.novedadNomina.create({
              data: {
                empresaId,
                empleadoId: emp.id,
                periodoDestinoId: periodo.id,
                conceptoId: conceptoCom.id,
                monto: sumaComisiones,
                origen: OrigenNovedadNomina.COMISIONES,
                referenciaId: referenciaId || (liqsCom.length > 0 ? liqsCom[0].id : null),
                periodoDevengo: `${periodo.anio}-${String(periodo.mes).padStart(2, '0')}`,
                estado: EstadoNovedadNomina.PENDIENTE,
              },
              include: { concepto: true },
            });
            novedades.push(nuevaNov);
            novedadesCom.push(nuevaNov);

            for (const l of liqsCom) {
              if (this.prisma.liquidacionComision?.update) {
                await this.prisma.liquidacionComision.update({
                  where: { id: l.id },
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
      let horasExtra = 0;
      let comisiones = 0;
      let otrosIngresos = 0;

      for (const nov of novedades) {
        const montoNov = Number(nov.monto);
        if (nov.concepto.tipo === 'DEVENGO') {
          sumaDevengosNovedades += montoNov;
          if (nov.concepto.afectaInss) devengadoGravableInss += montoNov;
          if (nov.concepto.afectaIr) devengadoGravableIr += montoNov;

          if (nov.concepto.codigo === 'HEX') {
            horasExtra += montoNov;
          } else if (nov.concepto.codigo === 'COM') {
            comisiones += montoNov;
          } else {
            otrosIngresos += montoNov;
          }

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

      // Provisiones quincenales legales (1/12 avo mensual distribuido)
      const provVacQuincenal = round2((salarioMensual / 12) / 2);
      const provAguiQuincenal = round2((salarioMensual / 12) / 2);
      const provIndQuincenal = round2((salarioMensual / 12) / 2);

      // Copia Snapshot de parámetros y colaborador a la fecha (Principio de Inmutabilidad)
      const snapshotParametros = {
        tasaInssLaboral,
        tasaInssPatronal,
        tasaInatec,
        tramosIr: irTramosInput,
        periodo: {
          id: periodo.id,
          anio: periodo.anio,
          mes: periodo.mes,
          quincena: periodo.quincena,
          fechaInicio: periodo.fechaInicio,
          fechaFin: periodo.fechaFin,
          fechaPago: periodo.fechaPago,
        },
        calculadoEn: new Date().toISOString(),
      };

      const snapshotEmpleado = {
        id: emp.id,
        codigo: emp.codigo,
        nombres: emp.nombres,
        apellidos: emp.apellidos,
        nombreCompleto: `${emp.nombres} ${emp.apellidos}`,
        cedula: emp.cedula,
        numeroInss: emp.numeroInss,
        cargo: emp.cargo,
        sucursal: (emp as any).sucursal?.nombre || 'Casa Matriz Managua',
        centroCosto: emp.centroCostoId || null,
        areaContable: emp.areaContable,
        tipoSalario: emp.tipoSalario,
        metodoIr: emp.metodoIr,
        formaPago: emp.formaPago,
        salarioMensual,
        banco: emp.cuentasBancarias?.[0]?.banco || 'BAC Credomatic',
        numeroCuenta: emp.cuentasBancarias?.[0]?.numeroCuenta || 'N/A',
        fechaIngreso: emp.fechaIngreso,
      };

      // Crear planilla_empleado con desglose completo y snapshots
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
          horasExtra: new Prisma.Decimal(horasExtra),
          comisiones: new Prisma.Decimal(comisiones),
          otrosIngresos: new Prisma.Decimal(otrosIngresos),
          totalDevengado: new Prisma.Decimal(totalDevengado),
          inssLaboral: new Prisma.Decimal(inssLaboral),
          irSalarial: new Prisma.Decimal(irQuincena),
          otrasDeducciones: new Prisma.Decimal(sumaOtrasDeducciones),
          totalDeducciones: new Prisma.Decimal(totalDeducciones),
          netoPagar: new Prisma.Decimal(netoPagar),
          inssPatronal: new Prisma.Decimal(patronalRes.inssPatronal),
          inatec: new Prisma.Decimal(patronalRes.inatec),
          costoPatronal: new Prisma.Decimal(patronalRes.totalPatronal),
          provisionVacaciones: new Prisma.Decimal(provVacQuincenal),
          provisionAguinaldo: new Prisma.Decimal(provAguiQuincenal),
          provisionIndemnizacion: new Prisma.Decimal(provIndQuincenal),
          snapshotTasas: {
            tasaInssLaboral,
            tasaInssPatronal,
            tasaInatec,
          },
          snapshotParametros,
          snapshotEmpleado,
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
      sumaTotalInssPatronal += patronalRes.inssPatronal;
      sumaTotalInatec += patronalRes.inatec;
    }

    const totalesDespues = {
      totalDevengado: round2(sumaTotalDevengado),
      totalDeducciones: round2(sumaTotalDeducciones),
      totalNeto: round2(sumaTotalNeto),
      totalPatronal: round2(sumaTotalPatronal),
      totalInssPatronal: round2(sumaTotalInssPatronal),
      totalInatec: round2(sumaTotalInatec),
    };

    // Actualizar totales de planilla
    const planillaFinal = await this.prisma.planilla.update({
      where: { id: planilla.id },
      data: {
        estado: EstadoPlanilla.CALCULADA,
        totalDevengado: new Prisma.Decimal(totalesDespues.totalDevengado),
        totalDeducciones: new Prisma.Decimal(totalesDespues.totalDeducciones),
        totalNeto: new Prisma.Decimal(totalesDespues.totalNeto),
        totalPatronal: new Prisma.Decimal(totalesDespues.totalPatronal),
        totalInssPatronal: new Prisma.Decimal(totalesDespues.totalInssPatronal),
        totalInatec: new Prisma.Decimal(totalesDespues.totalInatec),
        creadoPor: (planilla as any).creadoPor || userId,
        calculadoEn: new Date(),
      },
      include: {
        periodo: true,
        empleados: {
          include: {
            empleado: true,
            lineas: { include: { concepto: true } },
          },
        },
      },
    });

    await this.registrarBitacora(
      planillaFinal.id,
      esRecalculo ? 'RECALCULAR' : 'CALCULAR',
      userId,
      esRecalculo
        ? 'Recálculo documental de nómina completado'
        : 'Cálculo de nómina ejecutado bajo Ley 185 y Ley 822',
      totalesAntes,
      totalesDespues,
    );

    return planillaFinal;
  }

  // ==========================================
  // 6. FLUJO DE REVISIÓN Y APROBACIÓN
  // ==========================================

  async revisarPlanilla(empresaId: string, planillaId: string, userId: string, comentario?: string) {
    const planilla = await this.prisma.planilla.findFirst({
      where: { id: planillaId, empresaId },
    });
    if (!planilla) throw new NotFoundException('Planilla no encontrada');
    if (planilla.estado !== EstadoPlanilla.CALCULADA) {
      throw new BadRequestException('Solo una planilla en estado CALCULADA puede pasar a REVISADA');
    }

    const actualizada = await this.prisma.planilla.update({
      where: { id: planilla.id },
      data: {
        estado: EstadoPlanilla.REVISADA,
        revisadoPor: userId,
        revisadoEn: new Date(),
      },
    });

    await this.registrarBitacora(
      planilla.id,
      'REVISAR',
      userId,
      comentario || 'Planilla verificada y marcada como REVISADA para su aprobación final',
    );

    return actualizada;
  }

  async devolverPlanilla(empresaId: string, planillaId: string, userId: string, motivo: string) {
    const planilla = await this.prisma.planilla.findFirst({
      where: { id: planillaId, empresaId },
    });
    if (!planilla) throw new NotFoundException('Planilla no encontrada');
    if (planilla.estado !== EstadoPlanilla.REVISADA) {
      throw new BadRequestException('Solo una planilla en estado REVISADA puede ser devuelta a CALCULADA');
    }
    if (!motivo || !motivo.trim()) {
      throw new BadRequestException('Debe proporcionar un motivo para devolver la planilla a corrección');
    }

    const actualizada = await this.prisma.planilla.update({
      where: { id: planilla.id },
      data: {
        estado: EstadoPlanilla.CALCULADA,
        revisadoPor: null,
        revisadoEn: null,
      },
    });

    await this.registrarBitacora(
      planilla.id,
      'DEVOLVER',
      userId,
      `Planilla devuelta a estado CALCULADA para ajuste. Motivo: ${motivo.trim()}`,
    );

    return actualizada;
  }

  async aprobarPlanilla(empresaId: string, planillaId: string, userId: string) {
    let planilla = await this.prisma.planilla.findFirst({
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

    // 3. Estructuración y generación del Asiento Contable de Devengo (Provisión)
    const anio = planilla.periodo.anio;
    const mesStr = String(planilla.periodo.mes).padStart(2, '0');
    const qStr = planilla.periodo.quincena ? `Q${planilla.periodo.quincena}` : 'M';
    const asientoDevengoId = `AS-DEV-${anio}-${mesStr}-${qStr}`;
    const totalDev = Number(planilla.totalDevengado);
    const totalPat = Number(planilla.totalPatronal);
    const totalInssPat = Number((planilla as any).totalInssPatronal || round2(totalDev * 0.215));
    const totalInatecVal = Number((planilla as any).totalInatec || round2(totalDev * 0.02));
    const totalDed = Number(planilla.totalDeducciones);
    const totalNet = Number(planilla.totalNeto);
    const totalInssLab = round2(totalDev * 0.07);
    const totalIrRet = round2(Math.max(0, totalDed - totalInssLab));

    const asientoDevengoJson = {
      id: asientoDevengoId,
      tipo: 'DEVENGO_NOMINA',
      periodo: `${anio}-${mesStr} ${qStr}`,
      fecha: new Date().toISOString(),
      concepto: `Provisión de gasto y pasivos laborales quincenales ${anio}-${mesStr} ${qStr}`,
      partidas: [
        { cuenta: '5101', nombre: 'Gasto de Sueldos y Salarios Ordinarios', debe: totalDev, haber: 0 },
        { cuenta: '5102', nombre: 'Aportes Patronales INSS (21.5%)', debe: totalInssPat, haber: 0 },
        { cuenta: '5103', nombre: 'Capacitación Técnica INATEC (2%)', debe: totalInatecVal, haber: 0 },
        { cuenta: '2102', nombre: 'Retenciones INSS Laboral por Pagar (7%)', debe: 0, haber: totalInssLab },
        { cuenta: '2103', nombre: 'Retenciones IR Salarial por Pagar (DGI)', debe: 0, haber: totalIrRet },
        { cuenta: '2104', nombre: 'Cargas Patronales por Pagar (INSS + INATEC)', debe: 0, haber: totalPat },
        { cuenta: '2101', nombre: 'Sueldos y Salarios por Pagar a Colaboradores', debe: 0, haber: totalNet },
      ],
      totalDebe: round2(totalDev + totalPat),
      totalHaber: round2(totalDev + totalPat),
      cuadrado: true,
    };

    const aprobada = await this.prisma.planilla.update({
      where: { id: planilla.id },
      data: {
        estado: EstadoPlanilla.APROBADA,
        bloqueada: true,
        aprobadoPor: userId,
        aprobadoEn: new Date(),
        asientoDevengoId,
        asientoDevengoJson,
      },
      include: {
        periodo: true,
      },
    });

    await this.registrarBitacora(
      planilla.id,
      'APROBAR',
      userId,
      `Planilla APROBADA legalmente y bloqueada contra modificaciones. Asiento de devengo ${asientoDevengoId} generado.`,
      null,
      {
        totalDevengado: totalDev,
        totalDeducciones: totalDed,
        totalNeto: totalNet,
        totalPatronal: totalPat,
        bloqueada: true,
      },
    );

    return aprobada;
  }

  async marcarPagada(empresaId: string, planillaId: string, userId: string) {
    const planilla = await this.prisma.planilla.findFirst({
      where: { id: planillaId, empresaId },
      include: { periodo: true },
    });
    if (!planilla) throw new NotFoundException('Planilla no encontrada');
    if (planilla.estado !== EstadoPlanilla.APROBADA) {
      throw new BadRequestException('Solo una planilla APROBADA puede marcarse como PAGADA');
    }

    const anio = planilla.periodo.anio;
    const mesStr = String(planilla.periodo.mes).padStart(2, '0');
    const qStr = planilla.periodo.quincena ? `Q${planilla.periodo.quincena}` : 'M';
    const asientoPagoId = `AS-PAG-${anio}-${mesStr}-${qStr}`;
    const totalNet = Number(planilla.totalNeto);

    const asientoPagoJson = {
      id: asientoPagoId,
      tipo: 'PAGO_NOMINA',
      periodo: `${anio}-${mesStr} ${qStr}`,
      fecha: new Date().toISOString(),
      concepto: `Dispersión y pago efectivo de sueldos y salarios ${anio}-${mesStr} ${qStr}`,
      partidas: [
        { cuenta: '2101', nombre: 'Sueldos y Salarios por Pagar a Colaboradores', debe: totalNet, haber: 0 },
        { cuenta: '1102', nombre: 'Bancos e Instituciones Financieras (BAC)', debe: 0, haber: totalNet },
      ],
      totalDebe: totalNet,
      totalHaber: totalNet,
      cuadrado: true,
    };

    const pagada = await this.prisma.planilla.update({
      where: { id: planilla.id },
      data: {
        estado: EstadoPlanilla.PAGADA,
        pagadoEn: new Date(),
        asientoPagoId,
        asientoPagoJson,
      },
      include: { periodo: true },
    });

    await this.registrarBitacora(
      planilla.id,
      'PAGAR',
      userId,
      `Nómina pagada y dispersada exitosamente. Asiento de pago ${asientoPagoId} generado.`,
      null,
      { totalNetoPagado: totalNet },
    );

    return pagada;
  }

  async anularPlanilla(empresaId: string, planillaId: string, userId: string, motivo: string) {
    const planilla = await this.prisma.planilla.findFirst({
      where: { id: planillaId, empresaId },
    });
    if (!planilla) throw new NotFoundException('Planilla no encontrada');
    if (
      planilla.estado === EstadoPlanilla.APROBADA ||
      planilla.estado === EstadoPlanilla.PAGADA ||
      (planilla as any).bloqueada
    ) {
      throw new BadRequestException('No se puede anular una planilla que ya ha sido APROBADA o PAGADA');
    }
    if (!motivo || !motivo.trim()) {
      throw new BadRequestException('Debe especificar un motivo de anulación de la planilla');
    }

    const actualizada = await this.prisma.planilla.update({
      where: { id: planilla.id },
      data: {
        estado: EstadoPlanilla.ANULADA,
      },
    });

    await this.registrarBitacora(
      planilla.id,
      'ANULAR',
      userId,
      `Planilla anulada. Motivo: ${motivo.trim()}`,
    );

    return actualizada;
  }

  // ==========================================
  // HISTORIAL DE PLANILLAS Y AUDITORÍA
  // ==========================================

  async getHistorialPlanillas(
    empresaId: string,
    filtros?: FiltroHistorialPlanillasDto,
  ) {
    const where: any = { empresaId };

    if (filtros?.estado) {
      where.estado = filtros.estado as any;
    }

    if (filtros?.anio || filtros?.mes) {
      where.periodo = {};
      if (filtros.anio) where.periodo.anio = Number(filtros.anio);
      if (filtros.mes) where.periodo.mes = Number(filtros.mes);
    }

    const planillas = await this.prisma.planilla.findMany({
      where,
      include: {
        periodo: true,
        sucursal: { select: { id: true, nombre: true } },
        _count: {
          select: { empleados: true },
        },
      },
      orderBy: [
        { periodo: { anio: 'desc' } },
        { periodo: { mes: 'desc' } },
        { periodo: { quincena: 'desc' } },
        { createdAt: 'desc' },
      ],
    });

    return planillas.map((p) => ({
      id: p.id,
      periodoId: p.periodoId,
      anio: p.periodo.anio,
      mes: p.periodo.mes,
      quincena: p.periodo.quincena,
      fechaInicio: p.periodo.fechaInicio,
      fechaFin: p.periodo.fechaFin,
      fechaPago: p.periodo.fechaPago,
      tipo: p.periodo.tipo,
      estado: p.estado,
      bloqueada: (p as any).bloqueada ?? false,
      totalDevengado: Number(p.totalDevengado),
      totalDeducciones: Number(p.totalDeducciones),
      totalNeto: Number(p.totalNeto),
      totalPatronal: Number(p.totalPatronal),
      totalInssPatronal: Number((p as any).totalInssPatronal || 0),
      totalInatec: Number((p as any).totalInatec || 0),
      creadoPor: (p as any).creadoPor ?? null,
      calculadoEn: p.calculadoEn,
      revisadoPor: p.revisadoPor,
      revisadoEn: p.revisadoEn,
      aprobadoPor: p.aprobadoPor,
      aprobadoEn: p.aprobadoEn,
      pagadoEn: p.pagadoEn,
      asientoDevengoId: (p as any).asientoDevengoId ?? null,
      asientoPagoId: (p as any).asientoPagoId ?? null,
      totalColaboradores: p._count.empleados,
      sucursal: p.sucursal?.nombre || 'General / Todas',
    }));
  }

  async getPlanillaDetalle(empresaId: string, planillaId: string) {
    const planilla = await this.prisma.planilla.findFirst({
      where: { id: planillaId, empresaId },
      include: {
        periodo: true,
        sucursal: true,
        empleados: {
          include: {
            empleado: {
              include: { sucursal: true, cuentasBancarias: true },
            },
            lineas: {
              include: { concepto: true },
              orderBy: { concepto: { ordenCalculo: 'asc' } },
            },
          },
          orderBy: { empleado: { nombres: 'asc' } },
        },
        bitacoras: {
          orderBy: { fechaHora: 'desc' },
        },
      },
    });
    if (!planilla) throw new NotFoundException('Planilla no encontrada');

    return {
      ...planilla,
      totalDevengado: Number(planilla.totalDevengado),
      totalDeducciones: Number(planilla.totalDeducciones),
      totalNeto: Number(planilla.totalNeto),
      totalPatronal: Number(planilla.totalPatronal),
      totalInssPatronal: Number((planilla as any).totalInssPatronal || 0),
      totalInatec: Number((planilla as any).totalInatec || 0),
      empleados: planilla.empleados.map((e) => ({
        id: e.id,
        empleadoId: e.empleadoId,
        salarioMensual: Number(e.salarioMensual),
        diasTrabajados: Number(e.diasTrabajados),
        horasExtra: Number((e as any).horasExtra || 0),
        comisiones: Number((e as any).comisiones || 0),
        otrosIngresos: Number((e as any).otrosIngresos || 0),
        totalDevengado: Number(e.totalDevengado),
        inssLaboral: Number((e as any).inssLaboral || 0),
        irSalarial: Number((e as any).irSalarial || 0),
        otrasDeducciones: Number((e as any).otrasDeducciones || 0),
        totalDeducciones: Number(e.totalDeducciones),
        netoPagar: Number(e.netoPagar),
        inssPatronal: Number((e as any).inssPatronal || 0),
        inatec: Number((e as any).inatec || 0),
        costoPatronal: Number(e.costoPatronal),
        provisionVacaciones: Number((e as any).provisionVacaciones || 0),
        provisionAguinaldo: Number((e as any).provisionAguinaldo || 0),
        provisionIndemnizacion: Number((e as any).provisionIndemnizacion || 0),
        snapshotTasas: e.snapshotTasas,
        snapshotParametros: (e as any).snapshotParametros,
        snapshotEmpleado: (e as any).snapshotEmpleado,
        empleado: {
          id: e.empleado.id,
          codigo: e.empleado.codigo,
          nombres: e.empleado.nombres,
          apellidos: e.empleado.apellidos,
          cedula: e.empleado.cedula,
          numeroInss: e.empleado.numeroInss,
          cargo: e.empleado.cargo,
          sucursal: e.empleado.sucursal?.nombre || 'Casa Matriz',
        },
        lineas: e.lineas.map((l) => ({
          id: l.id,
          conceptoCodigo: l.concepto.codigo,
          conceptoNombre: l.concepto.nombre,
          tipo: l.concepto.tipo,
          monto: Number(l.monto),
          cantidad: l.cantidad ? Number(l.cantidad) : null,
          base: l.base ? Number(l.base) : null,
          tasa: l.tasa ? Number(l.tasa) : null,
        })),
      })),
    };
  }

  async getBitacoraPlanilla(empresaId: string, planillaId: string) {
    const planilla = await this.prisma.planilla.findFirst({
      where: { id: planillaId, empresaId },
    });
    if (!planilla) throw new NotFoundException('Planilla no encontrada');

    return this.prisma.planillaBitacora.findMany({
      where: { planillaId },
      orderBy: { fechaHora: 'desc' },
    });
  }

  async getHistorialPagosEmpleado(empresaId: string, empleadoId: string) {
    const emp = await this.prisma.empleado.findFirst({
      where: { id: empleadoId, empresaId },
      include: { sucursal: true, cuentasBancarias: true },
    });
    if (!emp) throw new NotFoundException('Empleado no encontrado');

    const lineasEmpleado = await this.prisma.planillaEmpleado.findMany({
      where: {
        empleadoId,
        planilla: {
          empresaId,
          estado: { in: [EstadoPlanilla.APROBADA, EstadoPlanilla.PAGADA, EstadoPlanilla.CALCULADA] },
        },
      },
      include: {
        planilla: {
          include: { periodo: true },
        },
        lineas: {
          include: { concepto: true },
        },
      },
      orderBy: [
        { planilla: { periodo: { anio: 'desc' } } },
        { planilla: { periodo: { mes: 'desc' } } },
        { planilla: { periodo: { quincena: 'desc' } } },
      ],
    });

    const anioActual = new Date().getFullYear();

    // Acumulado del año actual
    let acumuladoAnioDevengado = 0;
    let acumuladoAnioInss = 0;
    let acumuladoAnioIr = 0;
    let acumuladoAnioNeto = 0;

    for (const item of lineasEmpleado) {
      if (item.planilla.periodo.anio === anioActual) {
        acumuladoAnioDevengado += Number(item.totalDevengado);
        acumuladoAnioInss += Number((item as any).inssLaboral || 0);
        acumuladoAnioIr += Number((item as any).irSalarial || 0);
        acumuladoAnioNeto += Number(item.netoPagar);
      }
    }

    // Últimas 12 quincenas (equivalente a los últimos 6 meses)
    const ultimas12Quincenas = lineasEmpleado.slice(0, 12);
    const sumaUltimos6MDevengado = ultimas12Quincenas.reduce(
      (sum, l) => sum + Number(l.totalDevengado),
      0,
    );
    // Promedio mensual de los últimos 6 meses (Art. 78 vacaciones: total devengado en 6 meses / 6)
    const promedioUltimos6Meses = ultimas12Quincenas.length > 0
      ? round2(sumaUltimos6MDevengado / Math.min(6, Math.max(1, ultimas12Quincenas.length / 2)))
      : Number(emp.salarioMensual);

    // Salario más alto de los últimos 6 meses (Art. 94 salario variable para aguinaldo)
    const mesesMap = new Map<string, number>();
    for (const item of ultimas12Quincenas) {
      const key = `${item.planilla.periodo.anio}-${item.planilla.periodo.mes}`;
      mesesMap.set(key, (mesesMap.get(key) || 0) + Number(item.totalDevengado));
    }
    let salarioMaximo6Meses = Number(emp.salarioMensual);
    for (const totalMes of mesesMap.values()) {
      if (totalMes > salarioMaximo6Meses) {
        salarioMaximo6Meses = totalMes;
      }
    }

    return {
      empleado: {
        id: emp.id,
        codigo: emp.codigo,
        nombreCompleto: `${emp.nombres} ${emp.apellidos}`,
        cedula: emp.cedula,
        numeroInss: emp.numeroInss,
        cargo: emp.cargo,
        sucursal: emp.sucursal?.nombre || 'Casa Matriz Managua',
        salarioMensual: Number(emp.salarioMensual),
        tipoSalario: emp.tipoSalario,
        fechaIngreso: emp.fechaIngreso,
      },
      resumenLegal: {
        anio: anioActual,
        acumuladoAnual: {
          devengado: round2(acumuladoAnioDevengado),
          inssLaboral: round2(acumuladoAnioInss),
          irSalarial: round2(acumuladoAnioIr),
          netoRecibido: round2(acumuladoAnioNeto),
        },
        articulo78Vacaciones: {
          promedioMensual6Meses: round2(promedioUltimos6Meses),
          quincenasConsideradas: ultimas12Quincenas.length,
          baseCalculoDiario: round2(promedioUltimos6Meses / 30),
        },
        articulo94Aguinaldo: {
          salarioMaximo6Meses: round2(salarioMaximo6Meses),
          esVariable: mesesMap.size > 0 && salarioMaximo6Meses > Number(emp.salarioMensual),
        },
      },
      historialQuincenas: lineasEmpleado.map((item) => ({
        planillaId: item.planillaId,
        periodo: `${item.planilla.periodo.anio} · Mes ${item.planilla.periodo.mes} · Q${item.planilla.periodo.quincena}`,
        quincena: item.planilla.periodo.quincena,
        fechaPago: item.planilla.periodo.fechaPago,
        estado: item.planilla.estado,
        salarioBase: Number(item.salarioMensual) / 2,
        horasExtra: Number((item as any).horasExtra || 0),
        comisiones: Number((item as any).comisiones || 0),
        otrosIngresos: Number((item as any).otrosIngresos || 0),
        totalDevengado: Number(item.totalDevengado),
        inssLaboral: Number((item as any).inssLaboral || 0),
        irSalarial: Number((item as any).irSalarial || 0),
        otrasDeducciones: Number((item as any).otrasDeducciones || 0),
        totalDeducciones: Number(item.totalDeducciones),
        netoPagar: Number(item.netoPagar),
      })),
    };
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
