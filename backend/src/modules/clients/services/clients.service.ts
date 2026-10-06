import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateClientDto } from '../dto/create-client.dto';
import { UpdateClientDto } from '../dto/update-client.dto';
import { Prisma } from '@prisma/client';
import { recordAuditInTx } from '../../auditoria/utils/audit-tx.util';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  private async findVendedor(vendedorId: string, empresaId: string) {
    const vendedor = await this.prisma.usuario.findFirst({
      where: { id: vendedorId, empresaId },
      select: { id: true, nombre: true, apellido: true },
    });
    if (!vendedor) {
      throw new BadRequestException(
        'El vendedor no existe o no pertenece a tu empresa',
      );
    }
    return vendedor;
  }

  async create(
    createClientDto: CreateClientDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    const { rfc } = createClientDto;

    // Verificar duplicidad de RFC en la misma empresa si se proporciona
    if (rfc) {
      const clientExists = await this.prisma.cliente.findFirst({
        where: {
          rfc,
          empresaId,
        },
      });
      if (clientExists) {
        throw new BadRequestException(
          'Ya existe un cliente con este RFC registrado en tu empresa',
        );
      }
    }

    let vendedor = createClientDto.vendedor;
    let vendedorId = createClientDto.vendedorId;

    if (vendedorId) {
      const vendedorAsignado = await this.findVendedor(vendedorId, empresaId);
      vendedor ||=
        `${vendedorAsignado.nombre} ${vendedorAsignado.apellido}`.trim();
    } else if (!vendedor && usuarioId) {
      const creadorAsesor = await this.prisma.usuario.findFirst({
        where: {
          id: usuarioId,
          empresaId,
          roles: {
            some: {
              rol: { nombre: { in: ['COMERCIAL', 'VENTAS', 'ASESOR'] } },
            },
          },
        },
        select: { id: true, nombre: true, apellido: true },
      });
      if (creadorAsesor) {
        vendedorId = creadorAsesor.id;
        vendedor = `${creadorAsesor.nombre} ${creadorAsesor.apellido}`.trim();
      }
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const cliente = await tx.cliente.create({
        data: {
          ...createClientDto,
          vendedor,
          vendedorId,
          empresaId,
        },
      });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId: usuarioId ?? null,
        accion: 'CLIENTE_CREADO',
        entidadTipo: 'CLIENTE',
        entidadId: cliente.id,
        detalles: {
          nombre: cliente.nombre,
          rfc: cliente.rfc,
          vendedorId: cliente.vendedorId,
        },
      });
      return cliente;
    });
  }

  async findAll(empresaId: string) {
    return this.prisma.cliente.findMany({
      where: { empresaId },
      orderBy: [{ numeroCliente: 'asc' }, { nombre: 'asc' }],
      include: {
        contactos: true, // Incluye los contactos relacionados
        vendedorAsignado: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
      },
    });
  }

  async findOne(id: string, empresaId: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: {
        id,
        empresaId,
      },
      include: {
        contactos: true,
        vendedorAsignado: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
      },
    });

    if (!cliente) {
      throw new NotFoundException(`No se encontró el cliente con ID: ${id}`);
    }

    return cliente;
  }

  async update(
    id: string,
    updateClientDto: UpdateClientDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    // Verificar que exista y pertenezca a la empresa
    const anterior = await this.findOne(id, empresaId);

    let vendedor = updateClientDto.vendedor;
    if (updateClientDto.vendedorId) {
      const vendedorAsignado = await this.findVendedor(
        updateClientDto.vendedorId,
        empresaId,
      );
      vendedor ||=
        `${vendedorAsignado.nombre} ${vendedorAsignado.apellido}`.trim();
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const cliente = await tx.cliente.update({
        where: { id },
        data: {
          ...updateClientDto,
          ...(vendedor !== undefined ? { vendedor } : {}),
        },
      });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId: usuarioId ?? null,
        accion: 'CLIENTE_ACTUALIZADO',
        entidadTipo: 'CLIENTE',
        entidadId: id,
        detalles: {
          nombreAnterior: anterior.nombre,
          nombreNuevo: cliente.nombre,
          camposModificados: Object.keys(updateClientDto),
        },
      });
      return cliente;
    });
  }

  async remove(id: string, empresaId: string, usuarioId?: string) {
    // Verificar que exista y pertenezca a la empresa
    const cliente = await this.findOne(id, empresaId);

    const [contratosCount, cotizacionesCount, facturasCount] =
      await Promise.all([
        this.prisma.contrato.count({ where: { clienteId: id } }),
        this.prisma.cotizacion.count({ where: { clienteId: id } }),
        this.prisma.factura.count({ where: { clienteId: id } }),
      ]);

    if (contratosCount > 0 || cotizacionesCount > 0 || facturasCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar el cliente porque posee historial comercial activo (${contratosCount} contratos, ${cotizacionesCount} cotizaciones, ${facturasCount} facturas). Se recomienda conservar su registro por integridad fiscal y contable.`,
      );
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const eliminado = await tx.cliente.delete({ where: { id } });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId: usuarioId ?? null,
        accion: 'CLIENTE_ELIMINADO',
        entidadTipo: 'CLIENTE',
        entidadId: id,
        detalles: { nombre: cliente.nombre, rfc: cliente.rfc },
      });
      return eliminado;
    });
  }
}
