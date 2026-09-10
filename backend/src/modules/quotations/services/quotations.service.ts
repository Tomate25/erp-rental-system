import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateQuotationDto } from '../dto/create-quotation.dto';
import { UpdateQuotationDto } from '../dto/update-quotation.dto';
import { EstadoCotizacion, TipoCobro } from '@prisma/client';
import { resolveQuotationEquipment } from '../../contracts/utils/resolve-quotation-equipment';

@Injectable()
export class QuotationsService {
  constructor(private prisma: PrismaService) {}

  private async generateNextQuoteNumber(): Promise<string> {
    const lastQuote = await this.prisma.cotizacion.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { numeroCotizacion: true }
    });

    if (!lastQuote || !lastQuote.numeroCotizacion) {
      return 'COT-0001';
    }

    const match = lastQuote.numeroCotizacion.match(/^COT-(\d+)$/);
    if (!match) {
      return 'COT-0001';
    }

    const currentNumber = parseInt(match[1], 10);
    const nextNumber = currentNumber + 1;
    return `COT-${nextNumber.toString().padStart(4, '0')}`;
  }

  async create(createDto: CreateQuotationDto, empresaId: string, sucursalId?: string, usuarioId?: string) {
    const numeroCotizacion = await this.generateNextQuoteNumber();
    const validez = createDto.validezDias || 15;
    const fechaVence = new Date();
    fechaVence.setDate(fechaVence.getDate() + validez);

    const effectiveAsesorId = createDto.asesorId || usuarioId;

    const cliente = await this.prisma.cliente.findFirst({
      where: { id: createDto.clienteId, empresaId },
      select: { id: true }
    });
    if (!cliente) {
      throw new NotFoundException('El cliente no existe o no pertenece a tu empresa');
    }

    if (effectiveAsesorId) {
      const asesor = await this.prisma.usuario.findFirst({
        where: { id: effectiveAsesorId, empresaId },
        select: { nombre: true, apellido: true }
      });
      if (!asesor) {
        throw new ForbiddenException('El asesor no existe o no pertenece a tu empresa');
      }

      const asesorNombre = `${asesor.nombre} ${asesor.apellido}`.trim();
      await this.prisma.cliente.update({
        where: { id: cliente.id },
        data: { vendedor: asesorNombre }
      });
    }

    return this.prisma.cotizacion.create({
      data: {
        empresaId,
        sucursalId,
        numeroCotizacion,
        clienteId: createDto.clienteId,
        proyecto: createDto.proyecto,
        atencion: createDto.atencion,
        telefono: createDto.telefono,
        email: createDto.email,
        referencia: createDto.referencia,
        asesorId: effectiveAsesorId,
        validezDias: validez,
        fechaVence,
        condiciones: createDto.condiciones,
        notasRevision: (createDto as any).notasRevision,
        subtotal: createDto.subtotal,
        descuento: createDto.descuento || 0,
        iva: createDto.iva,
        total: createDto.total,
        depositoGarantia: createDto.depositoGarantia || 0,
        estado: createDto.estado || EstadoCotizacion.BORRADOR,
        items: {
          create: createDto.items.map((item: any) => ({
            productoId: item.productoId ? item.productoId : undefined,
            equipoId: item.equipoId ? item.equipoId : undefined,
            descripcion: item.descripcion,
            tipoCobro: item.tipoCobro || (item.tipoTarifa === 'HORA' ? TipoCobro.POR_HORA : TipoCobro.POR_DIA),
            cantidad: item.cantidad,
            dias: item.dias,
            horas: item.horas || (item.tipoCobro === TipoCobro.POR_HORA || item.tipoTarifa === 'HORA' ? item.dias : undefined),
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
  }

  async createPublic(createDto: any) {
    const numeroCotizacion = await this.generateNextQuoteNumber();
    const validez = createDto.validezDias || 15;
    const fechaVence = new Date();
    fechaVence.setDate(fechaVence.getDate() + validez);
    
    return this.prisma.$transaction(async (tx: any) => {
      let empresa = await tx.empresa.findFirst();
      if (!empresa) throw new Error('Sistema no tiene empresa configurada');

      let cliente = await tx.cliente.findFirst({
        where: { 
          emailFacturacion: createDto.email,
          empresaId: empresa.id
        }
      });

      if (!cliente) {
        cliente = await tx.cliente.create({
          data: {
            empresaId: empresa.id,
            nombre: createDto.atencion || 'Solicitante Público',
            emailFacturacion: createDto.email,
            telefono: createDto.telefono,
          }
        });
      }

      const cotizacion = await tx.cotizacion.create({
        data: {
          empresaId: empresa.id,
          numeroCotizacion,
          clienteId: cliente.id,
          proyecto: createDto.proyecto,
          atencion: createDto.atencion,
          telefono: createDto.telefono,
          email: createDto.email,
          validezDias: validez,
          fechaVence,
          condiciones: createDto.condiciones,
          subtotal: createDto.subtotal || 0,
          descuento: createDto.descuento || 0,
          iva: createDto.iva || 0,
          total: createDto.total || 0,
          depositoGarantia: createDto.depositoGarantia || 0,
          estado: EstadoCotizacion.PENDIENTE,
          items: {
            create: createDto.items?.map((item: any) => ({
              descripcion: item.descripcion,
              cantidad: item.cantidad,
              dias: item.dias,
              precioUnitario: item.precioUnitario,
              descuento: item.descuento || 0,
              subtotal: item.subtotal
            })) || []
          }
        },
        include: {
          items: true,
          cliente: true
        }
      });
      return cotizacion;
    });
  }

  async findAll(empresaId?: string) {
    const whereClause: any = empresaId
      ? {
          OR: [
            { empresaId },
            { cliente: { empresaId } }
          ]
        }
      : {};

    return this.prisma.cotizacion.findMany({
      where: whereClause,
      include: {
        cliente: true,
        items: {
          include: { equipo: true }
        },
        contratos: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string, empresaId?: string) {
    const whereClause: any = { id };
    if (empresaId) {
      whereClause.OR = [
        { empresaId },
        { cliente: { empresaId } }
      ];
    }

    const cotizacion = await this.prisma.cotizacion.findFirst({
      where: whereClause,
      include: {
        cliente: true,
        items: {
          include: { equipo: true }
        },
        contratos: true,
      }
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
    }

    return cotizacion;
  }

  async findByNumero(numeroCotizacion: string, empresaId?: string) {
    const whereClause: any = { numeroCotizacion };
    if (empresaId) {
      whereClause.OR = [
        { empresaId },
        { cliente: { empresaId } }
      ];
    }

    const cotizacion = await this.prisma.cotizacion.findFirst({
      where: whereClause,
      include: {
        cliente: true,
        items: {
          include: { equipo: true }
        },
        contratos: true,
      }
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización con Número ${numeroCotizacion} no encontrada`);
    }

    return cotizacion;
  }

  async findByPublicToken(tokenPublico: string) {
    const cotizacion = await this.prisma.cotizacion.findUnique({
      where: { tokenPublico },
      include: {
        cliente: true,
        asesor: {
          select: { id: true, nombre: true, apellido: true, email: true }
        },
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

  async update(id: string, updateDto: UpdateQuotationDto, empresaId: string, usuarioId?: string) {
    const existing = await this.findOne(id, empresaId);
    
    return this.prisma.$transaction(async (tx: any) => {
      // Bloqueo pesimista de fila en PostgreSQL para evitar aprobaciones simultáneas
      await tx.$executeRaw`SELECT id FROM "cotizaciones" WHERE id = ${id} FOR UPDATE`;

      const current = await tx.cotizacion.findUnique({
        where: { id },
        include: { contratos: true }
      });

      if (!current) {
        throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
      }

      if (
        updateDto.estado === EstadoCotizacion.ACEPTADA &&
        (current.estado === EstadoCotizacion.ACEPTADA || current.contratos.length > 0)
      ) {
        throw new ConflictException('Esta cotización ya fue aceptada o formalizada en contrato por otro usuario.');
      }

      const targetClienteId = updateDto.clienteId || existing.clienteId;
      const targetCliente = await tx.cliente.findFirst({
        where: { id: targetClienteId, empresaId },
        select: { id: true }
      });
      if (!targetCliente) {
        throw new NotFoundException('El cliente no existe o no pertenece a tu empresa');
      }

      if (updateDto.items) {
        await tx.detalleCotizacion.deleteMany({
          where: { cotizacionId: id }
        });
      }

      const effectiveAsesorId = updateDto.asesorId || usuarioId || existing.asesorId;
      if (effectiveAsesorId) {
        const asesor = await tx.usuario.findFirst({
          where: { id: effectiveAsesorId, empresaId },
          select: { nombre: true, apellido: true }
        });
        if (!asesor) {
          throw new ForbiddenException('El asesor no existe o no pertenece a tu empresa');
        }
        await tx.cliente.update({
          where: { id: targetCliente.id },
          data: { vendedor: `${asesor.nombre} ${asesor.apellido}`.trim() }
        });
      }

      const cotizacion = await tx.cotizacion.update({
        where: { id: existing.id },
        data: {
          estado: updateDto.estado,
          clienteId: updateDto.clienteId,
          proyecto: updateDto.proyecto,
          atencion: updateDto.atencion,
          telefono: updateDto.telefono,
          email: updateDto.email,
          referencia: updateDto.referencia,
          asesorId: effectiveAsesorId,
          validezDias: updateDto.validezDias,
          condiciones: updateDto.condiciones,
          notasRevision: updateDto.notasRevision,
          subtotal: updateDto.subtotal,
          descuento: updateDto.descuento,
          iva: updateDto.iva,
          total: updateDto.total,
          depositoGarantia: updateDto.depositoGarantia,
          items: updateDto.items ? {
            create: updateDto.items.map((item: any) => ({
              equipoId: item.equipoId ? item.equipoId : undefined,
              descripcion: item.descripcion,
              tipoCobro: item.tipoCobro || (item.tipoTarifa === 'HORA' ? TipoCobro.POR_HORA : TipoCobro.POR_DIA),
              cantidad: item.cantidad,
              dias: item.dias,
              horas: item.horas || (item.tipoCobro === TipoCobro.POR_HORA || item.tipoTarifa === 'HORA' ? item.dias : undefined),
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

      // Si la cotización cambia a estado ACEPTADA (Aprobada), generar automáticamente el Contrato y la Solicitud de Despacho en Operaciones
      if (updateDto.estado === EstadoCotizacion.ACEPTADA && existing.estado !== EstadoCotizacion.ACEPTADA) {
        const existingContract = await tx.contrato.findFirst({
          where: { cotizacionId: cotizacion.id }
        });
        if (existingContract) {
          return cotizacion;
        }

        const countContrato = await tx.contrato.count();
        const year = new Date().getFullYear();
        const codigoContrato = `CTR-${year}-${(countContrato + 1).toString().padStart(4, '0')}`;
        const empId = cotizacion.empresaId || empresaId || (cotizacion.cliente as any)?.empresaId || '';
        const contractItems = await resolveQuotationEquipment(tx, cotizacion.items, empId, cotizacion.sucursalId);

        const contrato = await tx.contrato.create({
          data: {
            codigo: codigoContrato,
            sucursalId: cotizacion.sucursalId,
            clienteId: cotizacion.clienteId,
            cotizacionId: cotizacion.id,
            fechaInicio: new Date(),
            fechaFin: new Date(Date.now() + (cotizacion.validezDias || 30) * 24 * 60 * 60 * 1000),
            depositoGarantia: cotizacion.depositoGarantia || 0.0,
            condiciones: cotizacion.condiciones || 'Contrato generado automáticamente por aprobación de cotización.',
            estado: 'ACTIVO',
            items: {
              create: contractItems
            }
          }
        });

        const countDesp = await tx.solicitudDespacho.count();
        const codigoDesp = `SOL-DESP-${(countDesp + 1).toString().padStart(4, '0')}`;
        await tx.solicitudDespacho.create({
          data: {
            codigo: codigoDesp,
            empresaId: empId,
            sucursalId: cotizacion.sucursalId,
            contratoId: contrato.id,
            solicitadoPor: 'Sistema (Aprobación de Cotización)',
            fechaProgramada: new Date(),
            direccionEntrega: cotizacion.cliente?.direccion || 'Dirección Registrada del Cliente',
            comentarios: `Despacho de equipos generado por aprobación de cotización ${cotizacion.numeroCotizacion}`,
            estado: 'PENDIENTE'
          }
        });
      }

      return cotizacion;
    });
  }

  async createNewVersion(id: string, empresaId?: string) {
    const existing = await this.findOne(id, empresaId);
    const validez = existing.validezDias || 15;
    const fechaVence = new Date();
    fechaVence.setDate(fechaVence.getDate() + validez);
    
    return this.prisma.$transaction(async (tx: any) => {
      const newVersion = await tx.cotizacion.create({
        data: {
          empresaId: existing.empresaId || empresaId,
          sucursalId: existing.sucursalId,
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
          notasRevision: null,
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

  async findVersionsByNumber(numeroCotizacion: string, empresaId?: string) {
    const whereClause: any = { numeroCotizacion };
    if (empresaId) {
      whereClause.OR = [
        { empresaId },
        { cliente: { empresaId } }
      ];
    }

    return this.prisma.cotizacion.findMany({
      where: whereClause,
      include: {
        cliente: true,
        asesor: {
          select: { id: true, nombre: true, apellido: true, email: true }
        },
        items: {
          include: { equipo: true }
        }
      },
      orderBy: { version: 'desc' }
    });
  }
}
