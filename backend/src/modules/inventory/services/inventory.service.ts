import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateEquipmentDto, EstadoEquipo } from '../dto/create-equipment.dto';
import { UpdateEquipmentDto } from '../dto/update-equipment.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createEquipmentDto: CreateEquipmentDto, empresaId: string) {
    const { codigo, numeroSerie, sucursalId, categoriaId, marcaId, cantidadTotal, cantidadDisponible } = createEquipmentDto;

    // 1. Validar sucursal
    const sucursalExists = await this.prisma.sucursal.findFirst({
      where: { id: sucursalId, empresaId },
    });
    if (!sucursalExists) {
      throw new BadRequestException('La sucursal seleccionada no existe o no pertenece a tu empresa');
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
        throw new ConflictException(`Ya existe un equipo registrado con el número de serie "${numeroSerie}"`);
      }
    }

    return this.prisma.equipo.create({
      data: {
        codigo: codigo || null,
        modelo: createEquipmentDto.modelo,
        numeroSerie: numeroSerie ? numeroSerie.trim() : null,
        precioRentaDia: createEquipmentDto.precioRentaDia,
        horometro: createEquipmentDto.horometro || 0.0,
        descripcion: createEquipmentDto.descripcion,
        estado: (createEquipmentDto.estado as any) || EstadoEquipo.DISPONIBLE,
        cantidadTotal: cantidadTotal !== undefined ? cantidadTotal : 1,
        cantidadDisponible: cantidadDisponible !== undefined ? cantidadDisponible : (cantidadTotal !== undefined ? cantidadTotal : 1),
        empresa: { connect: { id: empresaId } },
        sucursal: { connect: { id: sucursalId } },
        categoria: { connect: { id: categoriaId } },
        marca: { connect: { id: marcaId } },
      },
      include: {
        sucursal: true,
        categoria: true,
        marca: true,
      },
    });
  }

  async findAll(empresaId: string, sucursalId?: string, categoriaId?: string, estado?: string) {
    const whereClause: any = { empresaId };

    if (sucursalId) whereClause.sucursalId = sucursalId;
    if (categoriaId) whereClause.categoriaId = categoriaId;
    if (estado) whereClause.estado = estado;

    return this.prisma.equipo.findMany({
      where: whereClause,
      include: {
        sucursal: true,
        categoria: true,
        marca: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, empresaId: string) {
    const equipo = await this.prisma.equipo.findFirst({
      where: { id, empresaId },
      include: {
        sucursal: true,
        categoria: true,
        marca: true,
      },
    });

    if (!equipo) {
      throw new NotFoundException(`No se encontró el equipo con ID: ${id}`);
    }

    return equipo;
  }

  async update(id: string, updateEquipmentDto: UpdateEquipmentDto, empresaId: string) {
    await this.findOne(id, empresaId);

    const { sucursalId, categoriaId, marcaId, numeroSerie, codigo, cantidadTotal, cantidadDisponible } = updateEquipmentDto;

    if (sucursalId) {
      const sucursalExists = await this.prisma.sucursal.findFirst({
        where: { id: sucursalId, empresaId },
      });
      if (!sucursalExists) {
        throw new BadRequestException('La sucursal seleccionada no pertenece a tu empresa');
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
        throw new ConflictException(`Ya existe otro equipo registrado con el número de serie "${numeroSerie}"`);
      }
    }

    return this.prisma.equipo.update({
      where: { id },
      data: {
        codigo: codigo !== undefined ? codigo : undefined,
        modelo: updateEquipmentDto.modelo,
        numeroSerie: numeroSerie ? numeroSerie.trim() : (numeroSerie === null ? null : undefined),
        precioRentaDia: updateEquipmentDto.precioRentaDia,
        horometro: updateEquipmentDto.horometro,
        descripcion: updateEquipmentDto.descripcion,
        estado: updateEquipmentDto.estado as any,
        cantidadTotal: cantidadTotal !== undefined ? cantidadTotal : undefined,
        cantidadDisponible: cantidadDisponible !== undefined ? cantidadDisponible : undefined,
        sucursal: sucursalId ? { connect: { id: sucursalId } } : undefined,
        categoria: categoriaId ? { connect: { id: categoriaId } } : undefined,
        marca: marcaId ? { connect: { id: marcaId } } : undefined,
      },
      include: {
        sucursal: true,
        categoria: true,
        marca: true,
      },
    });
  }

  async remove(id: string, empresaId: string) {
    const equipo = await this.findOne(id, empresaId);

    if (equipo.estado === EstadoEquipo.RENTADO) {
      throw new BadRequestException('No se puede eliminar un equipo que se encuentra rentado en un contrato activo');
    }

    const contratoDetalleCount = await this.prisma.detalleContrato.count({
      where: { equipoId: id },
    });

    if (contratoDetalleCount > 0) {
      await this.prisma.equipo.update({
        where: { id },
        data: { estado: EstadoEquipo.BAJA as any },
      });
      return {
        success: true,
        message: 'El equipo tiene historial de contratos. Se ha cambiado su estado a "BAJA" para preservar el historial.',
        bajaAutomatica: true,
      };
    }

    await this.prisma.equipo.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Equipo eliminado con éxito',
      bajaAutomatica: false,
    };
  }

  // --- MÉTODOS AUXILIARES PARA EL CATÁLOGO ---

  async getCategories() {
    return this.prisma.categoria.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  async getBrands() {
    return this.prisma.marca.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  async createCategory(nombre: string) {
    const parsedName = nombre.trim();
    const exists = await this.prisma.categoria.findUnique({ where: { nombre: parsedName } });
    if (exists) return exists;
    return this.prisma.categoria.create({ data: { nombre: parsedName } });
  }

  async removeCategory(id: string) {
    const count = await this.prisma.equipo.count({ where: { categoriaId: id } });
    if (count > 0) {
      throw new BadRequestException('No se puede eliminar la categoría porque tiene equipos asociados en el inventario.');
    }
    await this.prisma.categoria.delete({ where: { id } });
    return { success: true, message: 'Categoría eliminada con éxito' };
  }

  async createBrand(nombre: string) {
    const parsedName = nombre.trim();
    const exists = await this.prisma.marca.findUnique({ where: { nombre: parsedName } });
    if (exists) return exists;
    return this.prisma.marca.create({ data: { nombre: parsedName } });
  }

  async removeBrand(id: string) {
    const count = await this.prisma.equipo.count({ where: { marcaId: id } });
    if (count > 0) {
      throw new BadRequestException('No se puede eliminar la marca porque tiene equipos asociados en el inventario.');
    }
    await this.prisma.marca.delete({ where: { id } });
    return { success: true, message: 'Marca eliminada con éxito' };
  }
}
