import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async getReservations(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

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

    return reservas;
  }
}
