import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, Auditoria } from '@prisma/client';
import { CreateAuditRecordDto } from '../interfaces/audit-context.interface';
import { QueryAuditoriaDto } from '../dto/query-auditoria.dto';
import { serializeAuditDetails } from '../utils/sanitize-audit.util';
import { normalizeIp } from '../../../common/utils/client-ip.util';
import { getAuditRequestContext } from '../utils/audit-request-context';

const MODULE_AUDIT_FILTERS: Record<string, { entities: string[]; actions?: string[] }> = {
  AUTH: { entities: ['USUARIO'], actions: ['LOGIN_', 'LOGOUT_', 'SESION_'] },
  SECURITY: { entities: ['AUTH', 'USERS', 'ROLES', 'USUARIO', 'ROL'], actions: ['LOGIN_', 'LOGOUT_', 'SESION_'] },
  USERS: { entities: ['USUARIO'] },
  ROLES: { entities: ['ROL'] },
  CLIENTS: { entities: ['CLIENTE'] },
  INVENTORY: { entities: ['EQUIPO', 'PRODUCTO'] },
  QUOTATIONS: { entities: ['COTIZACION'] },
  CONTRACTS: { entities: ['CONTRATO', 'CORTE_FACTURACION'] },
  OPERATIONS: { entities: ['SOLICITUD_DESPACHO', 'SOLICITUD_RETORNO', 'DESPACHO', 'DEVOLUCION'] },
  MAINTENANCE: { entities: ['MANTENIMIENTO'] },
  HOROMETROS: { entities: [], actions: ['HOROMETRO_'] },
  BILLING: { entities: ['FACTURA', 'PAGO'] },
  COMMISSIONS: { entities: ['REGLA_COMISION'], actions: ['REGLAS_COMISION_'] },
  AVAILABILITY: { entities: ['RESERVA'] },
  ACCOUNTING: { entities: [] },
  AUDITORIA: { entities: [] },
};

export interface PaginatedAuditoriaResult {
  data: Array<
    Auditoria & {
      usuario: {
        id: string;
        nombre: string;
        apellido: string;
        email: string;
      } | null;
    }
  >;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra un evento en la bitácora de auditoría forense dentro de una transacción activa.
   * Si la transacción de negocio se revierte, el evento de auditoría también se revierte.
   * Si el registro de auditoría falla, la transacción de negocio completa se revierte.
   */
  async record(
    tx: Prisma.TransactionClient,
    dto: CreateAuditRecordDto,
  ): Promise<Auditoria> {
    if (!dto.empresaId) {
      throw new BadRequestException(
        'empresaId es obligatorio para registrar auditoría forense',
      );
    }
    if (!dto.accion || !dto.entidadTipo || !dto.entidadId) {
      throw new BadRequestException(
        'accion, entidadTipo y entidadId son obligatorios para registrar auditoría',
      );
    }

    const requestContext = getAuditRequestContext();
    const sanitizedDetalles = serializeAuditDetails(dto.detalles);
    const ipDireccion = normalizeIp(
      dto.ipDireccion ?? requestContext?.ipDireccion,
    );
    const userAgent = (
      dto.userAgent ??
      requestContext?.userAgent ??
      'System'
    ).slice(0, 255);

    return tx.auditoria.create({
      data: {
        empresaId: dto.empresaId,
        usuarioId: dto.usuarioId || null,
        accion: dto.accion,
        entidadTipo: dto.entidadTipo,
        entidadId: dto.entidadId,
        detalles: sanitizedDetalles,
        ipDireccion,
        userAgent,
        requestId: dto.requestId ?? requestContext?.requestId ?? null,
      },
    });
  }

  /**
   * Consulta paginada y filtrada exclusivamente para el tenant autenticado.
   * Un administrador de Empresa A jamás puede acceder a registros de Empresa B.
   */
  async findAll(
    empresaId: string,
    query: QueryAuditoriaDto,
  ): Promise<PaginatedAuditoriaResult> {
    if (!empresaId) {
      throw new BadRequestException('empresaId es requerido');
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditoriaWhereInput = {
      empresaId, // Aislamiento estricto obligatorio por tenant
    };

    if (query.accion) {
      where.accion = { contains: query.accion.trim(), mode: 'insensitive' };
    }
    if (query.tipoEvento === 'HTTP') {
      where.AND = [{ accion: { startsWith: 'HTTP_' } }];
    } else if (query.tipoEvento === 'NEGOCIO') {
      where.NOT = { accion: { startsWith: 'HTTP_' } };
    }
    if (query.modulo) {
      const modulo = query.modulo.trim().toUpperCase();
      const mapping = MODULE_AUDIT_FILTERS[modulo];
      if (!mapping) {
        throw new BadRequestException('El módulo solicitado no es válido.');
      }
      where.OR = [
        { entidadTipo: modulo },
        ...(mapping.entities.length ? [{ entidadTipo: { in: mapping.entities } }] : []),
        ...(mapping.actions || []).map((prefix) => ({ accion: { startsWith: prefix } })),
      ];
    }
    if (query.entidadTipo) {
      where.entidadTipo = query.entidadTipo;
    }
    if (query.entidadId) {
      where.entidadId = query.entidadId;
    }
    if (query.usuarioId) {
      where.usuarioId = query.usuarioId;
    }
    if (query.requestId) {
      where.requestId = query.requestId;
    }

    if (query.fechaInicio || query.fechaFin) {
      where.createdAt = {};
      if (query.fechaInicio) {
        where.createdAt.gte = new Date(query.fechaInicio);
      }
      if (query.fechaFin) {
        where.createdAt.lte = new Date(query.fechaFin);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.auditoria.findMany({
        where,
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditoria.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Obtiene un registro individual de auditoría verificando estricta propiedad del tenant.
   */
  async findById(empresaId: string, id: string) {
    if (!empresaId) {
      throw new BadRequestException('empresaId es requerido');
    }

    const registro = await this.prisma.auditoria.findFirst({
      where: { id, empresaId },
      include: {
        usuario: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
      },
    });

    if (!registro) {
      throw new NotFoundException(
        `Registro de auditoría no encontrado o no pertenece a la empresa: ${id}`,
      );
    }

    return registro;
  }
}
