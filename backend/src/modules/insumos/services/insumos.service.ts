import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateInsumoDto } from '../dto/create-insumo.dto';
import { UpdateInsumoDto } from '../dto/update-insumo.dto';
import { AjustarStockDto } from '../dto/ajustar-stock.dto';
import { RegistrarMovimientoDto } from '../dto/registrar-movimiento.dto';
import { Prisma, TipoMovimientoInsumo } from '@prisma/client';
import { recordAuditInTx } from '../../auditoria/utils/audit-tx.util';

@Injectable()
export class InsumosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createDto: CreateInsumoDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const nombre = createDto.nombre.trim();
    const existing = await this.prisma.insumo.findFirst({
      where: {
        empresaId,
        nombre: { equals: nombre, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un insumo registrado con el nombre "${nombre}".`,
      );
    }

    if (createDto.proveedorId) {
      const prov = await this.prisma.proveedor.findFirst({
        where: { id: createDto.proveedorId, empresaId },
      });
      if (!prov) {
        throw new NotFoundException('El proveedor especificado no existe en la empresa.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const insumo = await tx.insumo.create({
        data: {
          empresaId,
          nombre,
          codigo: createDto.codigo?.trim() || null,
          descripcion: createDto.descripcion?.trim() || null,
          categoria: createDto.categoria?.trim() || 'LUBRICANTES',
          unidadMedida: createDto.unidadMedida ?? 'UNIDAD',
          stockActual: createDto.stockActual ?? 0,
          stockMinimo: createDto.stockMinimo ?? 0,
          costoUnitario: createDto.costoUnitario ?? 0,
          costoIncluyeIva: createDto.costoIncluyeIva ?? true,
          aplicaIva: createDto.aplicaIva ?? true,
          precioVenta: createDto.precioVenta ?? null,
          proveedorId: createDto.proveedorId || null,
          activo: createDto.activo ?? true,
        },
        include: {
          proveedor: { select: { id: true, nombre: true } },
        },
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'INSUMO_CREADO',
        entidadTipo: 'INSUMO',
        entidadId: insumo.id,
        detalles: {
          nombre: insumo.nombre,
          categoria: insumo.categoria,
          stockActual: Number(insumo.stockActual),
          costoUnitario: Number(insumo.costoUnitario),
        },
      });

      return insumo;
    });
  }

  async findAll(
    empresaId: string,
    options?: {
      categoria?: string;
      activo?: boolean;
      search?: string;
      bajoStock?: boolean;
    },
  ) {
    const where: Prisma.InsumoWhereInput = { empresaId };

    if (options?.categoria) {
      where.categoria = { equals: options.categoria, mode: 'insensitive' };
    }

    if (options?.activo !== undefined) {
      where.activo = options.activo;
    }

    if (options?.search) {
      const term = options.search.trim();
      where.OR = [
        { nombre: { contains: term, mode: 'insensitive' } },
        { codigo: { contains: term, mode: 'insensitive' } },
        { descripcion: { contains: term, mode: 'insensitive' } },
      ];
    }

    const insumos = await this.prisma.insumo.findMany({
      where,
      include: {
        proveedor: { select: { id: true, nombre: true } },
        _count: { select: { consumos: true } },
      },
      orderBy: [{ nombre: 'asc' }],
    });

    if (options?.bajoStock) {
      return insumos.filter(
        (i) => Number(i.stockActual) <= Number(i.stockMinimo),
      );
    }

    return insumos;
  }

  async findOne(id: string, empresaId: string) {
    const insumo = await this.prisma.insumo.findFirst({
      where: { id, empresaId },
      include: {
        proveedor: { select: { id: true, nombre: true, telefono: true } },
        consumos: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            mantenimiento: {
              select: {
                id: true,
                tipo: true,
                estado: true,
                equipo: { select: { id: true, codigo: true, modelo: true } },
              },
            },
          },
        },
      },
    });

    if (!insumo) {
      throw new NotFoundException(`Insumo no encontrado.`);
    }

    return insumo;
  }

  async update(
    id: string,
    updateDto: UpdateInsumoDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const insumo = await this.findOne(id, empresaId);

    if (updateDto.nombre && updateDto.nombre.trim() !== insumo.nombre) {
      const nombre = updateDto.nombre.trim();
      const existing = await this.prisma.insumo.findFirst({
        where: {
          empresaId,
          nombre: { equals: nombre, mode: 'insensitive' },
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Ya existe un insumo registrado con el nombre "${nombre}".`,
        );
      }
    }

    if (updateDto.proveedorId) {
      const prov = await this.prisma.proveedor.findFirst({
        where: { id: updateDto.proveedorId, empresaId },
      });
      if (!prov) {
        throw new NotFoundException('El proveedor especificado no existe en la empresa.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.insumo.update({
        where: { id },
        data: {
          ...(updateDto.nombre && { nombre: updateDto.nombre.trim() }),
          ...(updateDto.codigo !== undefined && { codigo: updateDto.codigo?.trim() || null }),
          ...(updateDto.descripcion !== undefined && { descripcion: updateDto.descripcion?.trim() || null }),
          ...(updateDto.categoria && { categoria: updateDto.categoria }),
          ...(updateDto.unidadMedida && { unidadMedida: updateDto.unidadMedida }),
          ...(updateDto.stockActual !== undefined && { stockActual: updateDto.stockActual }),
          ...(updateDto.stockMinimo !== undefined && { stockMinimo: updateDto.stockMinimo }),
          ...(updateDto.costoUnitario !== undefined && { costoUnitario: updateDto.costoUnitario }),
          ...(updateDto.costoIncluyeIva !== undefined && { costoIncluyeIva: updateDto.costoIncluyeIva }),
          ...(updateDto.aplicaIva !== undefined && { aplicaIva: updateDto.aplicaIva }),
          ...(updateDto.precioVenta !== undefined && { precioVenta: updateDto.precioVenta }),
          ...(updateDto.proveedorId !== undefined && { proveedorId: updateDto.proveedorId }),
          ...(updateDto.activo !== undefined && { activo: updateDto.activo }),
        },
        include: {
          proveedor: { select: { id: true, nombre: true } },
        },
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'INSUMO_ACTUALIZADO',
        entidadTipo: 'INSUMO',
        entidadId: id,
        detalles: {
          cambios: updateDto,
          nuevoStock: Number(updated.stockActual),
        },
      });

      return updated;
    });
  }

  async ajustarStock(
    id: string,
    dto: AjustarStockDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const insumo = await this.findOne(id, empresaId);
    const stockActualNum = Number(insumo.stockActual);
    const cantidadNum = Number(dto.cantidad);
    let nuevoStock = stockActualNum;

    if (dto.tipoAjuste === 'ENTRADA') {
      nuevoStock = stockActualNum + cantidadNum;
    } else if (dto.tipoAjuste === 'SALIDA') {
      if (stockActualNum < cantidadNum) {
        throw new BadRequestException(
          `Stock insuficiente para salida. Stock actual: ${stockActualNum}, solicitado: ${cantidadNum}.`,
        );
      }
      nuevoStock = stockActualNum - cantidadNum;
    } else if (dto.tipoAjuste === 'AJUSTE_DIRECTO') {
      nuevoStock = cantidadNum;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.insumo.update({
        where: { id },
        data: {
          stockActual: nuevoStock,
          ...(dto.costoUnitario !== undefined && { costoUnitario: dto.costoUnitario }),
        },
        include: {
          proveedor: { select: { id: true, nombre: true } },
        },
      });

      const tipoMov =
        dto.tipoAjuste === 'AJUSTE_DIRECTO'
          ? TipoMovimientoInsumo.AJUSTE
          : (dto.tipoAjuste as TipoMovimientoInsumo);
      const costoUnit = dto.costoUnitario ?? Number(insumo.costoUnitario);
      const costoTotal = Math.round(cantidadNum * costoUnit * 100) / 100;

      if ((tx as any).insumoMovimiento) {
        await (tx as any).insumoMovimiento.create({
          data: {
            empresaId,
            insumoId: id,
            tipo: tipoMov,
            cantidad: cantidadNum,
            stockAnterior: stockActualNum,
            stockNuevo: nuevoStock,
            costoUnitario: costoUnit,
            costoTotal,
            motivo: dto.motivo,
            destino: dto.destino?.trim() || null,
            referencia: dto.referencia?.trim() || null,
            usuarioId: usuarioId || null,
          },
        });
      }

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'INSUMO_STOCK_AJUSTADO',
        entidadTipo: 'INSUMO',
        entidadId: id,
        detalles: {
          tipoAjuste: dto.tipoAjuste,
          cantidad: cantidadNum,
          stockAnterior: stockActualNum,
          nuevoStock,
          motivo: dto.motivo,
          destino: dto.destino,
          referencia: dto.referencia,
          costoUnitario: dto.costoUnitario ?? Number(insumo.costoUnitario),
        },
      });

      return updated;
    });
  }

  async registrarMovimiento(
    dto: RegistrarMovimientoDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const insumo = await this.findOne(dto.insumoId, empresaId);
    const stockActualNum = Number(insumo.stockActual);
    const cantidadNum = Number(dto.cantidad);
    let nuevoStock = stockActualNum;

    if (dto.tipo === 'ENTRADA') {
      nuevoStock = stockActualNum + cantidadNum;
    } else if (dto.tipo === 'SALIDA') {
      if (stockActualNum < cantidadNum) {
        throw new BadRequestException(
          `Stock insuficiente para salida. Stock actual en bodega: ${stockActualNum} ${insumo.unidadMedida}, solicitado: ${cantidadNum} ${insumo.unidadMedida}.`,
        );
      }
      nuevoStock = stockActualNum - cantidadNum;
    } else if (dto.tipo === 'AJUSTE') {
      nuevoStock = cantidadNum;
    }

    const costoUnit =
      dto.costoUnitario !== undefined
        ? Number(dto.costoUnitario)
        : Number(insumo.costoUnitario);
    const costoTotal = Math.round(cantidadNum * costoUnit * 100) / 100;

    return this.prisma.$transaction(async (tx) => {
      const updatedInsumo = await tx.insumo.update({
        where: { id: dto.insumoId },
        data: {
          stockActual: nuevoStock,
          ...(dto.tipo === 'ENTRADA' &&
            dto.costoUnitario !== undefined && {
              costoUnitario: dto.costoUnitario,
            }),
        },
        include: {
          proveedor: { select: { id: true, nombre: true } },
        },
      });

      const movimiento = await (tx as any).insumoMovimiento.create({
        data: {
          empresaId,
          insumoId: dto.insumoId,
          tipo: dto.tipo as TipoMovimientoInsumo,
          cantidad: cantidadNum,
          stockAnterior: stockActualNum,
          stockNuevo: nuevoStock,
          costoUnitario: costoUnit,
          costoTotal,
          motivo: dto.motivo.trim(),
          destino: dto.destino?.trim() || null,
          referencia: dto.referencia?.trim() || null,
          usuarioId: usuarioId || null,
        },
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
          usuario: {
            select: { id: true, nombre: true, apellido: true },
          },
        },
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'INSUMO_MOVIMIENTO_REGISTRADO',
        entidadTipo: 'INSUMO_MOVIMIENTO',
        entidadId: movimiento.id,
        detalles: {
          insumoId: dto.insumoId,
          tipo: dto.tipo,
          cantidad: cantidadNum,
          stockAnterior: stockActualNum,
          stockNuevo: nuevoStock,
          motivo: dto.motivo,
          destino: dto.destino,
          referencia: dto.referencia,
        },
      });

      return {
        movimiento,
        insumo: updatedInsumo,
      };
    });
  }

  async findMovimientos(
    empresaId: string,
    query: {
      insumoId?: string;
      tipo?: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: any = { empresaId };

    if (query.insumoId) {
      where.insumoId = query.insumoId;
    }

    if (query.tipo) {
      where.tipo = query.tipo;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { motivo: { contains: term, mode: 'insensitive' } },
        { destino: { contains: term, mode: 'insensitive' } },
        { referencia: { contains: term, mode: 'insensitive' } },
        { insumo: { nombre: { contains: term, mode: 'insensitive' } } },
        { insumo: { codigo: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      (this.prisma as any).insumoMovimiento.count({ where }),
      (this.prisma as any).insumoMovimiento.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: query.limit ? Number(query.limit) : 50,
        skip: query.offset ? Number(query.offset) : 0,
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
          usuario: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
            },
          },
        },
      }),
    ]);

    return { total, items };
  }

  async remove(id: string, empresaId: string, usuarioId?: string) {
    const insumo = await this.findOne(id, empresaId);

    const consumosCount = await this.prisma.consumoInsumo.count({
      where: { insumoId: id },
    });

    return this.prisma.$transaction(async (tx) => {
      if (consumosCount > 0) {
        await tx.insumo.update({
          where: { id },
          data: { activo: false },
        });

        await recordAuditInTx(tx, {
          empresaId,
          usuarioId,
          accion: 'INSUMO_DESACTIVADO',
          entidadTipo: 'INSUMO',
          entidadId: id,
          detalles: {
            motivo: 'Insumo con historial de consumos; desactivado.',
          },
        });

        return {
          id,
          eliminado: false,
          activo: false,
          message:
            'El insumo tiene consumos registrados en órdenes de mantenimiento. Ha sido desactivado para conservar la integridad histórica.',
        };
      }

      await tx.insumo.delete({ where: { id } });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'INSUMO_ELIMINADO',
        entidadTipo: 'INSUMO',
        entidadId: id,
        detalles: { nombre: insumo.nombre },
      });

      return {
        id,
        eliminado: true,
        message: 'Insumo eliminado exitosamente del catálogo.',
      };
    });
  }

  async getCategorias(empresaId: string): Promise<string[]> {
    const defaultCategorias = [
      'LUBRICANTES',
      'FILTROS',
      'DESGASTE',
      'FERRETERIA',
      'COMBUSTIBLE',
      'ELECTRICO',
      'LLANTAS',
      'MANGUERAS',
      'SEGURIDAD_EPP',
      'HERRAMIENTAS',
      'OTROS',
    ];

    const records = await this.prisma.insumo.findMany({
      where: { empresaId },
      select: { categoria: true },
      distinct: ['categoria'],
    });

    const set = new Set<string>(defaultCategorias);
    for (const r of records) {
      if (r.categoria && r.categoria.trim()) {
        set.add(r.categoria.trim().toUpperCase());
      }
    }

    return Array.from(set);
  }
}
