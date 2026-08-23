import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLecturaHorometroDto } from '../dto/create-lectura.dto';
import { OrigenLecturaHorometro } from '@prisma/client';

@Injectable()
export class HorometrosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createDto: CreateLecturaHorometroDto, registradoPor: string, empresaId: string) {
    const { equipoId, horometroNuevo, origen, observaciones } = createDto;

    const equipo = await this.prisma.equipo.findFirst({
      where: { id: equipoId, empresaId }
    });

    if (!equipo) {
      throw new NotFoundException(`No se encontró el equipo con ID: ${equipoId}`);
    }

    const horometroAnterior = equipo.horometro || 0.0;
    if (horometroNuevo < horometroAnterior) {
      throw new BadRequestException(`El nuevo horómetro (${horometroNuevo}) no puede ser menor al horómetro actual (${horometroAnterior})`);
    }

    const horasTrabajadas = Math.max(0, horometroNuevo - horometroAnterior);

    const lectura = await this.prisma.lecturaHorometro.create({
      data: {
        equipoId,
        horometroAnterior,
        horometroNuevo,
        horasTrabajadas,
        origen: origen || OrigenLecturaHorometro.INSPECCION_CAMPO,
        registradoPor,
        observaciones
      },
      include: {
        equipo: {
          include: { sucursal: true, categoria: true, subcategoria: true, marca: true }
        }
      }
    });

    // Actualizar horómetro del equipo
    await this.prisma.equipo.update({
      where: { id: equipoId },
      data: { horometro: horometroNuevo }
    });

    return lectura;
  }

  async findAll(empresaId: string, equipoId?: string) {
    const whereClause: any = {
      equipo: { empresaId }
    };

    if (equipoId) whereClause.equipoId = equipoId;

    return this.prisma.lecturaHorometro.findMany({
      where: whereClause,
      include: {
        equipo: {
          include: { sucursal: true, categoria: true, subcategoria: true, marca: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string, empresaId: string) {
    const lectura = await this.prisma.lecturaHorometro.findFirst({
      where: {
        id,
        equipo: { empresaId }
      },
      include: {
        equipo: {
          include: { sucursal: true, categoria: true, subcategoria: true, marca: true }
        }
      }
    });

    if (!lectura) {
      throw new NotFoundException(`No se encontró la lectura de horómetro con ID: ${id}`);
    }

    return lectura;
  }
}
