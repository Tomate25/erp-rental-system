import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateQuotationDto } from '../dto/create-quotation.dto';
import { UpdateQuotationDto } from '../dto/update-quotation.dto';
import { EstadoCotizacion } from '@prisma/client';

@Injectable()
export class QuotationsService {
  constructor(private prisma: PrismaService) {}

  private async generateNextQuoteNumber(): Promise<string> {
    const lastQuote = await this.prisma.cotizacion.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { numeroCotizacion: true }
    });

    let nextNumber = 1;
    if (lastQuote && lastQuote.numeroCotizacion.startsWith('COT-')) {
      const parts = lastQuote.numeroCotizacion.split('-');
      if (parts.length === 2) {
        const lastNum = parseInt(parts[1], 10);
        if (!isNaN(lastNum)) {
          nextNumber = lastNum + 1;
        }
      }
    }
    return `COT-${nextNumber.toString().padStart(4, '0')}`;
  }

  async create(createDto: CreateQuotationDto) {
    const numeroCotizacion = await this.generateNextQuoteNumber();
    const validez = createDto.validezDias || 15;
    const fechaVence = new Date();
    fechaVence.setDate(fechaVence.getDate() + validez);
    
    return this.prisma.$transaction(async (tx: any) => {
      const cotizacion = await tx.cotizacion.create({
        data: {
          numeroCotizacion,
          clienteId: createDto.clienteId,
          proyecto: createDto.proyecto,
          atencion: createDto.atencion,
          telefono: createDto.telefono,
          email: createDto.email,
          referencia: createDto.referencia,
          asesorId: createDto.asesorId,
          validezDias: validez,
          fechaVence,
          condiciones: createDto.condiciones,
          subtotal: createDto.subtotal,
          descuento: createDto.descuento || 0,
          iva: createDto.iva,
          total: createDto.total,
          depositoGarantia: createDto.depositoGarantia || 0,
          estado: createDto.estado || EstadoCotizacion.BORRADOR,
          items: {
            create: createDto.items.map((item: any) => ({
              equipoId: item.equipoId ? item.equipoId : undefined,
              descripcion: item.descripcion,
              cantidad: item.cantidad,
              dias: item.dias,
              precioUnitario: item.precioUnitario,
              descuento: item.descuento || 0,
              subtotal: item.subtotal
            }))
          }
        },
        include: {
          items: {
            include: { equipo: true }
          },
          cliente: true
        }
      });
      return cotizacion;
    });
  }

  async findAll() {
    return this.prisma.cotizacion.findMany({
      include: {
        cliente: true,
        asesor: true,
        items: {
          include: { equipo: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string) {
    const cotizacion = await this.prisma.cotizacion.findUnique({
      where: { id },
      include: {
        cliente: true,
        asesor: true,
        items: {
          include: { equipo: true }
        }
      }
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotizacion con ID ${id} no encontrada`);
    }

    return cotizacion;
  }

  async findByPublicToken(tokenPublico: string) {
    const cotizacion = await this.prisma.cotizacion.findUnique({
      where: { tokenPublico },
      include: {
        cliente: true,
        asesor: true,
        items: {
          include: { equipo: true }
        }
      }
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotizacion no encontrada`);
    }

    return cotizacion;
  }

  async update(id: string, updateDto: UpdateQuotationDto) {
    await this.findOne(id);
    
    return this.prisma.$transaction(async (tx: any) => {
      if (updateDto.items) {
        await tx.detalleCotizacion.deleteMany({
          where: { cotizacionId: id }
        });
      }

      const cotizacion = await tx.cotizacion.update({
        where: { id },
        data: {
          estado: updateDto.estado,
          clienteId: updateDto.clienteId,
          proyecto: updateDto.proyecto,
          atencion: updateDto.atencion,
          telefono: updateDto.telefono,
          email: updateDto.email,
          referencia: updateDto.referencia,
          asesorId: updateDto.asesorId,
          validezDias: updateDto.validezDias,
          condiciones: updateDto.condiciones,
          subtotal: updateDto.subtotal,
          descuento: updateDto.descuento,
          iva: updateDto.iva,
          total: updateDto.total,
          depositoGarantia: updateDto.depositoGarantia,
          items: updateDto.items ? {
            create: updateDto.items.map((item: any) => ({
              equipoId: item.equipoId ? item.equipoId : undefined,
              descripcion: item.descripcion,
              cantidad: item.cantidad,
              dias: item.dias,
              precioUnitario: item.precioUnitario,
              descuento: item.descuento || 0,
              subtotal: item.subtotal
            }))
          } : undefined
        },
        include: {
          items: {
            include: { equipo: true }
          },
          cliente: true
        }
      });

      return cotizacion;
    });
  }

  async createNewVersion(id: string) {
    const existing = await this.findOne(id);
    const validez = existing.validezDias || 15;
    const fechaVence = new Date();
    fechaVence.setDate(fechaVence.getDate() + validez);
    
    return this.prisma.$transaction(async (tx: any) => {
      const newVersion = await tx.cotizacion.create({
        data: {
          numeroCotizacion: existing.numeroCotizacion,
          version: existing.version + 1,
          clienteId: existing.clienteId,
          proyecto: existing.proyecto,
          atencion: existing.atencion,
          telefono: existing.telefono,
          email: existing.email,
          referencia: existing.referencia,
          asesorId: existing.asesorId,
          validezDias: validez,
          fechaVence,
          condiciones: existing.condiciones,
          subtotal: existing.subtotal,
          descuento: existing.descuento,
          iva: existing.iva,
          total: existing.total,
          depositoGarantia: existing.depositoGarantia,
          estado: EstadoCotizacion.EN_REVISION,
          items: {
            create: existing.items.map((item: any) => ({
              equipoId: item.equipoId ? item.equipoId : undefined,
              descripcion: item.descripcion,
              cantidad: item.cantidad,
              dias: item.dias,
              precioUnitario: item.precioUnitario,
              descuento: item.descuento,
              subtotal: item.subtotal
            }))
          }
        },
        include: {
          items: {
            include: { equipo: true }
          },
          cliente: true
        }
      });

      await tx.cotizacion.update({
        where: { id: existing.id },
        data: { estado: EstadoCotizacion.CANCELADA }
      });

      return newVersion;
    });
  }
}
