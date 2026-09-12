import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoCotizacion } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateReglaComisionDto } from '../dto/create-regla-comision.dto';
import { UpdateReglaComisionDto } from '../dto/update-regla-comision.dto';

type ReglaSeed = {
  nombreVendedor: string | null;
  montoMinimo: number;
  montoMaximo: number | null;
  porcentaje: number;
};

@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Escala estándar aplicable por defecto según directriz de dirección comercial:
   * - De C$ 1 a C$ 800,000: 3%
   * - De C$ 800,001 a C$ 1,200,000: 2%
   * - Más de C$ 1,200,000: 1%
   */
  private readonly escalaEstandarUniversal: ReglaSeed[] = [
    { nombreVendedor: null, montoMinimo: 1, montoMaximo: 800000, porcentaje: 3 },
    { nombreVendedor: null, montoMinimo: 800001, montoMaximo: 1200000, porcentaje: 2 },
    { nombreVendedor: null, montoMinimo: 1200001, montoMaximo: null, porcentaje: 1 },
  ];

  private readonly reglasPredeterminadas: ReglaSeed[] = [
    { nombreVendedor: 'DAVID', montoMinimo: 1, montoMaximo: 800000, porcentaje: 3 },
    { nombreVendedor: 'DAVID', montoMinimo: 800001, montoMaximo: 1200000, porcentaje: 2 },
    { nombreVendedor: 'DAVID', montoMinimo: 1200001, montoMaximo: null, porcentaje: 1 },
    { nombreVendedor: 'NYLSKA', montoMinimo: 1, montoMaximo: 300000, porcentaje: 2 },
    { nombreVendedor: 'NYLSKA', montoMinimo: 300001, montoMaximo: null, porcentaje: 1 },
  ];

  private validarTramo(montoMinimo: number, montoMaximo: number | null | undefined, porcentaje: number) {
    if (![montoMinimo, porcentaje].every(Number.isFinite) || montoMinimo < 0 || porcentaje < 0) {
      throw new BadRequestException('Los montos y el porcentaje deben ser números positivos');
    }
    if (montoMaximo !== null && montoMaximo !== undefined) {
      if (!Number.isFinite(montoMaximo) || montoMaximo < montoMinimo) {
        throw new BadRequestException('El monto máximo no puede ser menor que el monto mínimo');
      }
    }
  }

  private async validarUsuarioEmpresa(usuarioId: string, empresaId: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId },
      select: { id: true },
    });
    if (!usuario) {
      throw new NotFoundException('El vendedor no existe o no pertenece a tu empresa');
    }
  }

  async create(createDto: CreateReglaComisionDto, empresaId: string) {
    this.validarTramo(createDto.montoMinimo, createDto.montoMaximo, createDto.porcentaje);
    if (createDto.usuarioId) {
      await this.validarUsuarioEmpresa(createDto.usuarioId, empresaId);
    }

    return this.prisma.reglaComision.create({
      data: {
        ...createDto,
        nombreVendedor: createDto.nombreVendedor?.trim() || null,
        empresaId,
        activo: createDto.activo ?? true,
      },
    });
  }

  async findAll(empresaId: string) {
    return this.prisma.reglaComision.findMany({
      where: { empresaId },
      orderBy: [{ nombreVendedor: 'asc' }, { montoMinimo: 'asc' }],
      include: {
        usuario: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
      },
    });
  }

  async findOne(id: string, empresaId: string) {
    const regla = await this.prisma.reglaComision.findFirst({
      where: { id, empresaId },
    });
    if (!regla) {
      throw new NotFoundException(`No se encontró la regla de comisión con ID: ${id}`);
    }
    return regla;
  }

  async update(id: string, updateDto: UpdateReglaComisionDto, empresaId: string) {
    const regla = await this.findOne(id, empresaId);
    if (updateDto.usuarioId) {
      await this.validarUsuarioEmpresa(updateDto.usuarioId, empresaId);
    }

    const montoMinimo = updateDto.montoMinimo ?? regla.montoMinimo;
    const montoMaximo = updateDto.montoMaximo === undefined
      ? regla.montoMaximo
      : updateDto.montoMaximo;
    const porcentaje = updateDto.porcentaje ?? regla.porcentaje;
    this.validarTramo(montoMinimo, montoMaximo, porcentaje);

    return this.prisma.reglaComision.update({
      where: { id },
      data: {
        ...updateDto,
        ...(updateDto.nombreVendedor !== undefined
          ? { nombreVendedor: updateDto.nombreVendedor?.trim() || null }
          : {}),
      },
    });
  }

  async remove(id: string, empresaId: string) {
    await this.findOne(id, empresaId);
    return this.prisma.reglaComision.delete({ where: { id } });
  }

  async seedDefaultRules(empresaId: string) {
    const resultados: any[] = [];

    for (const regla of this.reglasPredeterminadas) {
      const existente = await this.prisma.reglaComision.findFirst({
        where: {
          empresaId,
          usuarioId: null,
          nombreVendedor: regla.nombreVendedor,
          montoMinimo: regla.montoMinimo,
          montoMaximo: regla.montoMaximo,
        },
      });

      if (existente) {
        resultados.push(await this.prisma.reglaComision.update({
          where: { id: existente.id },
          data: { porcentaje: regla.porcentaje, activo: true },
        }));
      } else {
        resultados.push(await this.prisma.reglaComision.create({
          data: { ...regla, empresaId, usuarioId: null, activo: true },
        }));
      }
    }

    return resultados;
  }

  /**
   * Siembra la escala universal para todos los vendedores activos de la empresa
   * (C$ 1-800k: 3%, C$ 800k-1.2M: 2%, C$ >1.2M: 1%), tanto a nivel global como vinculado por usuarioId.
   */
  async seedRulesForAllSellers(empresaId: string) {
    const resultados: any[] = [];

    // 1. Escala Universal (Global: usuarioId = null, nombreVendedor = null)
    for (const regla of this.escalaEstandarUniversal) {
      const existente = await this.prisma.reglaComision.findFirst({
        where: {
          empresaId,
          usuarioId: null,
          nombreVendedor: null,
          montoMinimo: regla.montoMinimo,
          montoMaximo: regla.montoMaximo,
        },
      });

      if (existente) {
        resultados.push(await this.prisma.reglaComision.update({
          where: { id: existente.id },
          data: { porcentaje: regla.porcentaje, activo: true },
        }));
      } else {
        resultados.push(await this.prisma.reglaComision.create({
          data: { ...regla, empresaId, usuarioId: null, activo: true },
        }));
      }
    }

    // 2. Escala explícita para cada asesor comercial de la empresa
    const vendedores = await this.prisma.usuario.findMany({
      where: {
        empresaId,
        roles: {
          some: {
            rol: { nombre: { in: ['COMERCIAL', 'GERENTE', 'ADMIN'] } },
          },
        },
      },
      select: { id: true, nombre: true, apellido: true },
    });

    for (const vendedor of vendedores) {
      for (const regla of this.escalaEstandarUniversal) {
        const existente = await this.prisma.reglaComision.findFirst({
          where: {
            empresaId,
            usuarioId: vendedor.id,
            montoMinimo: regla.montoMinimo,
            montoMaximo: regla.montoMaximo,
          },
        });

        if (existente) {
          resultados.push(await this.prisma.reglaComision.update({
            where: { id: existente.id },
            data: { porcentaje: regla.porcentaje, activo: true },
          }));
        } else {
          resultados.push(await this.prisma.reglaComision.create({
            data: {
              empresaId,
              usuarioId: vendedor.id,
              nombreVendedor: `${vendedor.nombre} ${vendedor.apellido}`.trim(),
              montoMinimo: regla.montoMinimo,
              montoMaximo: regla.montoMaximo,
              porcentaje: regla.porcentaje,
              activo: true,
            },
          }));
        }
      }
    }

    return resultados;
  }

  async calculateCommission(empresaId: string, usuarioId: string, montoVentas: number) {
    if (!Number.isFinite(montoVentas) || montoVentas < 0) {
      throw new BadRequestException('El monto de ventas debe ser un número positivo');
    }

    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId },
      select: { id: true, nombre: true, apellido: true },
    });
    if (!usuario) {
      throw new NotFoundException('El vendedor no existe o no pertenece a tu empresa');
    }

    const reglas = await this.prisma.reglaComision.findMany({
      where: {
        empresaId,
        activo: true,
        montoMinimo: { lte: montoVentas },
        OR: [
          { montoMaximo: null },
          { montoMaximo: { gte: montoVentas } },
        ],
      },
      orderBy: { montoMinimo: 'desc' },
    });

    const nombresUsuario = [usuario.nombre, `${usuario.nombre} ${usuario.apellido}`]
      .map((nombre) => nombre.trim().toLocaleUpperCase('es'));
    const regla = reglas
      .map((candidata: any) => {
        const coincideUsuario = candidata.usuarioId === usuarioId;
        const coincideNombre = !candidata.usuarioId
          && candidata.nombreVendedor
          && nombresUsuario.includes(candidata.nombreVendedor.trim().toLocaleUpperCase('es'));
        const esGeneral = !candidata.usuarioId && !candidata.nombreVendedor;
        return {
          candidata,
          prioridad: coincideUsuario ? 3 : coincideNombre ? 2 : esGeneral ? 1 : 0,
        };
      })
      .filter(({ prioridad }) => prioridad > 0)
      .sort((a, b) => b.prioridad - a.prioridad)[0]?.candidata;

    if (!regla) {
      throw new NotFoundException('No existe una regla de comisión aplicable para este vendedor y monto');
    }

    return {
      porcentaje: regla.porcentaje,
      montoComision: Math.round((montoVentas * regla.porcentaje) / 100 * 100) / 100,
    };
  }

  /**
   * Genera el tablero y reporte consolidado de liquidación de comisiones para todo el equipo de ventas,
   * calculando ventas reales ganadas (cotizaciones aceptadas/convertidas a contrato/facturadas) y
   * aplicando las escalas correspondientes según la directriz universal.
   */
  async getTeamSettlement(empresaId: string) {
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        empresaId,
        roles: {
          some: {
            rol: { nombre: { in: ['COMERCIAL', 'GERENTE', 'ADMIN'] } },
          },
        },
      },
      select: { id: true, nombre: true, apellido: true, email: true },
      orderBy: { nombre: 'asc' },
    });

    const cotizaciones = await this.prisma.cotizacion.findMany({
      where: {
        OR: [
          { empresaId },
          { cliente: { empresaId } },
        ],
      },
      include: {
        cliente: true,
        asesor: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
        contratos: true,
      },
    });

    const reglas = await this.prisma.reglaComision.findMany({
      where: { empresaId, activo: true },
      orderBy: { montoMinimo: 'desc' },
    });

    const statsByUser = new Map<string, {
      totalCotizaciones: number;
      cotizacionesAprobadas: number;
      contratosGenerados: number;
      montoTotalVendido: number;
    }>();

    for (const u of usuarios) {
      statsByUser.set(u.id, {
        totalCotizaciones: 0,
        cotizacionesAprobadas: 0,
        contratosGenerados: 0,
        montoTotalVendido: 0,
      });
    }

    for (const q of cotizaciones) {
      let asesorId = q.asesorId || q.cliente?.vendedorId;
      if (!asesorId && q.asesor?.id) asesorId = q.asesor.id;
      if (!asesorId || !statsByUser.has(asesorId)) continue;

      const st = statsByUser.get(asesorId)!;
      st.totalCotizaciones += 1;

      const isWon = q.estado === EstadoCotizacion.ACEPTADA
        || q.estado === EstadoCotizacion.CONVERTIDA_A_CONTRATO
        || q.estado === EstadoCotizacion.FACTURADA;

      if (isWon) {
        st.cotizacionesAprobadas += 1;
        st.montoTotalVendido += q.total || 0;
        st.contratosGenerados += (q.contratos?.length || 0);
      }
    }

    const liquidaciones = usuarios.map((u) => {
      const stats = statsByUser.get(u.id) || {
        totalCotizaciones: 0,
        cotizacionesAprobadas: 0,
        contratosGenerados: 0,
        montoTotalVendido: 0,
      };

      const montoVentas = Math.round(stats.montoTotalVendido * 100) / 100;
      let porcentaje = 0;
      let comisionTotal = 0;
      let tramoAplicado = 'Sin ventas registradas';
      let estado = 'SIN_VENTAS';

      if (montoVentas > 0) {
        const reglasAplicables = reglas.filter((r) =>
          r.montoMinimo <= montoVentas && (r.montoMaximo === null || r.montoMaximo >= montoVentas)
        );

        const nombresUsuario = [u.nombre, `${u.nombre} ${u.apellido}`]
          .map((n) => n.trim().toLocaleUpperCase('es'));

        const regla = reglasAplicables
          .map((candidata: any) => {
            const coincideUsuario = candidata.usuarioId === u.id;
            const coincideNombre = !candidata.usuarioId
              && candidata.nombreVendedor
              && nombresUsuario.includes(candidata.nombreVendedor.trim().toLocaleUpperCase('es'));
            const esGeneral = !candidata.usuarioId && !candidata.nombreVendedor;
            return {
              candidata,
              prioridad: coincideUsuario ? 3 : coincideNombre ? 2 : esGeneral ? 1 : 0,
            };
          })
          .filter(({ prioridad }) => prioridad > 0)
          .sort((a, b) => b.prioridad - a.prioridad)[0]?.candidata;

        if (regla) {
          porcentaje = regla.porcentaje;
          comisionTotal = Math.round((montoVentas * regla.porcentaje) / 100 * 100) / 100;
          tramoAplicado = `De C$ ${regla.montoMinimo.toLocaleString()} a ${regla.montoMaximo ? `C$ ${regla.montoMaximo.toLocaleString()}` : 'más'} (${regla.porcentaje}%)`;
          estado = 'POR_LIQUIDAR';
        } else {
          // Fallback al formato estándar universal si aún no se han sembrado reglas
          if (montoVentas <= 800000) {
            porcentaje = 3;
            tramoAplicado = 'De C$ 1 a C$ 800,000 (3%)';
          } else if (montoVentas <= 1200000) {
            porcentaje = 2;
            tramoAplicado = 'De C$ 800,001 a C$ 1,200,000 (2%)';
          } else {
            porcentaje = 1;
            tramoAplicado = 'Más de C$ 1,200,000 (1%)';
          }
          comisionTotal = Math.round((montoVentas * porcentaje) / 100 * 100) / 100;
          estado = 'POR_LIQUIDAR';
        }
      }

      return {
        usuarioId: u.id,
        nombre: `${u.nombre} ${u.apellido}`.trim(),
        email: u.email,
        totalCotizaciones: stats.totalCotizaciones,
        cotizacionesAprobadas: stats.cotizacionesAprobadas,
        contratosGenerados: stats.contratosGenerados,
        totalVendido: montoVentas,
        porcentajeAplicado: porcentaje,
        comisionTotal,
        tramoAplicado,
        estado,
      };
    });

    liquidaciones.sort((a, b) => b.totalVendido - a.totalVendido);

    const totalVendidoEquipo = liquidaciones.reduce((acc, l) => acc + l.totalVendido, 0);
    const totalComisionesEquipo = liquidaciones.reduce((acc, l) => acc + l.comisionTotal, 0);
    const totalContratos = liquidaciones.reduce((acc, l) => acc + l.contratosGenerados, 0);
    const vendedoresConVentas = liquidaciones.filter((l) => l.totalVendido > 0).length;
    const vendedorLider = liquidaciones[0] || null;
    const tasaEfectivaPromedio = totalVendidoEquipo > 0
      ? Math.round((totalComisionesEquipo / totalVendidoEquipo) * 1000) / 10
      : 0;

    return {
      resumen: {
        totalVendidoEquipo: Math.round(totalVendidoEquipo * 100) / 100,
        totalComisionesEquipo: Math.round(totalComisionesEquipo * 100) / 100,
        totalContratos,
        vendedoresConVentas,
        totalVendedores: liquidaciones.length,
        vendedorLider: vendedorLider ? {
          usuarioId: vendedorLider.usuarioId,
          nombre: vendedorLider.nombre,
          montoVendido: vendedorLider.totalVendido,
          comision: vendedorLider.comisionTotal,
        } : null,
        tasaEfectivaPromedio,
      },
      liquidaciones,
    };
  }
}
