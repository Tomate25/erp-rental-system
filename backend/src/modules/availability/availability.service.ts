import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getReservations(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 1. Obtener Reservas explícitas de la tabla Reserva
    const reservas = await this.prisma.reserva.findMany({
      where: {
        AND: [
          { fechaInicio: { lte: end } },
          { fechaFin: { gte: start } }
        ]
      },
      include: {
        equipo: {
          include: {
            marca: true
          }
        },
        contrato: {
          include: {
            cliente: true
          }
        }
      },
      orderBy: {
        fechaInicio: 'asc'
      }
    });

    // 2. Obtener Contratos activos y mapear sus equipos al calendario
    const contratos = await this.prisma.contrato.findMany({
      where: {
        AND: [
          { fechaInicio: { lte: end } },
          { fechaFin: { gte: start } }
        ]
      },
      include: {
        cliente: true,
        items: {
          include: {
            equipo: {
              include: {
                marca: true
              }
            }
          }
        }
      }
    });

    const contratoEvents: any[] = [];
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
              cliente: c.cliente
            }
          });
        }
      }
    }

    // 3. Obtener Despachos activos y mapear si no fueron incluidos ya
    const despachos = await this.prisma.despacho.findMany({
      include: {
        contrato: {
          include: {
            cliente: true
          }
        },
        items: {
          include: {
            equipo: {
              include: {
                marca: true
              }
            }
          }
        }
      }
    });

    const despachoEvents: any[] = [];
    for (const desp of despachos) {
      for (const item of desp.items) {
        if (item.equipo) {
          const alreadyMapped = contratoEvents.some(
            (ce) => ce.equipoId === item.equipoId && ce.contratoId === desp.contratoId
          );
          if (!alreadyMapped) {
            const fechaFinCalc = desp.contrato?.fechaFin
              ? desp.contrato.fechaFin.toISOString()
              : new Date(new Date().setDate(new Date().getDate() + 30)).toISOString();

            despachoEvents.push({
              id: `desp-${desp.id}-${item.id}`,
              equipoId: item.equipoId,
              contratoId: desp.contratoId,
              fechaInicio: desp.fechaDespacho.toISOString(),
              fechaFin: fechaFinCalc,
              estado: 'CONFIRMADA',
              equipo: item.equipo,
              contrato: desp.contrato
            });
          }
        }
      }
    }

    return [...reservas, ...contratoEvents, ...despachoEvents];
  }
}
