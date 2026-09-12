import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateReglaComisionDto } from '../dto/create-regla-comision.dto';
import { UpdateReglaComisionDto } from '../dto/update-regla-comision.dto';

type ReglaSeed = {
  nombreVendedor: string;
  montoMinimo: number;
  montoMaximo: number | null;
  porcentaje: number;
};

@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly reglasPredeterminadas: ReglaSeed[] = [
    { nombreVendedor: 'DAVID', montoMinimo: 1, montoMaximo: 800000, porcentaje: 3 },
    { nombreVendedor: 'DAVID', montoMinimo: 800001, montoMaximo: 1200000, porcentaje: 2 },
    { nombreVendedor: 'DAVID', montoMinimo: 1200001, montoMaximo: null, porcentaje: 1 },
    { nombreVendedor: 'NYLSKA', montoMinimo: 1, montoMaximo: 300000, porcentaje: 2 },
    { nombreVendedor: 'NYLSKA', montoMinimo: 300001, montoMaximo: null, porcentaje: 1 },
  ];

  private validarTramo(montoMinimo: number, montoMaximo: number | null | undefined, porcentaje: number) {
    if (![montoMinimo, porcentaje].every(Number.isFinite) || montoMinimo < 0 || porcentaje < 0) {
      throw new BadRequestException('Los montos y el porcentaje deben ser números positivos');
    }
    if (montoMaximo !== null && montoMaximo !== undefined) {
      if (!Number.isFinite(montoMaximo) || montoMaximo < montoMinimo) {
        throw new BadRequestException('El monto máximo no puede ser menor que el monto mínimo');
      }
    }
  }

  private async validarUsuarioEmpresa(usuarioId: string, empresaId: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId },
      select: { id: true },
    });
    if (!usuario) {
      throw new NotFoundException('El vendedor no existe o no pertenece a tu empresa');
    }
  }

  async create(createDto: CreateReglaComisionDto, empresaId: string) {
    this.validarTramo(createDto.montoMinimo, createDto.montoMaximo, createDto.porcentaje);
    if (createDto.usuarioId) {
      await this.validarUsuarioEmpresa(createDto.usuarioId, empresaId);
    }

    return this.prisma.reglaComision.create({
      data: {
        ...createDto,
        nombreVendedor: createDto.nombreVendedor?.trim() || null,
        empresaId,
        activo: createDto.activo ?? true,
      },
    });
  }

  async findAll(empresaId: string) {
    return this.prisma.reglaComision.findMany({
      where: { empresaId },
      orderBy: [{ nombreVendedor: 'asc' }, { montoMinimo: 'asc' }],
      include: {
        usuario: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
      },
    });
  }

  async findOne(id: string, empresaId: string) {
    const regla = await this.prisma.reglaComision.findFirst({
      where: { id, empresaId },
    });
    if (!regla) {
      throw new NotFoundException(`No se encontró la regla de comisión con ID: ${id}`);
    }
    return regla;
  }

  async update(id: string, updateDto: UpdateReglaComisionDto, empresaId: string) {
    const regla = await this.findOne(id, empresaId);
    if (updateDto.usuarioId) {
      await this.validarUsuarioEmpresa(updateDto.usuarioId, empresaId);
    }

    const montoMinimo = updateDto.montoMinimo ?? regla.montoMinimo;
    const montoMaximo = updateDto.montoMaximo === undefined
      ? regla.montoMaximo
      : updateDto.montoMaximo;
    const porcentaje = updateDto.porcentaje ?? regla.porcentaje;
    this.validarTramo(montoMinimo, montoMaximo, porcentaje);

    return this.prisma.reglaComision.update({
      where: { id },
      data: {
        ...updateDto,
        ...(updateDto.nombreVendedor !== undefined
          ? { nombreVendedor: updateDto.nombreVendedor?.trim() || null }
          : {}),
      },
    });
  }

  async remove(id: string, empresaId: string) {
    await this.findOne(id, empresaId);
    return this.prisma.reglaComision.delete({ where: { id } });
  }

  async seedDefaultRules(empresaId: string) {
    const resultados: any[] = [];

    for (const regla of this.reglasPredeterminadas) {
      const existente = await this.prisma.reglaComision.findFirst({
        where: {
          empresaId,
          usuarioId: null,
          nombreVendedor: regla.nombreVendedor,
          montoMinimo: regla.montoMinimo,
          montoMaximo: regla.montoMaximo,
        },
      });

      if (existente) {
        resultados.push(await this.prisma.reglaComision.update({
          where: { id: existente.id },
          data: { porcentaje: regla.porcentaje, activo: true },
        }));
      } else {
        resultados.push(await this.prisma.reglaComision.create({
          data: { ...regla, empresaId, usuarioId: null, activo: true },
        }));
      }
    }

    return resultados;
  }

  async calculateCommission(empresaId: string, usuarioId: string, montoVentas: number) {
    if (!Number.isFinite(montoVentas) || montoVentas < 0) {
      throw new BadRequestException('El monto de ventas debe ser un número positivo');
    }

    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, empresaId },
      select: { id: true, nombre: true, apellido: true },
    });
    if (!usuario) {
      throw new NotFoundException('El vendedor no existe o no pertenece a tu empresa');
    }

    const reglas = await this.prisma.reglaComision.findMany({
      where: {
        empresaId,
        activo: true,
        montoMinimo: { lte: montoVentas },
        OR: [
          { montoMaximo: null },
          { montoMaximo: { gte: montoVentas } },
        ],
      },
      orderBy: { montoMinimo: 'desc' },
    });

    const nombresUsuario = [usuario.nombre, `${usuario.nombre} ${usuario.apellido}`]
      .map((nombre) => nombre.trim().toLocaleUpperCase('es'));
    const regla = reglas
      .map((candidata: any) => {
        const coincideUsuario = candidata.usuarioId === usuarioId;
        const coincideNombre = !candidata.usuarioId
          && candidata.nombreVendedor
          && nombresUsuario.includes(candidata.nombreVendedor.trim().toLocaleUpperCase('es'));
        const esGeneral = !candidata.usuarioId && !candidata.nombreVendedor;
        return {
          candidata,
          prioridad: coincideUsuario ? 3 : coincideNombre ? 2 : esGeneral ? 1 : 0,
        };
      })
      .filter(({ prioridad }) => prioridad > 0)
      .sort((a, b) => b.prioridad - a.prioridad)[0]?.candidata;

    if (!regla) {
      throw new NotFoundException('No existe una regla de comisión aplicable para este vendedor y monto');
    }

    return {
      porcentaje: regla.porcentaje,
      montoComision: Math.round((montoVentas * regla.porcentaje) / 100 * 100) / 100,
    };
  }
}
