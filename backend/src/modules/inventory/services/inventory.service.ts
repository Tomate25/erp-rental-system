import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateEquipmentDto } from '../dto/create-equipment.dto';
import { UpdateEquipmentDto } from '../dto/update-equipment.dto';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';
import { EstadoEquipo, Prisma } from '@prisma/client';
import { recordAuditInTx } from '../../auditoria/utils/audit-tx.util';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createEquipmentDto: CreateEquipmentDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const {
      codigo,
      numeroSerie,
      sucursalId,
      categoriaId,
      subcategoriaId,
      marcaId,
      cantidadTotal,
      cantidadDisponible,
    } = createEquipmentDto;

    // 1. Validar sucursal
    const sucursalExists = await this.prisma.sucursal.findFirst({
      where: { id: sucursalId, empresaId },
    });
    if (!sucursalExists) {
      throw new BadRequestException(
        'La sucursal seleccionada no existe o no pertenece a tu empresa',
      );
    }

    // 2. Validar categoría
    const categoriaExists = await this.prisma.categoria.findUnique({
      where: { id: categoriaId },
    });
    if (!categoriaExists) {
      throw new BadRequestException('La categoría seleccionada no existe');
    }

    // 3. Validar marca
    const marcaExists = await this.prisma.marca.findUnique({
      where: { id: marcaId },
    });
    if (!marcaExists) {
      throw new BadRequestException('La marca seleccionada no existe');
    }

    // 4. Verificar duplicidad de número de serie si está provisto
    if (numeroSerie && numeroSerie.trim()) {
      const serialExists = await this.prisma.equipo.findFirst({
        where: {
          numeroSerie: {
            equals: numeroSerie.trim(),
            mode: 'insensitive',
          },
          empresaId,
        },
      });

      if (serialExists) {
        throw new ConflictException(
          `Ya existe un equipo registrado con el número de serie "${numeroSerie}"`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const equipo = await tx.equipo.create({
        data: {
          codigo: codigo || null,
          modelo: createEquipmentDto.modelo,
          numeroSerie: numeroSerie ? numeroSerie.trim() : null,
          precioRentaDia: createEquipmentDto.precioRentaDia,
          precioRentaHora:
            createEquipmentDto.precioRentaHora !== undefined
              ? createEquipmentDto.precioRentaHora
              : null,
          minimoHoras:
            createEquipmentDto.minimoHoras !== undefined
              ? createEquipmentDto.minimoHoras
              : 4,
          tipoControl: createEquipmentDto.tipoControl || undefined,
          modalidadRenta: createEquipmentDto.modalidadRenta,
          tipoMedicionCombustible:
            createEquipmentDto.tipoMedicionCombustible ?? null,
          costoAdquisicion:
            createEquipmentDto.costoAdquisicion !== undefined
              ? createEquipmentDto.costoAdquisicion
              : null,
          fechaAdquisicion: createEquipmentDto.fechaAdquisicion
            ? new Date(createEquipmentDto.fechaAdquisicion)
            : null,
          horometro: createEquipmentDto.horometro || 0.0,
          descripcion: createEquipmentDto.descripcion,
          estado: createEquipmentDto.estado || EstadoEquipo.DISPONIBLE,
          cantidadTotal: cantidadTotal !== undefined ? cantidadTotal : 1,
          cantidadDisponible:
            cantidadDisponible !== undefined
              ? cantidadDisponible
              : cantidadTotal !== undefined
                ? cantidadTotal
                : 1,
          empresa: { connect: { id: empresaId } },
          sucursal: { connect: { id: sucursalId } },
          producto: createEquipmentDto.productoId
            ? { connect: { id: createEquipmentDto.productoId } }
            : undefined,
          categoria: { connect: { id: categoriaId } },
          subcategoria: subcategoriaId
            ? { connect: { id: subcategoriaId } }
            : undefined,
          marca: { connect: { id: marcaId } },
        },
        include: {
          sucursal: true,
          producto: true,
          categoria: true,
          subcategoria: true,
          marca: true,
        },
      });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'EQUIPO_CREADO',
        entidadTipo: 'EQUIPO',
        entidadId: equipo.id,
        detalles: {
          codigo: equipo.codigo,
          modelo: equipo.modelo,
          sucursalId,
          categoriaId,
          marcaId,
          estado: equipo.estado,
        },
      });
      return equipo;
    });
  }

  async findAll(
    empresaId: string,
    sucursalId?: string,
    categoriaId?: string,
    subcategoriaId?: string,
    estado?: EstadoEquipo,
  ) {
    const whereClause: Prisma.EquipoWhereInput = { empresaId };

    if (sucursalId) whereClause.sucursalId = sucursalId;
    if (categoriaId) whereClause.categoriaId = categoriaId;
    if (subcategoriaId) whereClause.subcategoriaId = subcategoriaId;
    if (estado) whereClause.estado = estado;

    return this.prisma.equipo.findMany({
      where: whereClause,
      include: {
        sucursal: true,
        categoria: {
          include: { subcategorias: true },
        },
        subcategoria: true,
        marca: true,
      },
      orderBy: [{ codigo: 'asc' }, { modelo: 'asc' }],
    });
  }

  async findOne(id: string, empresaId: string) {
    const equipo = await this.prisma.equipo.findFirst({
      where: { id, empresaId },
      include: {
        sucursal: true,
        categoria: {
          include: { subcategorias: true },
        },
        subcategoria: true,
        marca: true,
      },
    });

    if (!equipo) {
      throw new NotFoundException(`No se encontró el equipo con ID: ${id}`);
    }

    return equipo;
  }

  async update(
    id: string,
    updateEquipmentDto: UpdateEquipmentDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const existente = await this.findOne(id, empresaId);

    const {
      sucursalId,
      categoriaId,
      subcategoriaId,
      marcaId,
      numeroSerie,
      codigo,
      cantidadTotal,
      cantidadDisponible,
    } = updateEquipmentDto;

    if (
      (existente.estado === EstadoEquipo.EN_MANTENIMIENTO || existente.estado === EstadoEquipo.MANTENIMIENTO) &&
      ((updateEquipmentDto.estado !== undefined && updateEquipmentDto.estado !== existente.estado) ||
        (cantidadDisponible !== undefined && cantidadDisponible > existente.cantidadDisponible))
    ) {
      throw new BadRequestException(
        'El equipo sigue en reparación. Termine la orden de mantenimiento antes de cambiar su estado o aumentar el stock disponible.',
      );
    }

    if (sucursalId) {
      const sucursalExists = await this.prisma.sucursal.findFirst({
        where: { id: sucursalId, empresaId },
      });
      if (!sucursalExists) {
        throw new BadRequestException(
          'La sucursal seleccionada no pertenece a tu empresa',
        );
      }
    }

    if (categoriaId) {
      const categoriaExists = await this.prisma.categoria.findUnique({
        where: { id: categoriaId },
      });
      if (!categoriaExists) {
        throw new BadRequestException('La categoría seleccionada no existe');
      }
    }

    if (marcaId) {
      const marcaExists = await this.prisma.marca.findUnique({
        where: { id: marcaId },
      });
      if (!marcaExists) {
        throw new BadRequestException('La marca seleccionada no existe');
      }
    }

    if (numeroSerie && numeroSerie.trim()) {
      const serialExists = await this.prisma.equipo.findFirst({
        where: {
          id: { not: id },
          numeroSerie: {
            equals: numeroSerie.trim(),
            mode: 'insensitive',
          },
          empresaId,
        },
      });
      if (serialExists) {
        throw new ConflictException(
          `Ya existe otro equipo registrado con el número de serie "${numeroSerie}"`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const equipo = await tx.equipo.update({
        where: { id },
        data: {
          codigo: codigo !== undefined ? codigo : undefined,
          modelo: updateEquipmentDto.modelo,
          numeroSerie: numeroSerie
            ? numeroSerie.trim()
            : numeroSerie === null
              ? null
              : undefined,
          precioRentaDia: updateEquipmentDto.precioRentaDia,
          precioRentaHora:
            updateEquipmentDto.precioRentaHora !== undefined
              ? updateEquipmentDto.precioRentaHora
              : undefined,
          minimoHoras:
            updateEquipmentDto.minimoHoras !== undefined
              ? updateEquipmentDto.minimoHoras
              : undefined,
          tipoControl:
            updateEquipmentDto.tipoControl !== undefined
              ? updateEquipmentDto.tipoControl
              : undefined,
          modalidadRenta: updateEquipmentDto.modalidadRenta,
          tipoMedicionCombustible:
            updateEquipmentDto.tipoMedicionCombustible !== undefined
              ? updateEquipmentDto.tipoMedicionCombustible
              : undefined,
          costoAdquisicion:
            updateEquipmentDto.costoAdquisicion !== undefined
              ? updateEquipmentDto.costoAdquisicion
              : undefined,
          fechaAdquisicion:
            updateEquipmentDto.fechaAdquisicion !== undefined
              ? updateEquipmentDto.fechaAdquisicion
                ? new Date(updateEquipmentDto.fechaAdquisicion)
                : null
              : undefined,
          horometro: updateEquipmentDto.horometro,
          descripcion: updateEquipmentDto.descripcion,
          estado: updateEquipmentDto.estado,
          cantidadTotal:
            cantidadTotal !== undefined ? cantidadTotal : undefined,
          cantidadDisponible:
            cantidadDisponible !== undefined ? cantidadDisponible : undefined,
          sucursal: sucursalId ? { connect: { id: sucursalId } } : undefined,
          categoria: categoriaId ? { connect: { id: categoriaId } } : undefined,
          subcategoria: subcategoriaId
            ? { connect: { id: subcategoriaId } }
            : subcategoriaId === null
              ? { disconnect: true }
              : undefined,
          marca: marcaId ? { connect: { id: marcaId } } : undefined,
        },
        include: {
          sucursal: true,
          categoria: true,
          subcategoria: true,
          marca: true,
        },
      });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'EQUIPO_ACTUALIZADO',
        entidadTipo: 'EQUIPO',
        entidadId: id,
        detalles: {
          camposModificados: Object.keys(updateEquipmentDto),
          estadoAnterior: existente.estado,
          estadoNuevo: equipo.estado,
          sucursalAnterior: existente.sucursalId,
          sucursalNueva: equipo.sucursalId,
        },
      });
      return equipo;
    });
  }

  async remove(id: string, empresaId: string, usuarioId?: string) {
    const equipo = await this.findOne(id, empresaId);

    if (equipo.estado === EstadoEquipo.RENTADO) {
      throw new BadRequestException(
        'No se puede eliminar un equipo que se encuentra rentado en un contrato activo',
      );
    }

    const contratoDetalleCount = await this.prisma.detalleContrato.count({
      where: { equipoId: id },
    });

    if (contratoDetalleCount > 0) {
      return this.prisma.$transaction(async (tx) => {
        await tx.equipo.update({
          where: { id },
          data: { estado: EstadoEquipo.BAJA },
        });
        await recordAuditInTx(tx, {
          empresaId,
          usuarioId,
          accion: 'EQUIPO_DADO_DE_BAJA',
          entidadTipo: 'EQUIPO',
          entidadId: id,
          detalles: {
            codigo: equipo.codigo,
            modelo: equipo.modelo,
            estadoAnterior: equipo.estado,
            motivo: 'Equipo con historial contractual',
          },
        });
        return {
          success: true,
          message:
            'El equipo tiene historial de contratos. Se ha cambiado su estado a "BAJA" para preservar el historial.',
          bajaAutomatica: true,
        };
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.equipo.delete({ where: { id } });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'EQUIPO_ELIMINADO',
        entidadTipo: 'EQUIPO',
        entidadId: id,
        detalles: {
          codigo: equipo.codigo,
          modelo: equipo.modelo,
          numeroSerie: equipo.numeroSerie,
          estado: equipo.estado,
        },
      });
      return {
        success: true,
        message: 'Equipo eliminado con éxito',
        bajaAutomatica: false,
      };
    });
  }

  // --- MÉTODOS AUXILIARES PARA EL CATÁLOGO Y TAXONOMÍA ---

  async getCategories() {
    return this.prisma.categoria.findMany({
      include: {
        subcategorias: {
          orderBy: { nombre: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async getSubcategories(categoriaId?: string) {
    return this.prisma.subcategoria.findMany({
      where: categoriaId ? { categoriaId } : undefined,
      include: { categoria: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async getBrands() {
    return this.prisma.marca.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  async createCategory(
    nombre: string,
    descripcion?: string,
    isLineaAmarilla: boolean = false,
  ) {
    const parsedName = nombre.trim();
    const exists = await this.prisma.categoria.findFirst({
      where: { nombre: parsedName },
    });
    if (exists) return exists;
    return this.prisma.categoria.create({
      data: { nombre: parsedName, descripcion, isLineaAmarilla },
    });
  }

  async createSubcategory(
    categoriaId: string,
    nombre: string,
    descripcion?: string,
  ) {
    const parsedName = nombre.trim();
    const exists = await this.prisma.subcategoria.findUnique({
      where: {
        categoriaId_nombre: {
          categoriaId,
          nombre: parsedName,
        },
      },
    });
    if (exists) return exists;
    return this.prisma.subcategoria.create({
      data: {
        categoriaId,
        nombre: parsedName,
        descripcion,
      },
    });
  }

  async removeCategory(id: string) {
    const count = await this.prisma.equipo.count({
      where: { categoriaId: id },
    });
    if (count > 0) {
      throw new BadRequestException(
        'No se puede eliminar la categoría porque tiene equipos asociados en el inventario.',
      );
    }
    await this.prisma.categoria.delete({ where: { id } });
    return { success: true, message: 'Categoría eliminada con éxito' };
  }

  async removeSubcategory(id: string) {
    const count = await this.prisma.equipo.count({
      where: { subcategoriaId: id },
    });
    if (count > 0) {
      throw new BadRequestException(
        'No se puede eliminar la subcategoría porque tiene equipos asociados en el inventario.',
      );
    }
    await this.prisma.subcategoria.delete({ where: { id } });
    return { success: true, message: 'Subcategoría eliminada con éxito' };
  }

  async createBrand(nombre: string) {
    const parsedName = nombre.trim();
    const exists = await this.prisma.marca.findFirst({
      where: { nombre: parsedName },
    });
    if (exists) return exists;
    return this.prisma.marca.create({ data: { nombre: parsedName } });
  }

  async removeBrand(id: string) {
    const count = await this.prisma.equipo.count({ where: { marcaId: id } });
    if (count > 0) {
      throw new BadRequestException(
        'No se puede eliminar la marca porque tiene equipos asociados en el inventario.',
      );
    }
    await this.prisma.marca.delete({ where: { id } });
    return { success: true, message: 'Marca eliminada con éxito' };
  }

  // --- MÉTODOS PARA EL CATÁLOGO DE PRODUCTOS COMERCIALES ---

  async createProduct(
    createProductDto: CreateProductDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const {
      nombre,
      codigo,
      descripcion,
      categoriaId,
      subcategoriaId,
      marcaId,
      tipoControl,
      modalidadRenta,
      precioRentaDia,
      precioRentaHora,
      minimoHoras,
    } = createProductDto;

    const categoria = await this.prisma.categoria.findUnique({
      where: { id: categoriaId },
    });
    if (!categoria)
      throw new BadRequestException('La categoría especificada no existe');

    const marca = await this.prisma.marca.findUnique({
      where: { id: marcaId },
    });
    if (!marca)
      throw new BadRequestException('La marca especificada no existe');

    return this.prisma.$transaction(async (tx) => {
      const producto = await tx.producto.create({
        data: {
          empresaId,
          nombre: nombre.trim(),
          codigo: codigo ? codigo.trim() : null,
          descripcion,
          categoriaId,
          subcategoriaId: subcategoriaId || null,
          marcaId,
          tipoControl: tipoControl || 'SERIALIZADO',
          modalidadRenta,
          precioRentaDia,
          precioRentaHora: precioRentaHora || null,
          minimoHoras: minimoHoras || 4,
        },
        include: {
          categoria: true,
          subcategoria: true,
          marca: true,
          equipos: true,
        },
      });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'PRODUCTO_CREADO',
        entidadTipo: 'PRODUCTO',
        entidadId: producto.id,
        detalles: {
          nombre: producto.nombre,
          codigo: producto.codigo,
          categoriaId,
          marcaId,
          tipoControl: producto.tipoControl,
        },
      });
      return producto;
    });
  }

  async findAllProducts(
    empresaId: string,
    categoriaId?: string,
    subcategoriaId?: string,
    marcaId?: string,
  ) {
    const whereClause: Prisma.ProductoWhereInput = { empresaId };
    if (categoriaId) whereClause.categoriaId = categoriaId;
    if (subcategoriaId) whereClause.subcategoriaId = subcategoriaId;
    if (marcaId) whereClause.marcaId = marcaId;

    return this.prisma.producto.findMany({
      where: whereClause,
      include: {
        categoria: true,
        subcategoria: true,
        marca: true,
        equipos: {
          include: { sucursal: true },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOneProduct(id: string, empresaId: string) {
    const producto = await this.prisma.producto.findFirst({
      where: { id, empresaId },
      include: {
        categoria: true,
        subcategoria: true,
        marca: true,
        equipos: {
          include: { sucursal: true },
        },
      },
    });

    if (!producto) {
      throw new NotFoundException(
        `No se encontró el producto comercial con ID: ${id}`,
      );
    }

    return producto;
  }

  async updateProduct(
    id: string,
    updateProductDto: UpdateProductDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const existente = await this.findOneProduct(id, empresaId);

    return this.prisma.$transaction(async (tx) => {
      const producto = await tx.producto.update({
        where: { id },
        data: {
          nombre: updateProductDto.nombre
            ? updateProductDto.nombre.trim()
            : undefined,
          codigo:
            updateProductDto.codigo !== undefined
              ? updateProductDto.codigo
              : undefined,
          descripcion: updateProductDto.descripcion,
          categoriaId: updateProductDto.categoriaId,
          subcategoriaId: updateProductDto.subcategoriaId,
          marcaId: updateProductDto.marcaId,
          tipoControl: updateProductDto.tipoControl,
          modalidadRenta: updateProductDto.modalidadRenta,
          precioRentaDia: updateProductDto.precioRentaDia,
          precioRentaHora: updateProductDto.precioRentaHora,
          minimoHoras: updateProductDto.minimoHoras,
        },
        include: {
          categoria: true,
          subcategoria: true,
          marca: true,
          equipos: true,
        },
      });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'PRODUCTO_ACTUALIZADO',
        entidadTipo: 'PRODUCTO',
        entidadId: id,
        detalles: {
          camposModificados: Object.keys(updateProductDto),
          nombreAnterior: existente.nombre,
          nombreNuevo: producto.nombre,
          codigoAnterior: existente.codigo,
          codigoNuevo: producto.codigo,
        },
      });
      return producto;
    });
  }

  async removeProduct(id: string, empresaId: string, usuarioId?: string) {
    const producto = await this.findOneProduct(id, empresaId);

    const equiposAsociados = await this.prisma.equipo.count({
      where: { productoId: id },
    });

    if (equiposAsociados > 0) {
      throw new BadRequestException(
        'No se puede eliminar un producto comercial que tiene unidades físicas asociadas en inventario.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.producto.delete({ where: { id: producto.id } });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId,
        accion: 'PRODUCTO_ELIMINADO',
        entidadTipo: 'PRODUCTO',
        entidadId: id,
        detalles: {
          nombre: producto.nombre,
          codigo: producto.codigo,
          categoriaId: producto.categoriaId,
          marcaId: producto.marcaId,
        },
      });
      return {
        success: true,
        message: 'Producto comercial eliminado con éxito',
      };
    });
  }
}
