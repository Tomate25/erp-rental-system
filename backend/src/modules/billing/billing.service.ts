import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoFactura, CondicionPagoFactura, EstadoCotizacion, EstadoCorteFacturacion, EstadoFactura } from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async getPendingQuotations(empresaId?: string) {
    const whereClause: any = {
      estado: EstadoCotizacion.ACEPTADA,
      contratos: { none: {} }
    };

    if (empresaId) {
      whereClause.OR = [
        { empresaId },
        { cliente: { empresaId } }
      ];
    }

    return this.prisma.cotizacion.findMany({
      where: whereClause,
      include: {
        cliente: true
      }
    });
  }

  async getPendingCortes(empresaId?: string) {
    return this.prisma.corteFacturacion.findMany({
      where: {
        estado: EstadoCorteFacturacion.PENDIENTE
      },
      include: {
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
  }

  // 1. Facturar una Cotización Comercial directa (Solo si NO ha sido convertida a Contrato)
  async invoiceQuotation(id: string, payload: any, empresaId?: string) {
    const whereClause: any = { id };
    if (empresaId) {
      whereClause.OR = [
        { empresaId },
        { cliente: { empresaId } }
      ];
    }

    const cotizacion = await this.prisma.cotizacion.findFirst({
      where: whereClause,
      include: { items: { include: { equipo: true } }, cliente: true, facturas: true }
    });

    if (!cotizacion) throw new NotFoundException('Cotización no encontrada');

    // Bloqueo de Doble Cobro: Si la cotización fue convertida a Contrato, se rechaza la facturación directa
    if (cotizacion.estado === EstadoCotizacion.CONVERTIDA_A_CONTRATO) {
      throw new ConflictException('No se puede facturar directamente esta cotización porque ya ha sido convertida en un Contrato. Utilice los cortes de facturación del contrato.');
    }

    if (cotizacion.estado === EstadoCotizacion.FACTURADA || (cotizacion.facturas && cotizacion.facturas.length > 0)) {
      throw new ConflictException('Esta cotización ya fue facturada previamente.');
    }

    if (cotizacion.estado !== EstadoCotizacion.ACEPTADA) {
      throw new BadRequestException(`Solo se pueden facturar cotizaciones en estado ACEPTADA. Estado actual: ${cotizacion.estado}`);
    }

    let sucursalId = payload.sucursalId || cotizacion.sucursalId;
    if (!sucursalId) {
      const firstSucursal = await this.prisma.sucursal.findFirst({
        where: empresaId ? { empresaId } : undefined
      });
      if (!firstSucursal) throw new BadRequestException('No hay sucursales configuradas');
      sucursalId = firstSucursal.id;
    }

    const folio = `FAC-COT-${Math.floor(100000 + Math.random() * 900000)}`;
    const empId = cotizacion.empresaId || empresaId || (cotizacion.cliente as any)?.empresaId || '';

    return this.prisma.$transaction(async (tx) => {
      // Crear la Factura con origen cotizacionId (Patrón XOR)
      const factura = await tx.factura.create({
        data: {
          folio,
          empresaId: empId,
          sucursalId,
          clienteId: cotizacion.clienteId,
          cotizacionId: cotizacion.id,
          tipoFactura: (payload.tipoFactura as TipoFactura) || TipoFactura.ESTANDAR,
          condicionPago: (payload.condicionPago as CondicionPagoFactura) || CondicionPagoFactura.CONTADO,
          plazoCreditoDias: payload.plazoCreditoDias,
          retencionIva: payload.retencionIva || 0,
          subtotal: cotizacion.subtotal,
          iva: cotizacion.iva,
          total: cotizacion.total,
          estado: payload.estado === 'PAGADA' ? EstadoFactura.PAGADA : EstadoFactura.PENDIENTE,
          fechaVence: new Date(Date.now() + (payload.plazoCreditoDias || 0) * 24 * 60 * 60 * 1000),
        },
        include: { cliente: true, cotizacion: true }
      });

      // Actualizar estado de la cotización origen a FACTURADA
      await tx.cotizacion.update({
        where: { id: cotizacion.id },
        data: { estado: EstadoCotizacion.FACTURADA }
      });

      // Si la cotización facturada posee ítems de maquinaria, generar automáticamente el contrato operativo para Operaciones
      if (cotizacion.items && cotizacion.items.length > 0) {
        const countContrato = await tx.contrato.count();
        const year = new Date().getFullYear();
        const codigoContrato = `CTR-${year}-${(countContrato + 1).toString().padStart(4, '0')}`;

        const contrato = await tx.contrato.create({
          data: {
            codigo: codigoContrato,
            sucursalId,
            clienteId: cotizacion.clienteId,
            cotizacionId: cotizacion.id,
            fechaInicio: new Date(),
            fechaFin: new Date(Date.now() + (cotizacion.validezDias || 30) * 24 * 60 * 60 * 1000),
            depositoGarantia: cotizacion.depositoGarantia || 0.0,
            condiciones: cotizacion.condiciones || 'Contrato generado automáticamente por facturación de cotización.',
            estado: 'ACTIVO',
            items: {
              create: cotizacion.items.map(item => ({
                equipoId: item.equipoId || item.id,
                precioRenta: item.precioUnitario,
                cantidad: item.cantidad,
                tipoControl: item.equipo?.tipoControl || 'SERIALIZADO',
                horometroInicial: item.equipo?.horometro || 0.0,
              }))
            }
          }
        });

        const countDesp = await tx.solicitudDespacho.count();
        const codigoDesp = `SOL-DESP-${(countDesp + 1).toString().padStart(4, '0')}`;
        await tx.solicitudDespacho.create({
          data: {
            codigo: codigoDesp,
            empresaId: empId,
            sucursalId,
            contratoId: contrato.id,
            solicitadoPor: 'Sistema (Facturación Directa de Cotización)',
            fechaProgramada: new Date(),
            direccionEntrega: cotizacion.cliente?.direccion || 'Dirección Registrada del Cliente',
            comentarios: `Despacho de equipos generado por facturación de cotización ${cotizacion.numeroCotizacion}`,
            estado: 'PENDIENTE'
          }
        });
      }

      return factura;
    });
  }

  // 2. Facturar un Corte de Facturación de Contrato (Ciclo de Cobro a Largo Plazo)
  async invoiceCorte(corteId: string, payload: any, empresaId?: string) {
    const corte = await this.prisma.corteFacturacion.findFirst({
      where: {
        id: corteId,
        contrato: {
          sucursal: { empresaId }
        }
      },
      include: {
        contrato: {
          include: { cliente: true, sucursal: true }
        },
        facturas: true
      }
    });

    if (!corte) {
      throw new NotFoundException(`No se encontró el corte de facturación con ID: ${corteId}`);
    }

    if (corte.estado === EstadoCorteFacturacion.FACTURADO || (corte.facturas && corte.facturas.length > 0)) {
      throw new ConflictException(`El corte de facturación #${corte.numeroCorte} del contrato ya ha sido facturado previamente.`);
    }

    if (corte.estado !== EstadoCorteFacturacion.PENDIENTE) {
      throw new BadRequestException(`Solo se pueden facturar cortes en estado PENDIENTE. Estado actual: ${corte.estado}`);
    }

    const contrato = corte.contrato;
    const subtotal = Math.round((corte.monto / 1.15) * 100) / 100;
    const iva = Math.round((corte.monto - subtotal) * 100) / 100;
    const folio = `FAC-CRT-${contrato.codigo}-C${corte.numeroCorte}`;

    return this.prisma.$transaction(async (tx) => {
      // Crear la Factura con origen corteId (Patrón XOR)
      const factura = await tx.factura.create({
        data: {
          folio,
          empresaId: contrato.sucursal.empresaId || empresaId,
          sucursalId: contrato.sucursalId,
          clienteId: contrato.clienteId,
          contratoId: contrato.id,
          corteId: corte.id,
          corteNumero: corte.numeroCorte,
          tipoFactura: (payload.tipoFactura as TipoFactura) || TipoFactura.ESTANDAR,
          condicionPago: (payload.condicionPago as CondicionPagoFactura) || CondicionPagoFactura.CONTADO,
          plazoCreditoDias: payload.plazoCreditoDias,
          retencionIva: payload.retencionIva || 0,
          subtotal,
          iva,
          total: corte.monto,
          estado: payload.estado === 'PAGADA' ? EstadoFactura.PAGADA : EstadoFactura.PENDIENTE,
          fechaVence: new Date(Date.now() + (payload.plazoCreditoDias || 0) * 24 * 60 * 60 * 1000),
        },
        include: { cliente: true, contrato: true, corte: true }
      });

      // Actualizar estado del corte a FACTURADO
      await tx.corteFacturacion.update({
        where: { id: corte.id },
        data: { estado: EstadoCorteFacturacion.FACTURADO }
      });

      return factura;
    });
  }

  async getInvoices(empresaId?: string) {
    const whereClause: any = empresaId
      ? {
          OR: [
            { empresaId },
            { cliente: { empresaId } }
          ]
        }
      : {};

    return this.prisma.factura.findMany({
      where: whereClause,
      include: {
        cliente: true,
        contrato: true,
        cotizacion: true,
        corte: true
      },
      orderBy: {
        fechaEmision: 'desc'
      }
    });
  }

  async markAsPaid(id: string, empresaId?: string) {
    const whereClause: any = { id };
    if (empresaId) {
      whereClause.OR = [
        { empresaId },
        { cliente: { empresaId } }
      ];
    }

    const factura = await this.prisma.factura.findFirst({ where: whereClause });
    if (!factura) throw new NotFoundException('Factura no encontrada');

    return this.prisma.factura.update({
      where: { id: factura.id },
      data: { estado: EstadoFactura.PAGADA },
      include: { cliente: true, contrato: true, cotizacion: true, corte: true }
    });
  }
}
