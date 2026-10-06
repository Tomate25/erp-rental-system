import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  EstadoContrato,
  EstadoEquipo,
  EstadoReserva,
  Prisma,
  TipoControlEquipo,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AvailabilityTimelineEvent {
  id: string;
  equipoId: string;
  contratoId: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
  equipo: unknown;
  contrato: unknown;
}

export interface EquipmentPeriodStatus {
  id: string;
  estadoEquipo?: EstadoEquipo;
  codigo: string | null;
  descripcion: string;
  modelo: string;
  numeroSerie: string | null;
  categoriaId: string;
  categoriaNombre?: string;
  marcaNombre?: string;
  tipoControl: TipoControlEquipo;
  cantidadTotal: number;
  cantidadDisponibleActual: number;
  cantidadDisponiblePeriodo: number;
  isAvailable: boolean;
  statusPeriodo: 'DISPONIBLE' | 'OCUPADO' | 'PARCIAL' | 'MANTENIMIENTO';
  fechaEstimadaLiberacion: string | null;
  motivoOcupacion: string | null;
  precioRentaDia: number;
  precioRentaHora: number;
  precioDiaB?: number;
  precioDiaC?: number;
  precioHoraB?: number;
  precioHoraC?: number;
  modalidadRenta?: string;
  isLineaAmarilla?: boolean;
}

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getReservations(startDate: string, endDate: string, empresaId: string) {
    if (typeof empresaId !== 'string' || !empresaId.trim()) {
      throw new ForbiddenException('El usuario no tiene una empresa asignada.');
    }
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Obtener Reservas explícitas de la tabla Reserva
    const reservas = await this.prisma.reserva.findMany({
      where: {
        equipo: { empresaId },
        contrato: { sucursal: { empresaId }, cliente: { empresaId } },
        AND: [{ fechaInicio: { lte: end } }, { fechaFin: { gte: start } }],
      },
      include: {
        equipo: {
          include: {
            marca: true,
          },
        },
        contrato: {
          include: {
            cliente: true,
          },
        },
      },
      orderBy: {
        fechaInicio: 'asc',
      },
    });

    // 2. Obtener Contratos activos y mapear sus equipos al calendario
    const contratos = await this.prisma.contrato.findMany({
      where: {
        sucursal: { empresaId },
        cliente: { empresaId },
        AND: [{ fechaInicio: { lte: end } }, { fechaFin: { gte: start } }],
      },
      include: {
        cliente: true,
        items: {
          where: { equipo: { empresaId } },
          include: {
            equipo: {
              include: {
                marca: true,
              },
            },
          },
        },
      },
    });

    const contratoEvents: AvailabilityTimelineEvent[] = [];
    for (const c of contratos) {
      for (const d of c.items) {
        if (d.equipo) {
          contratoEvents.push({
            id: `ctr-${c.id}-${d.id}`,
            equipoId: d.equipoId,
            contratoId: c.id,
            fechaInicio: c.fechaInicio.toISOString(),
            fechaFin: c.fechaFin.toISOString(),
            estado: 'CONFIRMADA',
            equipo: d.equipo,
            contrato: {
              id: c.id,
              numeroContrato: c.codigo,
              cliente: c.cliente,
            },
          });
        }
      }
    }

    // 3. Obtener Despachos activos y mapear si no fueron incluidos ya
    const despachos = await this.prisma.despacho.findMany({
      where: {
        sucursal: { empresaId },
        contrato: { sucursal: { empresaId }, cliente: { empresaId } },
      },
      include: {
        contrato: {
          include: {
            cliente: true,
          },
        },
        items: {
          where: { equipo: { empresaId } },
          include: {
            equipo: {
              include: {
                marca: true,
              },
            },
          },
        },
      },
    });

    const despachoEvents: AvailabilityTimelineEvent[] = [];
    for (const desp of despachos) {
      for (const item of desp.items) {
        if (item.equipo) {
          const alreadyMapped = contratoEvents.some(
            (ce) =>
              ce.equipoId === item.equipoId &&
              ce.contratoId === desp.contratoId,
          );
          if (!alreadyMapped) {
            const fechaFinCalc = desp.contrato?.fechaFin
              ? desp.contrato.fechaFin.toISOString()
              : new Date(
                  new Date().setDate(new Date().getDate() + 30),
                ).toISOString();

            despachoEvents.push({
              id: `desp-${desp.id}-${item.id}`,
              equipoId: item.equipoId,
              contratoId: desp.contratoId,
              fechaInicio: desp.fechaDespacho.toISOString(),
              fechaFin: fechaFinCalc,
              estado: 'CONFIRMADA',
              equipo: item.equipo,
              contrato: desp.contrato,
            });
          }
        }
      }
    }

    return [...reservas, ...contratoEvents, ...despachoEvents];
  }

  async getEquipmentPeriodAvailability(
    startDate: string,
    endDate: string,
    empresaId: string,
    categoriaId?: string,
  ): Promise<EquipmentPeriodStatus[]> {
    if (typeof empresaId !== 'string' || !empresaId.trim()) {
      throw new ForbiddenException('El usuario no tiene una empresa asignada.');
    }
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate
      ? new Date(endDate)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Fechas de período inválidas.');
    }

    const whereEquipos: Prisma.EquipoWhereInput = {
      empresaId,
      ...(categoriaId && categoriaId !== 'ALL' ? { categoriaId } : {}),
    };

    const equipos = await this.prisma.equipo.findMany({
      where: whereEquipos,
      include: {
        categoria: { select: { id: true, nombre: true, isLineaAmarilla: true } },
        marca: { select: { id: true, nombre: true } },
      },
      orderBy: [{ categoria: { nombre: 'asc' } }, { codigo: 'asc' }],
    });

    // 1. Reservas activas dentro del rango
    const reservas = await this.prisma.reserva.findMany({
      where: {
        equipo: { empresaId },
        estado: { in: [EstadoReserva.CONFIRMADA, EstadoReserva.PENDIENTE] },
        contrato: {
          sucursal: { empresaId },
          cliente: { empresaId },
          estado: {
            notIn: [EstadoContrato.CANCELADO, EstadoContrato.FINALIZADO],
          },
        },
        AND: [{ fechaInicio: { lte: end } }, { fechaFin: { gte: start } }],
      },
      select: {
        equipoId: true,
        contratoId: true,
        fechaInicio: true,
        fechaFin: true,
        contrato: {
          select: {
            codigo: true,
            cliente: { select: { nombre: true } },
          },
        },
      },
    });

    // 2. Contratos activos solapados y contratos activos con despachos sin retorno
    const contratos = await this.prisma.contrato.findMany({
      where: {
        sucursal: { empresaId },
        cliente: { empresaId },
        estado: { in: [EstadoContrato.ACTIVO, EstadoContrato.SIN_ABRIR] },
        OR: [
          // Solapados con el período consultado
          {
            AND: [{ fechaInicio: { lte: end } }, { fechaFin: { gte: start } }],
          },
          // Contratos activos iniciados antes del fin del período (pueden tener despachos sin retornar)
          {
            estado: EstadoContrato.ACTIVO,
            fechaInicio: { lte: end },
          },
        ],
      },
      select: {
        id: true,
        codigo: true,
        fechaInicio: true,
        fechaFin: true,
        cliente: { select: { nombre: true } },
        items: {
          where: { equipo: { empresaId } },
          select: {
            equipoId: true,
            cantidad: true,
          },
        },
        despachos: {
          select: {
            id: true,
            items: {
              where: { equipo: { empresaId } },
              select: {
                equipoId: true,
                cantidad: true,
              },
            },
          },
        },
        devoluciones: {
          select: {
            id: true,
            items: {
              where: { equipo: { empresaId } },
              select: {
                equipoId: true,
                cantidadRetornada: true,
              },
            },
          },
        },
      },
    });

    // Construcción de mapa de ocupación por equipo con deduplicación por contrato
    const occupancyByEquipment = new Map<
      string,
      Array<{
        contratoId: string;
        codigoContrato: string;
        clienteNombre?: string;
        fechaFin: Date;
        cantidad: number;
      }>
    >();
    const fullyReturned = new Set<string>();

    const now = new Date();

    for (const c of contratos) {
      // Equipos del contrato y de sus despachos
      const eqIdsInContract = new Set<string>();
      for (const item of c.items) {
        if (item.equipoId) eqIdsInContract.add(item.equipoId);
      }
      for (const d of c.despachos) {
        for (const di of d.items) {
          if (di.equipoId) eqIdsInContract.add(di.equipoId);
        }
      }

      for (const equipoId of eqIdsInContract) {
        const sent = c.despachos
          .flatMap((d) => d.items)
          .filter((di) => di.equipoId === equipoId)
          .reduce((sum, di) => sum + (Number(di.cantidad) || 1), 0);
        const received = c.devoluciones
          .flatMap((r) => r.items)
          .filter((ri) => ri.equipoId === equipoId)
          .reduce((sum, ri) => sum + Number(ri.cantidadRetornada || 0), 0);
        const netOut = Math.max(0, sent - received);

        const itemContrato = c.items.find((i) => i.equipoId === equipoId);
        const cantContratada = itemContrato
          ? Number(itemContrato.cantidad) || 1
          : 0;

        if (sent > 0 && received >= cantContratada && netOut === 0) {
          fullyReturned.add(`${c.id}:${equipoId}`);
        }

        const isOverdue = c.fechaFin < now && netOut > 0;
        const overlapsPeriod = c.fechaInicio <= end && c.fechaFin >= start;

        if (isOverdue) {
          // Despacho no devuelto cuya fecha contractual ya expiró:
          // Bloquea disponibilidad hasta que se registre la devolución física formal
          const list = occupancyByEquipment.get(equipoId) || [];
          list.push({
            contratoId: c.id,
            codigoContrato: `${c.codigo} (Vencido sin retorno)`,
            clienteNombre: c.cliente?.nombre,
            fechaFin: c.fechaFin,
            cantidad: netOut,
          });
          occupancyByEquipment.set(equipoId, list);
        } else if (overlapsPeriod) {
          // Contrato en curso o programado que coincide con el período consultado
          const effectiveCant = Math.max(cantContratada - received, netOut);
          if (effectiveCant > 0) {
            const list = occupancyByEquipment.get(equipoId) || [];
            list.push({
              contratoId: c.id,
              codigoContrato: c.codigo,
              clienteNombre: c.cliente?.nombre,
              fechaFin: c.fechaFin,
              cantidad: effectiveCant,
            });
            occupancyByEquipment.set(equipoId, list);
          }
        }
      }
    }

    // Mapear reservas huérfanas
    for (const res of reservas) {
      if (fullyReturned.has(`${res.contratoId}:${res.equipoId}`)) continue;
      const list = occupancyByEquipment.get(res.equipoId) || [];
      const alreadyIncluded = list.some(
        (occ) => occ.contratoId === res.contratoId,
      );
      if (!alreadyIncluded) {
        list.push({
          contratoId: res.contratoId,
          codigoContrato: res.contrato?.codigo || 'Reserva',
          clienteNombre: res.contrato?.cliente?.nombre,
          fechaFin: res.fechaFin,
          cantidad: 1,
        });
        occupancyByEquipment.set(res.equipoId, list);
      }
    }

    return equipos.map((eq) => {
      const pDia = Number(eq.precioRentaDia) || 0;
      const pHora =
        Number(eq.precioRentaHora) ||
        (pDia > 0 ? Math.round((pDia / 8) * 100) / 100 : 0);

      // Verificación de estado de mantenimiento / fuera de servicio
      const isMantenimiento = (
        [
          EstadoEquipo.MANTENIMIENTO,
          EstadoEquipo.EN_MANTENIMIENTO,
          EstadoEquipo.FUERA_DE_SERVICIO,
          EstadoEquipo.BAJA,
        ] as EstadoEquipo[]
      ).includes(eq.estado);

      if (isMantenimiento) {
        return {
          id: eq.id,
          estadoEquipo: eq.estado,
          codigo: eq.codigo,
          descripcion: eq.descripcion || eq.modelo,
          modelo: eq.modelo,
          numeroSerie: eq.numeroSerie,
          categoriaId: eq.categoriaId,
          categoriaNombre: eq.categoria?.nombre,
          marcaNombre: eq.marca?.nombre,
          tipoControl: eq.tipoControl,
          cantidadTotal: eq.cantidadTotal,
          cantidadDisponibleActual: eq.cantidadDisponible,
          cantidadDisponiblePeriodo: 0,
          isAvailable: false,
          statusPeriodo: 'MANTENIMIENTO' as const,
          fechaEstimadaLiberacion: null,
          motivoOcupacion: 'Equipo en mantenimiento o fuera de servicio',
          precioRentaDia: pDia,
          precioRentaHora: pHora,
          precioDiaB: Number(eq.precioDiaB) || 0,
          precioDiaC: Number(eq.precioDiaC) || 0,
          precioHoraB: Number(eq.precioHoraB) || 0,
          precioHoraC: Number(eq.precioHoraC) || 0,
          modalidadRenta: eq.modalidadRenta,
          isLineaAmarilla: Boolean(eq.categoria?.isLineaAmarilla || (eq.codigo && eq.codigo.startsWith('08-')) || eq.modalidadRenta === 'SOLO_HORA'),
        };
      }

      const commitments = occupancyByEquipment.get(eq.id) || [];
      const totalCommitted = commitments.reduce(
        (sum, c) => sum + c.cantidad,
        0,
      );

      // Fecha estimada de liberación más lejana
      let latestFin: Date | null = null;
      let primaryMotivo: string | null = null;

      if (commitments.length > 0) {
        const sorted = [...commitments].sort(
          (a, b) => b.fechaFin.getTime() - a.fechaFin.getTime(),
        );
        latestFin = sorted[0].fechaFin;
        primaryMotivo = `${sorted[0].codigoContrato}${
          sorted[0].clienteNombre ? ` (${sorted[0].clienteNombre})` : ''
        }`;
      }

      if (eq.tipoControl === TipoControlEquipo.SERIALIZADO) {
        const isCurrentPeriod = start <= now;
        const isPhysicallyUnavailable =
          eq.cantidadDisponible <= 0 ||
          eq.estado === EstadoEquipo.RENTADO ||
          eq.estado === EstadoEquipo.DESPACHADO;

        // Falla segura / despacho inconsistente:
        // Si está marcado físicamente como RENTADO o DESPACHADO pero ningún contrato
        // en el sistema reporta cuándo terminará, por seguridad física permanece ocupado
        const hasUnscheduledRent =
          isPhysicallyUnavailable &&
          !contratos.some(
            (c) =>
              c.items.some((it) => it.equipoId === eq.id) ||
              c.despachos.some((d) =>
                d.items.some((di) => di.equipoId === eq.id),
              ),
          );

        const isOccupied =
          totalCommitted > 0 ||
          (isCurrentPeriod && isPhysicallyUnavailable) ||
          hasUnscheduledRent;

        return {
          id: eq.id,
          codigo: eq.codigo,
          descripcion: eq.descripcion || eq.modelo,
          modelo: eq.modelo,
          numeroSerie: eq.numeroSerie,
          categoriaId: eq.categoriaId,
          categoriaNombre: eq.categoria?.nombre,
          marcaNombre: eq.marca?.nombre,
          tipoControl: eq.tipoControl,
          cantidadTotal: 1,
          cantidadDisponibleActual: eq.cantidadDisponible,
          cantidadDisponiblePeriodo: isOccupied ? 0 : 1,
          isAvailable: !isOccupied,
          statusPeriodo: isOccupied
            ? ('OCUPADO' as const)
            : ('DISPONIBLE' as const),
          fechaEstimadaLiberacion:
            isOccupied && latestFin ? latestFin.toISOString() : null,
          motivoOcupacion: isOccupied
            ? primaryMotivo || 'Rentado / en despacho'
            : null,
          precioRentaDia: pDia,
          precioRentaHora: pHora,
          precioDiaB: Number(eq.precioDiaB) || 0,
          precioDiaC: Number(eq.precioDiaC) || 0,
          precioHoraB: Number(eq.precioHoraB) || 0,
          precioHoraC: Number(eq.precioHoraC) || 0,
          modalidadRenta: eq.modalidadRenta,
          isLineaAmarilla: Boolean(eq.categoria?.isLineaAmarilla || (eq.codigo && eq.codigo.startsWith('08-')) || eq.modalidadRenta === 'SOLO_HORA'),
        };
      } else {
        const totalCap = eq.cantidadTotal || 1;
        const isCurrentPeriod = start <= now;
        const physicalUnavailable = isCurrentPeriod
          ? Math.max(0, totalCap - Math.min(eq.cantidadDisponible, totalCap))
          : 0;
        // La disponibilidad física ya refleja unidades despachadas. Restar además
        // todos los compromisos duplicaba la ocupación. Para el período se toma
        // el mayor bloqueo conocido: físico actual o contractual.
        const blockedUnits = Math.min(
          totalCap,
          Math.max(physicalUnavailable, totalCommitted),
        );
        const dispPeriodo = Math.max(0, totalCap - blockedUnits);
        const isAvailable = dispPeriodo > 0;
        const statusPeriodo =
          dispPeriodo >= totalCap
            ? ('DISPONIBLE' as const)
            : dispPeriodo > 0
              ? ('PARCIAL' as const)
              : ('OCUPADO' as const);

        return {
          id: eq.id,
          codigo: eq.codigo,
          descripcion: eq.descripcion || eq.modelo,
          modelo: eq.modelo,
          numeroSerie: eq.numeroSerie,
          categoriaId: eq.categoriaId,
          categoriaNombre: eq.categoria?.nombre,
          marcaNombre: eq.marca?.nombre,
          tipoControl: eq.tipoControl,
          cantidadTotal: totalCap,
          cantidadDisponibleActual: eq.cantidadDisponible,
          cantidadDisponiblePeriodo: dispPeriodo,
          isAvailable,
          statusPeriodo,
          fechaEstimadaLiberacion:
            totalCommitted > 0 && latestFin ? latestFin.toISOString() : null,
          motivoOcupacion:
            blockedUnits > 0
              ? `${blockedUnits} de ${totalCap} u. comprometidas (${
                  primaryMotivo || 'Contratos activos'
                })`
              : null,
          precioRentaDia: pDia,
          precioRentaHora: pHora,
          precioDiaB: Number(eq.precioDiaB) || 0,
          precioDiaC: Number(eq.precioDiaC) || 0,
          precioHoraB: Number(eq.precioHoraB) || 0,
          precioHoraC: Number(eq.precioHoraC) || 0,
          modalidadRenta: eq.modalidadRenta,
          isLineaAmarilla: Boolean(eq.categoria?.isLineaAmarilla || (eq.codigo && eq.codigo.startsWith('08-')) || eq.modalidadRenta === 'SOLO_HORA'),
        };
      }
    });
  }
}
