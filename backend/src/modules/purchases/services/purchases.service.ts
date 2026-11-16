import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EstadoCompraInsumo,
  EstadoPagoCompra,
  EstadoSubarriendoProveedor,
  ModalidadSubarriendoProveedor,
  OrigenEquipo,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { recordAuditInTx } from '../../auditoria/utils/audit-tx.util';
import {
  BM_CUENTAS,
  registrarAsientoAutomaticoInTx,
  round2Accounting,
} from '../../accounting/utils/bm-accounting.util';
import { nextSequenceValue } from '../../../common/utils/numbering.util';
import { CreateCompraInsumoDto } from '../dto/create-compra-insumo.dto';
import { CreateSubarriendoDto } from '../dto/create-subarriendo.dto';
import { DevolverSubarriendoDto } from '../dto/devolver-subarriendo.dto';
import { RegistrarPagoCompraDto } from '../dto/registrar-pago-compra.dto';

const IVA_RATE = 0.15;

const CUENTAS_PAGO_VALIDAS: Record<string, { codigo: string; nombre: string }> = {
  '110101': BM_CUENTAS.CAJA_GENERAL,
  '110102': BM_CUENTAS.CAJA_CHICA,
  '110201': BM_CUENTAS.BANCO_LAFISE,
  '110202': { codigo: '110202', nombre: 'LA FISE 133-023-603' },
  '110203': { codigo: '110203', nombre: 'BANPRO 701-279-700' },
  '110205': { codigo: '110205', nombre: 'BANPRO US 711-279-691' },
};

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  private resolverCuentaPago(cuentaCodigo?: string | null, metodoPago?: string | null) {
    const code = String(cuentaCodigo || '').trim();
    if (code && CUENTAS_PAGO_VALIDAS[code]) {
      return CUENTAS_PAGO_VALIDAS[code];
    }
    if (String(metodoPago || '').toUpperCase() === 'EFECTIVO') {
      return BM_CUENTAS.CAJA_CHICA;
    }
    return BM_CUENTAS.BANCO_LAFISE;
  }

  private resolverEstadoPago(montoPagado: number, total: number): EstadoPagoCompra {
    if (total <= 0 || montoPagado >= total - 0.01) return EstadoPagoCompra.PAGADO;
    if (montoPagado > 0) return EstadoPagoCompra.PARCIAL;
    return EstadoPagoCompra.PENDIENTE;
  }

  async getResumen(empresaId: string) {
    const [compras, subarriendos, equiposProveedor] = await Promise.all([
      this.prisma.compraInsumo.findMany({
        where: { empresaId },
        select: {
          id: true,
          estado: true,
          estadoPago: true,
          total: true,
          montoPagado: true,
        },
      }),
      this.prisma.subarriendoProveedor.findMany({
        where: { empresaId },
        select: {
          id: true,
          estado: true,
          estadoPago: true,
          fechaFinEstimada: true,
          montoEstimado: true,
          montoFinal: true,
          montoPagado: true,
        },
      }),
      this.prisma.equipo.count({
        where: {
          empresaId,
          OR: [{ origenEquipo: OrigenEquipo.PROVEEDOR }, { proveedorId: { not: null } }],
        },
      }),
    ]);

    const ahora = new Date();
    const enCincoDias = new Date(ahora.getTime() + 5 * 24 * 60 * 60 * 1000);

    const comprasRecibidas = compras.filter((c) => c.estado === EstadoCompraInsumo.RECIBIDA);
    const totalCompradoInsumos = round2Accounting(
      comprasRecibidas.reduce((acc, c) => acc + Number(c.total || 0), 0),
    );
    const saldoPendienteCompras = round2Accounting(
      comprasRecibidas.reduce(
        (acc, c) => acc + Math.max(0, Number(c.total || 0) - Number(c.montoPagado || 0)),
        0,
      ),
    );

    const subarriendosActivos = subarriendos.filter(
      (s) => s.estado === EstadoSubarriendoProveedor.ACTIVO,
    );
    const subarriendosPorVencer = subarriendosActivos.filter(
      (s) => new Date(s.fechaFinEstimada) <= enCincoDias,
    ).length;
    const saldoPendienteSubarriendos = round2Accounting(
      subarriendos
        .filter((s) => s.estado !== EstadoSubarriendoProveedor.CANCELADO)
        .reduce((acc, s) => {
          const base = Number(s.montoFinal ?? s.montoEstimado ?? 0);
          return acc + Math.max(0, base - Number(s.montoPagado || 0));
        }, 0),
    );

    return {
      totalComprasInsumos: comprasRecibidas.length,
      totalCompradoInsumos,
      saldoPendienteCompras,
      equiposExternosInventario: equiposProveedor,
      subarriendosActivos: subarriendosActivos.length,
      subarriendosPorVencer,
      saldoPendienteSubarriendos,
      cxpTotalProveedoresCompras: round2Accounting(
        saldoPendienteCompras + saldoPendienteSubarriendos,
      ),
    };
  }

  // ============================================================================
  // COMPRAS DE INSUMOS
  // ============================================================================

  async findAllComprasInsumos(
    empresaId: string,
    filters?: {
      estado?: EstadoCompraInsumo;
      estadoPago?: EstadoPagoCompra;
      proveedorId?: string;
      search?: string;
    },
  ) {
    const where: Prisma.CompraInsumoWhereInput = { empresaId };
    if (filters?.estado) where.estado = filters.estado;
    if (filters?.estadoPago) where.estadoPago = filters.estadoPago;
    if (filters?.proveedorId) where.proveedorId = filters.proveedorId;
    if (filters?.search?.trim()) {
      const term = filters.search.trim();
      where.OR = [
        { codigo: { contains: term, mode: 'insensitive' } },
        { numeroFactura: { contains: term, mode: 'insensitive' } },
        { proveedorNombre: { contains: term, mode: 'insensitive' } },
      ];
    }

    return this.prisma.compraInsumo.findMany({
      where,
      orderBy: [{ fechaCompra: 'desc' }, { createdAt: 'desc' }],
      include: {
        proveedor: { select: { id: true, nombre: true, telefono: true } },
        items: {
          include: {
            insumo: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                unidadMedida: true,
                categoria: true,
              },
            },
          },
        },
        pagos: { orderBy: { fechaPago: 'desc' } },
      },
    });
  }

  async findOneCompraInsumo(id: string, empresaId: string) {
    const compra = await this.prisma.compraInsumo.findFirst({
      where: { id, empresaId },
      include: {
        proveedor: { select: { id: true, nombre: true, telefono: true, identificacion: true } },
        items: {
          include: {
            insumo: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                unidadMedida: true,
                categoria: true,
                stockActual: true,
              },
            },
          },
        },
        pagos: { orderBy: { fechaPago: 'desc' } },
      },
    });

    if (!compra) {
      throw new NotFoundException('Compra de insumos no encontrada.');
    }
    return compra;
  }

  async createCompraInsumo(
    dto: CreateCompraInsumoDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    let proveedorNombre = dto.proveedorNombre?.trim() || '';
    if (dto.proveedorId) {
      const prov = await this.prisma.proveedor.findFirst({
        where: { id: dto.proveedorId, empresaId },
      });
      if (!prov) {
        throw new NotFoundException('El proveedor seleccionado no existe en la empresa.');
      }
      proveedorNombre = prov.nombre;
    }
    if (!proveedorNombre) {
      throw new BadRequestException('Debe indicar el proveedor de la compra.');
    }

    const insumoIds = Array.from(new Set(dto.items.map((i) => i.insumoId)));
    const insumosDb = await this.prisma.insumo.findMany({
      where: { id: { in: insumoIds }, empresaId },
    });
    if (insumosDb.length !== insumoIds.length) {
      throw new BadRequestException(
        'Uno o más insumos seleccionados no pertenecen a la empresa o no existen.',
      );
    }
    const insumoMap = new Map(insumosDb.map((i) => [i.id, i]));

    const aplicaIvaGlobal = dto.aplicaIva !== false;
    let subtotal = 0;
    let ivaTotal = 0;
    const computedItems = dto.items.map((item) => {
      const cantidad = round2Accounting(item.cantidad);
      const costoUnitario = round2Accounting(item.costoUnitario);
      const sub = round2Accounting(cantidad * costoUnitario);
      const itemAplicaIva = aplicaIvaGlobal && item.incluyeIva !== false;
      const iva = itemAplicaIva ? round2Accounting(sub * IVA_RATE) : 0;
      const total = round2Accounting(sub + iva);
      subtotal = round2Accounting(subtotal + sub);
      ivaTotal = round2Accounting(ivaTotal + iva);
      return {
        insumoId: item.insumoId,
        cantidad,
        costoUnitario,
        incluyeIva: itemAplicaIva,
        ivaMonto: iva,
        subtotal: sub,
        total,
      };
    });
    const total = round2Accounting(subtotal + ivaTotal);

    const fechaCompra = dto.fechaCompra ? new Date(dto.fechaCompra) : new Date();
    const condicionPago = dto.condicionPago === 'CREDITO' ? 'CREDITO' : 'CONTADO';
    const plazoDias = condicionPago === 'CREDITO' ? Math.max(0, Number(dto.plazoCreditoDias || 0)) : 0;
    const fechaVencimiento =
      condicionPago === 'CREDITO'
        ? new Date(fechaCompra.getTime() + plazoDias * 24 * 60 * 60 * 1000)
        : fechaCompra;
    const recibirInmediato = dto.recibirInmediato !== false;
    const metodoPago = dto.metodoPago || 'TRANSFERENCIA';
    const cuentaPago = this.resolverCuentaPago(dto.cuentaPagoCodigo, metodoPago);
    const estado = recibirInmediato ? EstadoCompraInsumo.RECIBIDA : EstadoCompraInsumo.BORRADOR;
    const montoPagado =
      recibirInmediato && condicionPago === 'CONTADO' ? total : 0;
    const estadoPago = this.resolverEstadoPago(montoPagado, total);

    return this.prisma.$transaction(async (tx) => {
      const anio = fechaCompra.getFullYear();
      const seq = await nextSequenceValue(tx, empresaId, `COMPRA_INSUMO:${anio}`);
      const codigo = `OC-${anio}-${String(seq).padStart(5, '0')}`;

      const compra = await tx.compraInsumo.create({
        data: {
          empresaId,
          sucursalId: dto.sucursalId || null,
          codigo,
          proveedorId: dto.proveedorId || null,
          proveedorNombre,
          numeroFactura: dto.numeroFactura?.trim() || null,
          fechaCompra,
          condicionPago,
          plazoCreditoDias: plazoDias,
          fechaVencimiento,
          metodoPago,
          cuentaPagoCodigo: cuentaPago.codigo,
          aplicaIva: aplicaIvaGlobal,
          subtotal,
          ivaTotal,
          total,
          estado,
          estadoPago,
          montoPagado,
          notas: dto.notas?.trim() || null,
          usuarioId: usuarioId || null,
          items: {
            create: computedItems,
          },
        },
        include: { items: true },
      });

      if (recibirInmediato) {
        await this.aplicarRecepcionCompraInTx(
          tx,
          compra,
          insumoMap,
          cuentaPago,
          empresaId,
          usuarioId,
        );
      }

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'COMPRA_INSUMO_CREADA',
        entidadTipo: 'COMPRA_INSUMO',
        entidadId: compra.id,
        detalles: {
          codigo,
          proveedorNombre,
          estado,
          condicionPago,
          total,
          cantidadItems: computedItems.length,
        },
      });

      return tx.compraInsumo.findFirst({
        where: { id: compra.id },
        include: {
          proveedor: { select: { id: true, nombre: true, telefono: true } },
          items: {
            include: {
              insumo: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                  unidadMedida: true,
                  categoria: true,
                },
              },
            },
          },
          pagos: true,
        },
      });
    });
  }

  private async aplicarRecepcionCompraInTx(
    tx: any,
    compra: any,
    insumoMap: Map<string, any>,
    cuentaPago: { codigo: string; nombre: string },
    empresaId: string,
    usuarioId?: string,
  ) {
    const referenciaDoc = compra.numeroFactura || compra.codigo;
    for (const item of compra.items) {
      const insumo = insumoMap.get(item.insumoId);
      if (!insumo) continue;
      const stockAnterior = Number(insumo.stockActual || 0);
      const cant = Number(item.cantidad);
      const stockNuevo = round2Accounting(stockAnterior + cant);

      await tx.insumo.update({
        where: { id: item.insumoId },
        data: {
          stockActual: stockNuevo,
          costoUnitario: Number(item.costoUnitario),
          ...(compra.proveedorId && !insumo.proveedorId
            ? { proveedorId: compra.proveedorId }
            : {}),
        },
      });

      const mov = await tx.insumoMovimiento.create({
        data: {
          empresaId,
          insumoId: item.insumoId,
          tipo: 'ENTRADA',
          cantidad: cant,
          stockAnterior,
          stockNuevo,
          costoUnitario: Number(item.costoUnitario),
          costoTotal: Number(item.subtotal),
          motivo: `Compra ${compra.codigo} (${compra.proveedorNombre})`,
          destino: 'Bodega Central de Insumos',
          referencia: referenciaDoc,
          compraInsumoId: compra.id,
          usuarioId: usuarioId || null,
        },
      });

      await tx.compraInsumoItem.update({
        where: { id: item.id },
        data: { movimientoId: mov.id },
      });
    }

    const total = round2Accounting(Number(compra.total));
    const subtotal = round2Accounting(Number(compra.subtotal));
    const ivaTotal = round2Accounting(Number(compra.ivaTotal));
    if (total > 0) {
      const esCredito = compra.condicionPago === 'CREDITO';
      const cuentaHaber = esCredito ? BM_CUENTAS.PROVEEDORES_OTROS : cuentaPago;
      const concepto = `Compra de insumos ${compra.codigo} - ${compra.proveedorNombre}${
        compra.numeroFactura ? ` (Fac. ${compra.numeroFactura})` : ''
      }`;

      const asiento = await registrarAsientoAutomaticoInTx(tx, {
        empresaId,
        sucursalId: compra.sucursalId || null,
        fecha: compra.fechaCompra,
        tipoAsiento: esCredito ? 'DIARIO' : 'EGRESOS',
        origenModulo: 'OPERACIONES',
        documentoReferencia: compra.id,
        concepto,
        creadoPorId: usuarioId,
        prefijoNumero: 'CMP',
        partidas: [
          {
            cuentaCodigo: BM_CUENTAS.INVENTARIO_INSUMOS_TALLER.codigo,
            cuentaNombre: BM_CUENTAS.INVENTARIO_INSUMOS_TALLER.nombre,
            debe: subtotal,
            haber: 0,
            conceptoLinea: concepto,
          },
          ...(ivaTotal > 0
            ? [
                {
                  cuentaCodigo: BM_CUENTAS.IVA_PAGADOS_COMPRAS.codigo,
                  cuentaNombre: BM_CUENTAS.IVA_PAGADOS_COMPRAS.nombre,
                  debe: ivaTotal,
                  haber: 0,
                  conceptoLinea: `IVA acreditable compra ${compra.codigo}`,
                },
              ]
            : []),
          {
            cuentaCodigo: cuentaHaber.codigo,
            cuentaNombre: cuentaHaber.nombre,
            debe: 0,
            haber: total,
            conceptoLinea: concepto,
          },
        ],
      });

      if (asiento?.id) {
        await tx.compraInsumo.update({
          where: { id: compra.id },
          data: { asientoId: asiento.id },
        });
      }
    }
  }

  async recibirCompraInsumo(id: string, empresaId: string, usuarioId?: string) {
    const compra = await this.findOneCompraInsumo(id, empresaId);
    if (compra.estado !== EstadoCompraInsumo.BORRADOR) {
      throw new BadRequestException(
        'Solo las compras en estado BORRADOR pueden recibirse en bodega.',
      );
    }

    const insumoIds = compra.items.map((i) => i.insumoId);
    const insumosDb = await this.prisma.insumo.findMany({
      where: { id: { in: insumoIds }, empresaId },
    });
    const insumoMap = new Map(insumosDb.map((i) => [i.id, i]));
    const cuentaPago = this.resolverCuentaPago(compra.cuentaPagoCodigo, compra.metodoPago);
    const total = round2Accounting(Number(compra.total));
    const montoPagado = compra.condicionPago === 'CONTADO' ? total : Number(compra.montoPagado || 0);
    const estadoPago = this.resolverEstadoPago(montoPagado, total);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.compraInsumo.update({
        where: { id: compra.id },
        data: {
          estado: EstadoCompraInsumo.RECIBIDA,
          montoPagado,
          estadoPago,
        },
        include: { items: true },
      });

      await this.aplicarRecepcionCompraInTx(
        tx,
        updated,
        insumoMap,
        cuentaPago,
        empresaId,
        usuarioId,
      );

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'COMPRA_INSUMO_RECIBIDA',
        entidadTipo: 'COMPRA_INSUMO',
        entidadId: compra.id,
        detalles: { codigo: compra.codigo, total },
      });

      return tx.compraInsumo.findFirst({
        where: { id: compra.id },
        include: {
          proveedor: { select: { id: true, nombre: true, telefono: true } },
          items: { include: { insumo: true } },
          pagos: true,
        },
      });
    });
  }

  async anularCompraInsumo(id: string, empresaId: string, usuarioId?: string) {
    const compra = await this.findOneCompraInsumo(id, empresaId);
    if (compra.estado === EstadoCompraInsumo.ANULADA) {
      throw new BadRequestException('Esta compra ya se encuentra anulada.');
    }
    if (compra.condicionPago === 'CREDITO' && Number(compra.montoPagado || 0) > 0) {
      throw new BadRequestException(
        'No se puede anular una compra a crédito que ya tiene abonos registrados.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (compra.estado === EstadoCompraInsumo.RECIBIDA) {
        for (const item of compra.items) {
          const insumo = await tx.insumo.findFirst({
            where: { id: item.insumoId, empresaId },
          });
          if (!insumo) continue;
          const stockActual = Number(insumo.stockActual || 0);
          const cant = Number(item.cantidad);
          if (stockActual < cant) {
            throw new BadRequestException(
              `No se puede anular: parte del insumo "${insumo.nombre}" ya fue consumido (stock actual: ${stockActual}, comprado: ${cant}).`,
            );
          }
          const stockNuevo = round2Accounting(stockActual - cant);
          await tx.insumo.update({
            where: { id: insumo.id },
            data: { stockActual: stockNuevo },
          });

          await tx.insumoMovimiento.create({
            data: {
              empresaId,
              insumoId: insumo.id,
              tipo: 'SALIDA',
              cantidad: cant,
              stockAnterior: stockActual,
              stockNuevo,
              costoUnitario: Number(item.costoUnitario),
              costoTotal: Number(item.subtotal),
              motivo: `Anulación de compra ${compra.codigo}`,
              destino: 'Reversión de Compra',
              referencia: compra.codigo,
              compraInsumoId: compra.id,
              usuarioId: usuarioId || null,
            },
          });
        }
      }

      const updated = await tx.compraInsumo.update({
        where: { id: compra.id },
        data: { estado: EstadoCompraInsumo.ANULADA },
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'COMPRA_INSUMO_ANULADA',
        entidadTipo: 'COMPRA_INSUMO',
        entidadId: compra.id,
        detalles: { codigo: compra.codigo },
      });

      return updated;
    });
  }

  async registrarPagoCompraInsumo(
    id: string,
    dto: RegistrarPagoCompraDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const compra = await this.findOneCompraInsumo(id, empresaId);
    if (compra.estado !== EstadoCompraInsumo.RECIBIDA) {
      throw new BadRequestException('Solo se pueden registrar pagos a compras recibidas.');
    }
    const total = round2Accounting(Number(compra.total));
    const pagadoActual = round2Accounting(Number(compra.montoPagado || 0));
    const saldoPendiente = round2Accounting(total - pagadoActual);
    if (saldoPendiente <= 0) {
      throw new BadRequestException('Esta compra ya está totalmente pagada.');
    }
    const monto = round2Accounting(dto.monto);
    if (monto > saldoPendiente + 0.01) {
      throw new BadRequestException(
        `El monto del abono (${monto}) excede el saldo pendiente (${saldoPendiente}).`,
      );
    }

    const metodoPago = dto.metodoPago || 'TRANSFERENCIA';
    const cuentaPago = this.resolverCuentaPago(dto.cuentaPagoCodigo, metodoPago);
    const fechaPago = dto.fechaPago ? new Date(dto.fechaPago) : new Date();
    const nuevoPagado = round2Accounting(pagadoActual + monto);
    const nuevoEstadoPago = this.resolverEstadoPago(nuevoPagado, total);

    return this.prisma.$transaction(async (tx) => {
      const pago = await tx.pagoCompra.create({
        data: {
          empresaId,
          compraInsumoId: compra.id,
          fechaPago,
          monto,
          metodoPago,
          cuentaPagoCodigo: cuentaPago.codigo,
          referencia: dto.referencia?.trim() || null,
          observaciones: dto.observaciones?.trim() || null,
          usuarioId: usuarioId || null,
        },
      });

      const concepto = `Pago a proveedor ${compra.proveedorNombre} - Compra ${compra.codigo}`;
      const asiento = await registrarAsientoAutomaticoInTx(tx, {
        empresaId,
        sucursalId: compra.sucursalId || null,
        fecha: fechaPago,
        tipoAsiento: 'EGRESOS',
        origenModulo: 'OPERACIONES',
        documentoReferencia: pago.id,
        concepto,
        creadoPorId: usuarioId,
        prefijoNumero: 'PGC',
        partidas: [
          {
            cuentaCodigo: BM_CUENTAS.PROVEEDORES_OTROS.codigo,
            cuentaNombre: BM_CUENTAS.PROVEEDORES_OTROS.nombre,
            debe: monto,
            haber: 0,
            conceptoLinea: concepto,
          },
          {
            cuentaCodigo: cuentaPago.codigo,
            cuentaNombre: cuentaPago.nombre,
            debe: 0,
            haber: monto,
            conceptoLinea: concepto,
          },
        ],
      });

      if (asiento?.id) {
        await tx.pagoCompra.update({
          where: { id: pago.id },
          data: { asientoId: asiento.id },
        });
      }

      const updatedCompra = await tx.compraInsumo.update({
        where: { id: compra.id },
        data: {
          montoPagado: nuevoPagado,
          estadoPago: nuevoEstadoPago,
        },
        include: {
          proveedor: { select: { id: true, nombre: true, telefono: true } },
          items: { include: { insumo: true } },
          pagos: { orderBy: { fechaPago: 'desc' } },
        },
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'PAGO_COMPRA_INSUMO',
        entidadTipo: 'COMPRA_INSUMO',
        entidadId: compra.id,
        detalles: { codigo: compra.codigo, monto, nuevoEstadoPago },
      });

      return updatedCompra;
    });
  }

  // ============================================================================
  // MAQUINARIA EXTERNA DE PROVEEDORES (SUBARRIENDO / PRÉSTAMO)
  // ============================================================================

  async findMaquinariaExterna(
    empresaId: string,
    filters?: {
      estado?: EstadoSubarriendoProveedor;
      proveedorId?: string;
      search?: string;
    },
  ) {
    const equipoWhere: Prisma.EquipoWhereInput = {
      empresaId,
      OR: [{ origenEquipo: OrigenEquipo.PROVEEDOR }, { proveedorId: { not: null } }],
    };
    if (filters?.proveedorId) {
      equipoWhere.proveedorId = filters.proveedorId;
    }
    if (filters?.search?.trim()) {
      const q = filters.search.trim();
      equipoWhere.AND = [
        {
          OR: [
            { codigo: { contains: q, mode: 'insensitive' } },
            { modelo: { contains: q, mode: 'insensitive' } },
            { numeroSerie: { contains: q, mode: 'insensitive' } },
            { proveedorNombre: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const subWhere: Prisma.SubarriendoProveedorWhereInput = { empresaId };
    if (filters?.estado) subWhere.estado = filters.estado;
    if (filters?.proveedorId) subWhere.proveedorId = filters.proveedorId;
    if (filters?.search?.trim()) {
      const q = filters.search.trim();
      subWhere.OR = [
        { codigo: { contains: q, mode: 'insensitive' } },
        { proveedorNombre: { contains: q, mode: 'insensitive' } },
        { referenciaDocumento: { contains: q, mode: 'insensitive' } },
        { equipo: { modelo: { contains: q, mode: 'insensitive' } } },
        { equipo: { codigo: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [equiposExternos, subarriendosRaw] = await Promise.all([
      this.prisma.equipo.findMany({
        where: equipoWhere,
        orderBy: [{ modelo: 'asc' }, { codigo: 'asc' }],
        include: {
          categoria: { select: { id: true, nombre: true } },
          marca: { select: { id: true, nombre: true } },
          sucursal: { select: { id: true, nombre: true } },
          proveedor: { select: { id: true, nombre: true, telefono: true } },
          subarriendos: {
            where: { estado: EstadoSubarriendoProveedor.ACTIVO },
            orderBy: { fechaFinEstimada: 'asc' },
          },
          detallesContrato: {
            where: { contrato: { estado: 'ACTIVO' } },
            select: {
              id: true,
              cantidad: true,
              contrato: {
                select: {
                  id: true,
                  codigo: true,
                  fechaInicio: true,
                  fechaFin: true,
                  cliente: { select: { nombre: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.subarriendoProveedor.findMany({
        where: subWhere,
        orderBy: [{ estado: 'asc' }, { fechaFinEstimada: 'asc' }],
        include: {
          equipo: {
            select: {
              id: true,
              codigo: true,
              modelo: true,
              numeroSerie: true,
              estado: true,
              disponibleParaRenta: true,
              sucursal: { select: { id: true, nombre: true } },
              categoria: { select: { nombre: true } },
            },
          },
          proveedor: { select: { id: true, nombre: true, telefono: true } },
          pagos: { orderBy: { fechaPago: 'desc' } },
        },
      }),
    ]);

    const ahora = new Date();
    const subarriendos = subarriendosRaw.map((s) => {
      const fin = new Date(s.fechaFinEstimada);
      const diffDias = Math.ceil(
        (fin.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24),
      );
      const esActivo = s.estado === EstadoSubarriendoProveedor.ACTIVO;
      return {
        ...s,
        diasRestantes: esActivo ? diffDias : null,
        vencido: esActivo && diffDias < 0,
        porVencer: esActivo && diffDias >= 0 && diffDias <= 5,
      };
    });

    return {
      equiposExternos,
      subarriendos,
    };
  }

  async createSubarriendo(
    dto: CreateSubarriendoDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const equipo = await this.prisma.equipo.findFirst({
      where: { id: dto.equipoId, empresaId },
      include: { proveedor: { select: { id: true, nombre: true } } },
    });
    if (!equipo) {
      throw new NotFoundException('El equipo especificado no existe en el inventario de la empresa.');
    }

    const fechaInicio = new Date(dto.fechaInicio);
    const fechaFinEstimada = new Date(dto.fechaFinEstimada);
    if (Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaFinEstimada.getTime())) {
      throw new BadRequestException('Las fechas de inicio y fin del período no son válidas.');
    }
    if (fechaFinEstimada < fechaInicio) {
      throw new BadRequestException(
        'La fecha fin estimada no puede ser anterior a la fecha de inicio.',
      );
    }

    let proveedorId: string | null = dto.proveedorId || equipo.proveedorId || null;
    let proveedorNombre =
      dto.proveedorNombre?.trim() ||
      equipo.proveedor?.nombre ||
      equipo.proveedorNombre ||
      '';

    if (dto.proveedorId) {
      const prov = await this.prisma.proveedor.findFirst({
        where: { id: dto.proveedorId, empresaId },
      });
      if (!prov) {
        throw new NotFoundException('El proveedor seleccionado no existe en la empresa.');
      }
      proveedorId = prov.id;
      proveedorNombre = prov.nombre;
    }

    if (!proveedorNombre) {
      throw new BadRequestException('Debe indicar el proveedor que presta/subarrienda el equipo.');
    }

    const modalidad = dto.modalidad || ModalidadSubarriendoProveedor.POR_DIA;
    const cantidadUnidades = Math.max(1, Number(dto.cantidadUnidades || 1));
    const tarifaProveedor = Number(dto.tarifaProveedor);

    let duracionEstimada = dto.duracionEstimadaValor;
    if (!duracionEstimada || duracionEstimada <= 0) {
      const msDiff = Math.max(0, fechaFinEstimada.getTime() - fechaInicio.getTime());
      const dias = Math.max(1, Math.ceil(msDiff / (1000 * 60 * 60 * 24)) + 1);
      if (modalidad === ModalidadSubarriendoProveedor.MONTO_FIJO) {
        duracionEstimada = 1;
      } else if (modalidad === ModalidadSubarriendoProveedor.POR_MES) {
        duracionEstimada = Math.max(1, Math.round((dias / 30) * 100) / 100);
      } else if (modalidad === ModalidadSubarriendoProveedor.POR_HORA) {
        duracionEstimada = dias * 8;
      } else {
        duracionEstimada = dias;
      }
    }

    const montoEstimado =
      modalidad === ModalidadSubarriendoProveedor.MONTO_FIJO
        ? round2Accounting(tarifaProveedor * cantidadUnidades)
        : round2Accounting(tarifaProveedor * duracionEstimada * cantidadUnidades);

    return this.prisma.$transaction(async (tx) => {
      const anio = fechaInicio.getFullYear();
      const seq = await nextSequenceValue(tx, empresaId, `SUBARRIENDO_PROV:${anio}`);
      const codigo = `SUB-${anio}-${String(seq).padStart(5, '0')}`;

      const subarriendo = await tx.subarriendoProveedor.create({
        data: {
          empresaId,
          sucursalId: equipo.sucursalId,
          codigo,
          equipoId: equipo.id,
          proveedorId,
          proveedorNombre,
          modalidad,
          tarifaProveedor,
          cantidadUnidades,
          fechaInicio,
          fechaFinEstimada,
          duracionEstimadaValor: duracionEstimada,
          montoEstimado,
          referenciaDocumento: dto.referenciaDocumento?.trim() || null,
          observaciones: dto.observaciones?.trim() || null,
          usuarioId: usuarioId || null,
        },
        include: {
          equipo: {
            select: {
              id: true,
              codigo: true,
              modelo: true,
              numeroSerie: true,
              estado: true,
              disponibleParaRenta: true,
            },
          },
          proveedor: { select: { id: true, nombre: true, telefono: true } },
        },
      });

      // Sincroniza el equipo en Inventario como equipo de proveedor disponible para rentar
      await tx.equipo.update({
        where: { id: equipo.id },
        data: {
          origenEquipo: OrigenEquipo.PROVEEDOR,
          proveedorId,
          proveedorNombre,
          precioProveedor: tarifaProveedor,
          disponibleParaRenta: true,
        },
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'SUBARRIENDO_PROVEEDOR_CREADO',
        entidadTipo: 'SUBARRIENDO_PROVEEDOR',
        entidadId: subarriendo.id,
        detalles: {
          codigo,
          equipoId: equipo.id,
          proveedorNombre,
          modalidad,
          montoEstimado,
          fechaInicio,
          fechaFinEstimada,
        },
      });

      return subarriendo;
    });
  }

  async devolverSubarriendo(
    id: string,
    dto: DevolverSubarriendoDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const sub = await this.prisma.subarriendoProveedor.findFirst({
      where: { id, empresaId },
      include: { equipo: true },
    });
    if (!sub) {
      throw new NotFoundException('Período de subarriendo no encontrado.');
    }
    if (sub.estado !== EstadoSubarriendoProveedor.ACTIVO) {
      throw new BadRequestException('Este período de subarriendo ya no está activo.');
    }

    const fechaDevolucionReal = dto.fechaDevolucionReal
      ? new Date(dto.fechaDevolucionReal)
      : new Date();
    const montoFinal =
      dto.montoFinal !== undefined
        ? round2Accounting(dto.montoFinal)
        : round2Accounting(Number(sub.montoEstimado));
    const nuevoEstadoPago = this.resolverEstadoPago(
      Number(sub.montoPagado || 0),
      montoFinal,
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.subarriendoProveedor.update({
        where: { id: sub.id },
        data: {
          estado: EstadoSubarriendoProveedor.DEVUELTO,
          fechaDevolucionReal,
          montoFinal,
          estadoPago: nuevoEstadoPago,
          observaciones: dto.observaciones
            ? `${sub.observaciones ? `${sub.observaciones} | ` : ''}${dto.observaciones.trim()}`
            : sub.observaciones,
        },
        include: {
          equipo: {
            select: {
              id: true,
              codigo: true,
              modelo: true,
              estado: true,
              disponibleParaRenta: true,
            },
          },
          proveedor: { select: { id: true, nombre: true } },
          pagos: true,
        },
      });

      if (dto.deshabilitarParaRenta !== false) {
        const otrosActivos = await tx.subarriendoProveedor.count({
          where: {
            empresaId,
            equipoId: sub.equipoId,
            estado: EstadoSubarriendoProveedor.ACTIVO,
            id: { not: sub.id },
          },
        });
        if (otrosActivos === 0) {
          await tx.equipo.update({
            where: { id: sub.equipoId },
            data: { disponibleParaRenta: false },
          });
        }
      }

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'SUBARRIENDO_PROVEEDOR_DEVUELTO',
        entidadTipo: 'SUBARRIENDO_PROVEEDOR',
        entidadId: sub.id,
        detalles: {
          codigo: sub.codigo,
          equipoId: sub.equipoId,
          montoFinal,
          fechaDevolucionReal,
        },
      });

      return updated;
    });
  }

  async registrarPagoSubarriendo(
    id: string,
    dto: RegistrarPagoCompraDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const sub = await this.prisma.subarriendoProveedor.findFirst({
      where: { id, empresaId },
      include: { equipo: { select: { codigo: true, modelo: true } } },
    });
    if (!sub) {
      throw new NotFoundException('Período de subarriendo no encontrado.');
    }
    if (sub.estado === EstadoSubarriendoProveedor.CANCELADO) {
      throw new BadRequestException('No se pueden registrar pagos a un subarriendo cancelado.');
    }

    const totalBase = round2Accounting(Number(sub.montoFinal ?? sub.montoEstimado ?? 0));
    const pagadoActual = round2Accounting(Number(sub.montoPagado || 0));
    const saldoPendiente = round2Accounting(totalBase - pagadoActual);
    if (saldoPendiente <= 0) {
      throw new BadRequestException('Este subarriendo ya está completamente pagado.');
    }
    const monto = round2Accounting(dto.monto);
    if (monto > saldoPendiente + 0.01) {
      throw new BadRequestException(
        `El monto del pago (${monto}) excede el saldo pendiente (${saldoPendiente}).`,
      );
    }

    const metodoPago = dto.metodoPago || 'TRANSFERENCIA';
    const cuentaPago = this.resolverCuentaPago(dto.cuentaPagoCodigo, metodoPago);
    const fechaPago = dto.fechaPago ? new Date(dto.fechaPago) : new Date();
    const nuevoPagado = round2Accounting(pagadoActual + monto);
    const nuevoEstadoPago = this.resolverEstadoPago(nuevoPagado, totalBase);

    return this.prisma.$transaction(async (tx) => {
      const pago = await tx.pagoCompra.create({
        data: {
          empresaId,
          subarriendoId: sub.id,
          fechaPago,
          monto,
          metodoPago,
          cuentaPagoCodigo: cuentaPago.codigo,
          referencia: dto.referencia?.trim() || null,
          observaciones: dto.observaciones?.trim() || null,
          usuarioId: usuarioId || null,
        },
      });

      const concepto = `Pago subarriendo ${sub.codigo} (${sub.proveedorNombre}) - ${sub.equipo?.modelo || 'Maquinaria'}`;
      const asiento = await registrarAsientoAutomaticoInTx(tx, {
        empresaId,
        sucursalId: sub.sucursalId || null,
        fecha: fechaPago,
        tipoAsiento: 'EGRESOS',
        origenModulo: 'OPERACIONES',
        documentoReferencia: pago.id,
        concepto,
        creadoPorId: usuarioId,
        prefijoNumero: 'PGS',
        partidas: [
          {
            cuentaCodigo: BM_CUENTAS.PROVEEDORES_OTROS.codigo,
            cuentaNombre: BM_CUENTAS.PROVEEDORES_OTROS.nombre,
            debe: monto,
            haber: 0,
            conceptoLinea: concepto,
          },
          {
            cuentaCodigo: cuentaPago.codigo,
            cuentaNombre: cuentaPago.nombre,
            debe: 0,
            haber: monto,
            conceptoLinea: concepto,
          },
        ],
      });

      if (asiento?.id) {
        await tx.pagoCompra.update({
          where: { id: pago.id },
          data: { asientoId: asiento.id },
        });
      }

      const updated = await tx.subarriendoProveedor.update({
        where: { id: sub.id },
        data: {
          montoPagado: nuevoPagado,
          estadoPago: nuevoEstadoPago,
        },
        include: {
          equipo: {
            select: {
              id: true,
              codigo: true,
              modelo: true,
              estado: true,
              disponibleParaRenta: true,
            },
          },
          proveedor: { select: { id: true, nombre: true, telefono: true } },
          pagos: { orderBy: { fechaPago: 'desc' } },
        },
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'PAGO_SUBARRIENDO_PROVEEDOR',
        entidadTipo: 'SUBARRIENDO_PROVEEDOR',
        entidadId: sub.id,
        detalles: { codigo: sub.codigo, monto, nuevoEstadoPago },
      });

      return updated;
    });
  }
}
