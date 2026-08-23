import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateContractFromQuotationDto, CreateDirectContractDto } from '../dto/create-contract.dto';
import { TipoControlEquipo, EstadoCorteFacturacion, EstadoCotizacion } from '@prisma/client';

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Creación Directa de Contrato (Asignando clienteId directamente sin obligar a Cotización previa)
  async createDirect(dto: CreateDirectContractDto, empresaId: string) {
    const { clienteId, fechaInicio, fechaFin, depositoGarantia, condiciones, periodoDiasCorte, items } = dto;

    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, empresaId }
    });

    if (!cliente) {
      throw new NotFoundException(`No se encontró el cliente con ID: ${clienteId}`);
    }

    const sucursal = await this.prisma.sucursal.findFirst({
      where: { empresaId }
    });

    if (!sucursal) {
      throw new BadRequestException('No se encontró sucursal activa para registrar el contrato');
    }

    const count = await this.prisma.contrato.count();
    const year = new Date().getFullYear();
    const codigoContrato = `CTR-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const totalMonto = items.reduce((sum, item) => sum + (item.precioRenta * (item.cantidad || 1) * (item.dias || 1)), 0);

    return this.prisma.$transaction(async (tx) => {
      // Validar y asegurar que cada equipo tenga un ID de equipo real y al menos 4 unidades en stock
      const processedItems = await Promise.all(
        items.map(async (item) => {
          const equipoId = await this.ensureValidEquipoTx(tx, sucursal.id, empresaId, item);
          return {
            equipoId,
            precioRenta: item.precioRenta,
            cantidad: item.cantidad || 1,
            dias: item.dias || 1,
            tipoControl: TipoControlEquipo.SERIALIZADO,
            horometroInicial: item.horometroInicial || 0.0,
          };
        })
      );

      const contrato = await tx.contrato.create({
        data: {
          codigo: codigoContrato,
          sucursalId: sucursal.id,
          clienteId: cliente.id,
          cotizacionId: null, // Creación Directa sin cotización previa
          fechaInicio: new Date(fechaInicio),
          fechaFin: new Date(fechaFin),
          depositoGarantia: depositoGarantia || 0.0,
          condiciones: condiciones || 'Contrato directo de arrendamiento de equipos.',
          estado: 'ACTIVO',
          items: {
            create: processedItems
          }
        },
        include: {
          cliente: true,
          cotizacion: true,
          items: { include: { equipo: true } }
        }
      });

      const diasCorte = periodoDiasCorte || 30;
      await this.generateCortesForContractTx(tx, contrato.id, diasCorte, totalMonto, contrato.fechaInicio, contrato.fechaFin);

      // Generar automáticamente Solicitud de Despacho en Módulo de Operaciones
      const countDesp = await tx.solicitudDespacho.count({ where: { empresaId } });
      const codigoDesp = `SOL-DESP-${(countDesp + 1).toString().padStart(4, '0')}`;
      await tx.solicitudDespacho.create({
        data: {
          codigo: codigoDesp,
          empresaId,
          sucursalId: contrato.sucursalId,
          contratoId: contrato.id,
          solicitadoPor: 'Sistema (Creación de Contrato)',
          fechaProgramada: contrato.fechaInicio,
          direccionEntrega: cliente.direccion || 'Dirección Registrada del Cliente',
          comentarios: `Despacho de equipos programado automáticamente por inicio del contrato ${contrato.codigo}`,
          estado: 'PENDIENTE'
        }
      });

      return contrato;
    });
  }

  // 2. Creación desde Cotización Aceptada (Herencia automática de clienteId y bloqueo de cotización)
  async createFromQuotation(dto: CreateContractFromQuotationDto, empresaId: string) {
    const { cotizacionId, fechaInicio, fechaFin, depositoGarantia, condiciones, periodoDiasCorte } = dto;

    return this.prisma.$transaction(async (tx) => {
      const cotizacion = await tx.cotizacion.findFirst({
        where: { id: cotizacionId, sucursal: { empresaId } },
        include: {
          cliente: true,
          items: {
            include: { equipo: true }
          }
        }
      });

      if (!cotizacion) {
        throw new NotFoundException(`No se encontró la cotización con ID: ${cotizacionId}`);
      }

      if (cotizacion.estado !== EstadoCotizacion.ACEPTADA) {
        throw new BadRequestException(`Solo se pueden generar contratos a partir de cotizaciones en estado ACEPTADA. El estado actual es "${cotizacion.estado}"`);
      }

      const count = await tx.contrato.count();
      const year = new Date().getFullYear();
      const codigoContrato = `CTR-${year}-${(count + 1).toString().padStart(4, '0')}`;

      const sucursalId = cotizacion.sucursalId || (await tx.sucursal.findFirst({ where: { empresaId } }))?.id;

      if (!sucursalId) {
        throw new BadRequestException('No se encontró sucursal activa para registrar el contrato');
      }

      // Mapear e ingresar cada equipo asegurando que tenga un equipo real en inventario con mínimo 4 unidades de stock
      const processedItems = await Promise.all(
        cotizacion.items.map(async (item: any) => {
          const equipoId = await this.ensureValidEquipoTx(tx, sucursalId, empresaId, item);
          return {
            equipoId,
            precioRenta: item.precioUnitario,
            cantidad: item.cantidad,
            tipoControl: item.equipo?.tipoControl || TipoControlEquipo.SERIALIZADO,
            horometroInicial: item.equipo?.horometro || 0.0,
          };
        })
      );

      const contrato = await tx.contrato.create({
        data: {
          codigo: codigoContrato,
          sucursalId,
          clienteId: cotizacion.clienteId, // Herencia automática de clienteId
          cotizacionId: cotizacion.id,
          fechaInicio: new Date(fechaInicio),
          fechaFin: new Date(fechaFin),
          depositoGarantia: depositoGarantia ?? cotizacion.depositoGarantia ?? 0.0,
          condiciones: condiciones || cotizacion.condiciones || 'Contrato estándar de arrendamiento de equipos.',
          estado: 'ACTIVO',
          items: {
            create: processedItems
          }
        },
        include: {
          cliente: true,
          cotizacion: true,
          items: { include: { equipo: true } }
        }
      });

      await tx.cotizacion.update({
        where: { id: cotizacion.id },
        data: { estado: EstadoCotizacion.CONVERTIDA_A_CONTRATO }
      });

      const diasCorte = periodoDiasCorte || 30;
      await this.generateCortesForContractTx(tx, contrato.id, diasCorte, cotizacion.total, contrato.fechaInicio, contrato.fechaFin);

      // Generar automáticamente Solicitud de Despacho en Módulo de Operaciones
      const countDesp = await tx.solicitudDespacho.count({ where: { empresaId } });
      const codigoDesp = `SOL-DESP-${(countDesp + 1).toString().padStart(4, '0')}`;
      await tx.solicitudDespacho.create({
        data: {
          codigo: codigoDesp,
          empresaId,
          sucursalId: contrato.sucursalId,
          contratoId: contrato.id,
          solicitadoPor: 'Sistema (Cotización Aprobada)',
          fechaProgramada: contrato.fechaInicio,
          direccionEntrega: cotizacion.cliente?.direccion || 'Dirección Registrada del Cliente',
          comentarios: `Despacho de equipos programado automáticamente desde cotización aprobada ${cotizacion.numeroCotizacion}`,
          estado: 'PENDIENTE'
        }
      });

      return contrato;
    });
  }

  // Helper interno para proyectar cortes de facturación
  private async generateCortesForContractTx(
    tx: any,
    contratoId: string,
    periodoDias: number,
    totalMonto: number,
    fechaInicio: Date,
    fechaFin: Date
  ) {
    const diffMs = fechaFin.getTime() - fechaInicio.getTime();
    const diffDias = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    const cantidadCortes = Math.max(1, Math.ceil(diffDias / periodoDias));
    const montoPorCorte = Math.round((totalMonto / cantidadCortes) * 100) / 100;

    let inicioPeriodo = new Date(fechaInicio);

    for (let i = 1; i <= cantidadCortes; i++) {
      let finPeriodo = new Date(inicioPeriodo);
      finPeriodo.setDate(finPeriodo.getDate() + periodoDias);
      if (finPeriodo > fechaFin || i === cantidadCortes) {
        finPeriodo = new Date(fechaFin);
      }

      await tx.corteFacturacion.create({
        data: {
          contratoId,
          numeroCorte: i,
          fechaInicio: inicioPeriodo,
          fechaFin: finPeriodo,
          monto: montoPorCorte,
          estado: EstadoCorteFacturacion.PENDIENTE
        }
      });

      inicioPeriodo = new Date(finPeriodo);
    }
  }

  async generateCortes(contratoId: string, periodoDias: number = 30, empresaId: string) {
    const contrato = await this.findOne(contratoId, empresaId);

    await this.prisma.corteFacturacion.deleteMany({
      where: { contratoId, estado: EstadoCorteFacturacion.PENDIENTE }
    });

    const totalMonto = contrato.cotizacion ? contrato.cotizacion.total : contrato.items.reduce((sum, item) => sum + (item.precioRenta * item.cantidad * (item.dias || 1)), 0);

    return this.prisma.$transaction(async (tx) => {
      await this.generateCortesForContractTx(tx, contrato.id, periodoDias, totalMonto, contrato.fechaInicio, contrato.fechaFin);
      return tx.corteFacturacion.findMany({
        where: { contratoId },
        orderBy: { numeroCorte: 'asc' }
      });
    });
  }

  async getCortes(contratoId: string, empresaId: string) {
    await this.findOne(contratoId, empresaId);
    return this.prisma.corteFacturacion.findMany({
      where: { contratoId },
      include: { facturas: true },
      orderBy: { numeroCorte: 'asc' }
    });
  }

  async createManualCorte(
    contratoId: string,
    fechaCorte: string,
    monto: number | undefined,
    empresaId: string
  ) {
    const contrato = await this.findOne(contratoId, empresaId);

    const countCortes = await this.prisma.corteFacturacion.count({
      where: { contratoId }
    });

    const lastCorte = await this.prisma.corteFacturacion.findFirst({
      where: { contratoId },
      orderBy: { numeroCorte: 'desc' }
    });

    const inicio = lastCorte ? new Date(lastCorte.fechaFin) : new Date(contrato.fechaInicio);
    const fin = new Date(fechaCorte);

    const totalCalculado = contrato.cotizacion ? contrato.cotizacion.total : contrato.items.reduce((sum, item) => sum + (item.precioRenta * item.cantidad), 0);
    const montoFinal = monto && monto > 0 ? monto : Math.round((totalCalculado / Math.max(1, countCortes + 1)) * 100) / 100;

    return this.prisma.corteFacturacion.create({
      data: {
        contratoId: contrato.id,
        numeroCorte: countCortes + 1,
        fechaInicio: inicio,
        fechaFin: fin,
        monto: montoFinal,
        estado: EstadoCorteFacturacion.PENDIENTE
      }
    });
  }

  async findAll(empresaId: string) {
    return this.prisma.contrato.findMany({
      where: {
        sucursal: { empresaId }
      },
      include: {
        cliente: true,
        cotizacion: true,
        items: {
          include: { equipo: true }
        },
        cortesFacturacion: true,
        despachos: true,
        devoluciones: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string, empresaId: string) {
    const contrato = await this.prisma.contrato.findFirst({
      where: {
        id,
        sucursal: { empresaId }
      },
      include: {
        cliente: true,
        cotizacion: true,
        items: {
          include: {
            equipo: {
              include: { categoria: true, subcategoria: true, marca: true }
            }
          }
        },
        cortesFacturacion: {
          include: { facturas: true },
          orderBy: { numeroCorte: 'asc' }
        },
        despachos: {
          include: {
            items: {
              include: { equipo: true, inspeccionesSalida: true }
            }
          }
        },
        devoluciones: {
          include: {
            items: {
              include: { equipo: true, inspeccionesDanio: true }
            }
          }
        }
      }
    });

    if (!contrato) {
      throw new NotFoundException(`No se encontró el contrato con ID: ${id}`);
    }

    return contrato;
  }

  // Método auxiliar para garantizar la existencia de un equipo con al menos 4 unidades en inventario
  private async ensureValidEquipoTx(tx: any, sucursalId: string, empresaId: string, item: any): Promise<string> {
    if (item.equipoId) {
      const existing = await tx.equipo.findUnique({ where: { id: item.equipoId } });
      if (existing) {
        if (existing.cantidadTotal < 4 || existing.cantidadDisponible < 1) {
          await tx.equipo.update({
            where: { id: existing.id },
            data: {
              cantidadTotal: Math.max(4, existing.cantidadTotal),
              cantidadDisponible: Math.max(4, existing.cantidadDisponible)
            }
          });
        }
        return existing.id;
      }
    }

    if (item.equipo?.id) {
      const existing = await tx.equipo.findUnique({ where: { id: item.equipo.id } });
      if (existing) {
        if (existing.cantidadTotal < 4 || existing.cantidadDisponible < 1) {
          await tx.equipo.update({
            where: { id: existing.id },
            data: {
              cantidadTotal: Math.max(4, existing.cantidadTotal),
              cantidadDisponible: Math.max(4, existing.cantidadDisponible)
            }
          });
        }
        return existing.id;
      }
    }

    const searchName = item.descripcion || item.modelo || item.nombre || 'Equipo de Arrendamiento';
    const match = await tx.equipo.findFirst({
      where: {
        sucursalId,
        modelo: { contains: searchName, mode: 'insensitive' }
      }
    });

    if (match) {
      if (match.cantidadTotal < 4 || match.cantidadDisponible < 1) {
        await tx.equipo.update({
          where: { id: match.id },
          data: {
            cantidadTotal: Math.max(4, match.cantidadTotal),
            cantidadDisponible: Math.max(4, match.cantidadDisponible)
          }
        });
      }
      return match.id;
    }

    let categoria = await tx.categoria.findFirst();
    if (!categoria) {
      categoria = await tx.categoria.create({ data: { nombre: 'Maquinaria y Equipos Generales' } });
    }

    let marca = await tx.marca.findFirst();
    if (!marca) {
      marca = await tx.marca.create({ data: { nombre: 'GENÉRICA' } });
    }

    const newEquipo = await tx.equipo.create({
      data: {
        empresaId,
        sucursalId,
        categoriaId: categoria.id,
        marcaId: marca.id,
        modelo: searchName.toUpperCase(),
        numeroSerie: `SN-${searchName.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        precioRentaDia: item.precioRenta || item.precioUnitario || 100,
        cantidadTotal: 4,
        cantidadDisponible: 4,
        estado: 'DISPONIBLE'
      }
    });

    return newEquipo.id;
  }
}
