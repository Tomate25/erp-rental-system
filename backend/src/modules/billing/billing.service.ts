import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoFactura, CondicionPagoFactura } from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async getPendingQuotations() {
    // Retornamos las cotizaciones ACEPTADAS que no tengan contratos generados
    return this.prisma.cotizacion.findMany({
      where: {
        estado: 'ACEPTADA',
        contratos: { none: {} }
      },
      include: {
        cliente: true
      }
    });
  }

  async invoiceQuotation(id: string, payload: any) {
    const cotizacion = await this.prisma.cotizacion.findUnique({
      where: { id },
      include: { items: true, cliente: true }
    });

    if (!cotizacion) throw new NotFoundException('Cotización no encontrada');
    if (cotizacion.estado !== 'ACEPTADA') throw new BadRequestException('La cotización debe estar aprobada para facturar');

    let sucursalId = payload.sucursalId;
    if (!sucursalId) {
      const firstSucursal = await this.prisma.sucursal.findFirst();
      if (!firstSucursal) throw new BadRequestException('No hay sucursales configuradas');
      sucursalId = firstSucursal.id;
    }

    // Calculate actual rental duration from quotation items (dias)
    const maxDias = cotizacion.items.reduce((max, item) => Math.max(max, item.dias || 1), 1);
    const fechaInicio = new Date();
    const fechaFin = new Date(fechaInicio.getTime() + (maxDias - 1) * 24 * 60 * 60 * 1000);

    // 1. Crear el Contrato con las fechas reales de la cotización
    const contrato = await this.prisma.contrato.create({
      data: {
        codigo: `CTR-${Math.floor(Math.random() * 10000)}`,
        sucursalId,
        clienteId: cotizacion.clienteId,
        cotizacionId: cotizacion.id,
        fechaInicio,
        fechaFin,
        depositoGarantia: cotizacion.depositoGarantia,
        condiciones: cotizacion.condiciones || 'Generado desde cotización',
      }
    });

    // 2. Crear las Reservas reales para el Calendario por cada equipo rentado
    for (const item of cotizacion.items) {
      if (item.equipoId) {
        const itemDias = item.dias || 1;
        const itemFechaFin = new Date(fechaInicio.getTime() + (itemDias - 1) * 24 * 60 * 60 * 1000);

        await this.prisma.reserva.create({
          data: {
            contratoId: contrato.id,
            equipoId: item.equipoId,
            fechaInicio,
            fechaFin: itemFechaFin,
            estado: 'CONFIRMADA'
          }
        });
      }
    }

    // 2. Crear la Factura
    const factura = await this.prisma.factura.create({
      data: {
        folio: `FAC-${Math.floor(Math.random() * 100000)}`,
        clienteId: cotizacion.clienteId,
        contratoId: contrato.id,
        tipoFactura: payload.tipoFactura as TipoFactura || 'ESTANDAR',
        condicionPago: payload.condicionPago as CondicionPagoFactura || 'CONTADO',
        plazoCreditoDias: payload.plazoCreditoDias,
        retencionIva: payload.retencionIva || 0,
        subtotal: cotizacion.subtotal,
        iva: cotizacion.iva,
        total: cotizacion.total,
        estado: payload.estado === 'PAGADA' ? 'PAGADA' : 'PENDIENTE',
        fechaVence: new Date(Date.now() + (payload.plazoCreditoDias || 0) * 24 * 60 * 60 * 1000),
      }
    });

    return factura;
  }

  async getInvoices() {
    return this.prisma.factura.findMany({
      include: {
        cliente: true,
        contrato: true
      },
      orderBy: {
        fechaEmision: 'desc'
      }
    });
  }

  async markAsPaid(id: string) {
    const factura = await this.prisma.factura.findUnique({ where: { id } });
    if (!factura) throw new NotFoundException('Factura no encontrada');

    return this.prisma.factura.update({
      where: { id },
      data: { estado: 'PAGADA' },
      include: { cliente: true, contrato: true }
    });
  }
}
