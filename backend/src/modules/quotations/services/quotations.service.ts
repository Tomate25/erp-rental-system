import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { OutboxService } from '../../mail/services/outbox.service';
import { generateQuotationEmailHtml } from '../../mail/templates/quotation-email.template';
import { SendQuotationEmailDto } from '../dto/send-quotation-email.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateQuotationDto,
  QuotationItemDto,
} from '../dto/create-quotation.dto';
import {
  CreatePublicQuotationDto,
  PublicQuotationItemDto,
} from '../dto/create-public-quotation.dto';
import { UpdateQuotationDto } from '../dto/update-quotation.dto';
import {
  EstadoContrato,
  EstadoCotizacion,
  TipoCobro,
  EstadoEquipo,
  EstadoReserva,
  TipoControlEquipo,
  EstadoCorteFacturacion,
  Prisma,
  Equipo,
} from '@prisma/client';
import { recordAuditInTx } from '../../auditoria/utils/audit-tx.util';
import {
  assertEmpresaId,
  assertSucursalEnEmpresa,
  resolveSucursalIdEnEmpresa,
} from '../../../common/utils/tenant.util';
import {
  toNumberHorasOrNull,
} from '../../../common/utils/decimal.util';
import {
  nextContractCode,
  nextQuoteNumber,
} from '../../../common/utils/numbering.util';
import { resolveQuotationEquipment } from '../../contracts/utils/resolve-quotation-equipment';
import { duracionContratoDias } from '../utils/contract-duration';
import { LIMITS } from '../../../common/validation/dto-limits';
import {
  calculateItemAmount,
  calculateTotals,
  assertNonNegative,
  DEFAULT_IVA_RATE,
  FinancialTotalsResult,
} from '../../../common/utils/financial-calculator';

type PrismaDbClient = PrismaService | Prisma.TransactionClient;

interface AdvisorStats {
  asesorId: string;
  nombre: string;
  email: string;
  totalCotizaciones: number;
  cotizacionesAprobadas: number;
  cotizacionesPendientes: number;
  cotizacionesRechazadas: number;
  montoTotalCotizado: number;
  montoTotalVendido: number;
  ticketPromedio: number;
  tasaConversion: number;
  contratosGenerados: number;
}

@Injectable()
export class QuotationsService {
  constructor(
    private prisma: PrismaService,
    @Optional() private readonly outboxService?: OutboxService,
  ) {}

  private readonly rolesAsesor = ['COMERCIAL', 'VENTAS', 'ASESOR'];

  private validateRentalPeriod(start?: string | Date | null, end?: string | Date | null) {
    if (!start && !end) return;
    const from = start ? new Date(start) : null;
    const to = end ? new Date(end) : null;
    if (!from || !to || !Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || to <= from) {
      throw new BadRequestException('Selecciona un período de renta con fecha final posterior a la fecha inicial.');
    }
    const dias = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    if (dias > LIMITS.DAYS_MAX) {
      throw new BadRequestException(
        `El período de renta no puede superar ${LIMITS.DAYS_MAX} días.`,
      );
    }
  }

  private normalizarNombre(value?: string | null): string {
    return (value || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('es');
  }

  private async resolveAsesorId(
    db: PrismaDbClient,
    cliente: {
      id: string;
      vendedorId?: string | null;
      vendedor?: string | null;
    },
    empresaId: string,
    asesorSolicitadoId?: string,
    usuarioId?: string,
    asesorActualId?: string | null,
  ): Promise<string | undefined> {
    let vendedorAsignadoId = cliente.vendedorId || undefined;

    if (!vendedorAsignadoId && cliente.vendedor) {
      const nombreVendedor = this.normalizarNombre(cliente.vendedor);
      const usuarios = await db.usuario.findMany({
        where: { empresaId },
        select: { id: true, nombre: true, apellido: true, email: true },
      });
      const vendedorAsignado = usuarios.find((usuario) => {
        const nombreCompleto = `${usuario.nombre} ${usuario.apellido}`.trim();
        return [usuario.nombre, nombreCompleto, usuario.email]
          .map((value) => this.normalizarNombre(value))
          .includes(nombreVendedor);
      });

      if (vendedorAsignado) {
        vendedorAsignadoId = vendedorAsignado.id;
        await db.cliente.update({
          where: { id: cliente.id },
          data: { vendedorId: vendedorAsignado.id },
        });
      }
    }

    let effectiveAsesorId =
      asesorSolicitadoId || vendedorAsignadoId || asesorActualId || undefined;

    if (!cliente.vendedorId && !cliente.vendedor && usuarioId) {
      const creadorAsesor = await db.usuario.findFirst({
        where: {
          id: usuarioId,
          empresaId,
          roles: {
            some: {
              rol: { nombre: { in: this.rolesAsesor } },
            },
          },
        },
        select: { id: true, nombre: true, apellido: true },
      });

      if (creadorAsesor) {
        effectiveAsesorId = asesorSolicitadoId || creadorAsesor.id;
        await db.cliente.update({
          where: { id: cliente.id },
          data: {
            vendedorId: creadorAsesor.id,
            vendedor:
              `${creadorAsesor.nombre} ${creadorAsesor.apellido}`.trim(),
          },
        });
      }
    }

    if (effectiveAsesorId) {
      const asesor = await db.usuario.findFirst({
        where: { id: effectiveAsesorId, empresaId },
        select: { id: true },
      });
      if (!asesor) {
        throw new ForbiddenException(
          'El asesor no existe o no pertenece a tu empresa',
        );
      }
    }

    return effectiveAsesorId;
  }


  private async processAndValidateQuotationItems(
    db: PrismaDbClient,
    rawItems: (QuotationItemDto | PublicQuotationItemDto)[],
    empresaId: string,
    globalDiscount: number = 0,
    isPublic: boolean = false,
  ): Promise<{
    processedItems: Array<{
      productoId?: string;
      equipoId?: string;
      descripcion: string;
      tipoCobro: TipoCobro;
      cantidad: number;
      dias: number;
      horas?: number;
      precioUnitario: number;
      descuento: number;
      subtotal: number;
    }>;
    totals: FinancialTotalsResult;
  }> {
    if (!rawItems || rawItems.length === 0) {
      throw new BadRequestException(
        'La cotización debe contener al menos un ítem.',
      );
    }

    const processedItems: Array<{
      productoId?: string;
      equipoId?: string;
      descripcion: string;
      tipoCobro: TipoCobro;
      cantidad: number;
      dias: number;
      horas?: number;
      precioUnitario: number;
      descuento: number;
      subtotal: number;
    }> = [];

    for (const item of rawItems || []) {
      if (item.equipoId && item.productoId) {
        throw new BadRequestException(
          'Cada ítem debe referenciar un equipo o un producto, no ambos.',
        );
      }

      let precioUnitario = 'precioUnitario' in item ? item.precioUnitario : 0;
      let descripcion = item.descripcion || '';

      if (item.equipoId) {
        const equipo = await db.equipo.findFirst({
          where: { id: item.equipoId, empresaId },
        });
        if (!equipo) {
          throw new BadRequestException(
            `El equipo ${item.equipoId} no existe o no pertenece a tu empresa.`,
          );
        }
        descripcion = item.descripcion || equipo.descripcion || equipo.modelo;
        const isHourly =
          item.tipoCobro === TipoCobro.POR_HORA || item.tipoTarifa === 'HORA';
        let officialRate = isHourly
          ? equipo.precioRentaHora
          : equipo.precioRentaDia;

        if (
          isHourly &&
          (officialRate === undefined ||
            officialRate === null ||
            Number(officialRate) <= 0) &&
          equipo.precioRentaDia &&
          Number(equipo.precioRentaDia) > 0
        ) {
          officialRate = new Prisma.Decimal(
            Math.round((Number(equipo.precioRentaDia) / 8) * 10000) / 10000,
          );
        }
        if (
          !isHourly &&
          (officialRate === undefined ||
            officialRate === null ||
            Number(officialRate) <= 0) &&
          equipo.precioRentaHora &&
          Number(equipo.precioRentaHora) > 0
        ) {
          officialRate = new Prisma.Decimal(Number(equipo.precioRentaHora) * 8);
        }

        if (officialRate === undefined || officialRate === null) {
          throw new BadRequestException(
            `El equipo ${item.equipoId} no tiene una tarifa oficial para ${isHourly ? 'hora' : 'día'}.`,
          );
        }
        precioUnitario = assertNonNegative(
          Number(officialRate),
          'tarifa oficial del equipo',
        );
      } else if (item.productoId) {
        const producto = await db.producto.findFirst({
          where: { id: item.productoId, empresaId },
        });
        if (!producto) {
          throw new BadRequestException(
            `El producto ${item.productoId} no existe o no pertenece a tu empresa.`,
          );
        }
        descripcion =
          item.descripcion || producto.nombre || producto.descripcion || '';
        const isHourly =
          item.tipoCobro === TipoCobro.POR_HORA || item.tipoTarifa === 'HORA';
        const officialRate = isHourly
          ? producto.precioRentaHora
          : producto.precioRentaDia;
        if (officialRate === undefined || officialRate === null) {
          throw new BadRequestException(
            `El producto ${item.productoId} no tiene una tarifa oficial para ${isHourly ? 'hora' : 'día'}.`,
          );
        }
        precioUnitario = assertNonNegative(
          Number(officialRate),
          'tarifa oficial del producto',
        );
      }

      if (isPublic && !item.equipoId && !item.productoId) {
        throw new BadRequestException(
          'Las solicitudes públicas de cotización deben especificar un equipo o producto válido del catálogo.',
        );
      }

      const calculated = calculateItemAmount({
        cantidad: item.cantidad ?? 1,
        dias: item.dias ?? 1,
        horas: item.horas,
        tipoCobro: item.tipoCobro,
        tipoTarifa: item.tipoTarifa,
        precioUnitario: precioUnitario ?? 0,
        descuento: isPublic || !('descuento' in item) ? 0 : item.descuento,
      });

      processedItems.push({
        productoId: item.productoId ? item.productoId : undefined,
        equipoId: item.equipoId ? item.equipoId : undefined,
        descripcion: descripcion || 'Ítem de cotización',
        tipoCobro: calculated.tipoCobro,
        cantidad: calculated.cantidad,
        dias: calculated.dias,
        horas: calculated.horas,
        precioUnitario: calculated.precioUnitario,
        descuento: calculated.descuento,
        subtotal: calculated.subtotal,
      });
    }

    const totals = calculateTotals(
      processedItems,
      isPublic ? 0 : globalDiscount,
      DEFAULT_IVA_RATE,
    );
    return { processedItems, totals };
  }

  async create(
    createDto: CreateQuotationDto,
    empresaId: string,
    sucursalId?: string,
    usuarioId?: string,
  ) {
    this.validateRentalPeriod(createDto.fechaInicioRenta, createDto.fechaFinRenta);
    const validez = createDto.validezDias || 15;
    const fechaVence = new Date();
    fechaVence.setDate(fechaVence.getDate() + validez);

    const cliente = await this.prisma.cliente.findFirst({
      where: { id: createDto.clienteId, empresaId },
      select: { id: true, vendedorId: true, vendedor: true },
    });
    if (!cliente) {
      throw new NotFoundException(
        'El cliente no existe o no pertenece a tu empresa',
      );
    }

    const effectiveAsesorId = await this.resolveAsesorId(
      this.prisma,
      cliente,
      empresaId,
      createDto.asesorId,
      usuarioId,
    );

    if (!createDto.items || createDto.items.length === 0) {
      throw new BadRequestException(
        'La cotización debe contener al menos un ítem.',
      );
    }

    let processedItems: any[] = [];
    let subtotal = 0;
    let descuento = createDto.descuento
      ? assertNonNegative(createDto.descuento, 'descuento')
      : 0;
    let iva = 0;
    let total = 0;

    if (createDto.items.length > 0) {
      const calculation = await this.processAndValidateQuotationItems(
        this.prisma,
        createDto.items,
        empresaId,
        descuento,
        false,
      );
      processedItems = calculation.processedItems;
      subtotal = calculation.totals.subtotal;
      descuento = calculation.totals.descuento;
      iva = calculation.totals.iva;
      total = calculation.totals.total;
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let effectiveSucursalId = sucursalId;
      if (effectiveSucursalId) {
        await assertSucursalEnEmpresa(tx, effectiveSucursalId, empresaId);
      } else if (tx.sucursal) {
        const defaultBranch = await tx.sucursal.findFirst({
          where: { empresaId },
          orderBy: { createdAt: 'asc' },
        });
        effectiveSucursalId = defaultBranch?.id;
      }

      // Número por empresa, atómico y dentro de la misma transacción.
      const numeroCotizacion = await nextQuoteNumber(tx, empresaId);

      const cotizacion = await tx.cotizacion.create({
        data: {
          empresaId,
          sucursalId: effectiveSucursalId,
          numeroCotizacion,
          clienteId: createDto.clienteId,
          proyecto: createDto.proyecto,
          atencion: createDto.atencion,
          telefono: createDto.telefono,
          email: createDto.email,
          referencia: createDto.referencia,
          asesorId: effectiveAsesorId,
          validezDias: validez,
          fechaVence,
          fechaInicioRenta: createDto.fechaInicioRenta
            ? new Date(createDto.fechaInicioRenta)
            : null,
          fechaFinRenta: createDto.fechaFinRenta
            ? new Date(createDto.fechaFinRenta)
            : null,
          condiciones: createDto.condiciones,
          notasRevision: createDto.notasRevision,
          subtotal,
          descuento,
          iva,
          total,
          depositoGarantia: createDto.depositoGarantia
            ? assertNonNegative(createDto.depositoGarantia, 'depositoGarantia')
            : 0,
          estado: createDto.estado || EstadoCotizacion.BORRADOR,
          items: {
            create: processedItems,
          },
        },
        include: {
          items: {
            include: { equipo: true },
          },
          cliente: true,
        },
      });

      if (cotizacion) {
        await recordAuditInTx(tx, {
          empresaId,
          usuarioId: usuarioId || null,
          accion: 'COTIZACION_CREADA',
          entidadTipo: 'COTIZACION',
          entidadId: cotizacion.id,
          detalles: {
            numeroCotizacion: cotizacion.numeroCotizacion,
            total: cotizacion.total,
            clienteId: cotizacion.clienteId,
          },
        });
      }

      return cotizacion;
    });
  }

  async createPublic(createDto: CreatePublicQuotationDto) {
    const validez = createDto.validezDias || 15;
    const fechaVence = new Date();
    fechaVence.setDate(fechaVence.getDate() + validez);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let empresa: { id: string } | null = null;
      if (createDto.empresaId) {
        empresa = await tx.empresa.findUnique({
          where: { id: createDto.empresaId },
        });
        if (!empresa) {
          throw new NotFoundException(
            `La empresa con ID ${createDto.empresaId} no existe.`,
          );
        }
      } else {
        const empresas = await tx.empresa.findMany({ take: 2 });
        if (empresas.length === 1) {
          empresa = empresas[0];
        } else if (empresas.length === 0) {
          throw new NotFoundException(
            'No existe ninguna empresa configurada en el sistema.',
          );
        } else {
          throw new BadRequestException(
            'Debe especificar empresaId para solicitar una cotización pública.',
          );
        }
      }

      let sucursalId = createDto.sucursalId;
      if (sucursalId) {
        const sucursal = await tx.sucursal.findFirst({
          where: { id: sucursalId, empresaId: empresa.id },
        });
        if (!sucursal) {
          throw new BadRequestException(
            'La sucursal especificada no existe o no pertenece a la empresa.',
          );
        }
      } else {
        const firstSucursal = await tx.sucursal.findFirst({
          where: { empresaId: empresa.id },
        });
        sucursalId = firstSucursal?.id;
      }

      let cliente = await tx.cliente.findFirst({
        where: {
          emailFacturacion: createDto.email,
          empresaId: empresa.id,
        },
      });

      if (!cliente) {
        cliente = await tx.cliente.create({
          data: {
            empresaId: empresa.id,
            nombre: createDto.atencion || 'Solicitante Público',
            emailFacturacion: createDto.email,
            telefono: createDto.telefono,
          },
        });
      }

      const calculation = await this.processAndValidateQuotationItems(
        tx,
        createDto.items || [],
        empresa.id,
        0, // Sin descuentos arbitrarios en público
        true, // isPublic = true
      );

      const numeroCotizacion = await nextQuoteNumber(tx, empresa.id);

      const cotizacion = await tx.cotizacion.create({
        data: {
          empresaId: empresa.id,
          sucursalId,
          numeroCotizacion,
          clienteId: cliente.id,
          proyecto: createDto.proyecto,
          atencion: createDto.atencion,
          telefono: createDto.telefono,
          email: createDto.email,
          validezDias: validez,
          fechaVence,
          condiciones: createDto.condiciones,
          subtotal: calculation.totals.subtotal,
          descuento: 0,
          iva: calculation.totals.iva,
          total: calculation.totals.total,
          depositoGarantia: 0,
          estado: EstadoCotizacion.PENDIENTE,
          items: {
            create: calculation.processedItems.map((item) => ({
              productoId: item.productoId,
              equipoId: item.equipoId,
              descripcion: item.descripcion,
              tipoCobro: item.tipoCobro,
              cantidad: item.cantidad,
              dias: item.dias,
              horas: item.horas,
              precioUnitario: item.precioUnitario,
              descuento: 0,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          empresa: {
            select: {
              id: true,
              nombre: true,
              rfc: true,
              telefono: true,
              email: true,
              direccion: true,
            },
          },
          cliente: {
            select: {
              id: true,
              nombre: true,
              razonSocial: true,
              rfc: true,
              direccion: true,
              telefono: true,
              emailFacturacion: true,
            },
          },
          items: {
            select: {
              id: true,
              descripcion: true,
              tipoCobro: true,
              cantidad: true,
              dias: true,
              horas: true,
              precioUnitario: true,
              descuento: true,
              subtotal: true,
              equipo: {
                select: {
                  id: true,
                  codigo: true,
                  modelo: true,
                  descripcion: true,
                  marca: {
                    select: { id: true, nombre: true },
                  },
                  categoria: {
                    select: { id: true, nombre: true },
                  },
                },
              },
              producto: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                  categoria: {
                    select: { id: true, nombre: true },
                  },
                },
              },
            },
          },
        },
      });

      await recordAuditInTx(tx, {
        empresaId: empresa.id,
        usuarioId: null,
        accion: 'COTIZACION_PUBLICA_SOLICITADA',
        entidadTipo: 'COTIZACION',
        entidadId: cotizacion.id,
        detalles: {
          numeroCotizacion: cotizacion.numeroCotizacion,
          atencion: createDto.atencion,
          email: createDto.email,
          total: cotizacion.total,
        },
      });

      return {
        numeroCotizacion: cotizacion.numeroCotizacion,
        tokenPublico: cotizacion.tokenPublico,
        fechaEmision: cotizacion.fechaEmision,
        fechaVence: cotizacion.fechaVence,
        estado: cotizacion.estado,
        proyecto: cotizacion.proyecto,
        atencion: cotizacion.atencion,
        validezDias: cotizacion.validezDias,
        condiciones: cotizacion.condiciones,
        subtotal: cotizacion.subtotal,
        descuento: cotizacion.descuento,
        iva: cotizacion.iva,
        total: cotizacion.total,
        empresa: cotizacion.empresa
          ? {
              nombre: cotizacion.empresa.nombre,
              rfc: cotizacion.empresa.rfc,
              telefono: cotizacion.empresa.telefono,
              email: cotizacion.empresa.email,
              direccion: cotizacion.empresa.direccion,
            }
          : null,
        cliente: cotizacion.cliente
          ? {
              nombre: cotizacion.cliente.nombre,
              razonSocial: cotizacion.cliente.razonSocial,
              rfc: cotizacion.cliente.rfc,
              telefono: cotizacion.cliente.telefono,
              emailFacturacion: cotizacion.cliente.emailFacturacion,
            }
          : null,
        items: Array.isArray(cotizacion.items)
          ? cotizacion.items.map((item) => ({
              descripcion: item.descripcion,
              tipoCobro: item.tipoCobro,
              cantidad: item.cantidad,
              dias: toNumberHorasOrNull(item.dias),
              horas: toNumberHorasOrNull(item.horas),
              precioUnitario: item.precioUnitario,
              descuento: item.descuento,
              subtotal: item.subtotal,
              equipo: item.equipo
                ? {
                    codigo: item.equipo.codigo,
                    modelo: item.equipo.modelo,
                    descripcion: item.equipo.descripcion,
                    marca: item.equipo.marca?.nombre,
                    categoria: item.equipo.categoria?.nombre,
                  }
                : undefined,
              producto: item.producto
                ? {
                    codigo: item.producto.codigo,
                    nombre: item.producto.nombre,
                    categoria: item.producto.categoria?.nombre,
                  }
                : undefined,
            }))
          : [],
      };
    });
  }

  async findAll(
    empresaId: string,
    user?: {
      id: string;
      roles?: Array<string | { nombre?: string; rol?: { nombre?: string } }>;
    },
    all?: boolean,
  ) {
    assertEmpresaId(empresaId);
    const whereClause: Prisma.CotizacionWhereInput = {
      OR: [{ empresaId }, { cliente: { empresaId } }],
    };

    const roles = (user?.roles || []).map((r) =>
      typeof r === 'string' ? r : r?.nombre || r?.rol?.nombre || '',
    );
    const isComercialOnly =
      roles.includes('COMERCIAL') &&
      !roles.includes('ADMIN') &&
      !roles.includes('GERENTE');

    if (isComercialOnly && !all && user?.id) {
      const advisorFilter = {
        OR: [{ asesorId: user.id }, { cliente: { vendedorId: user.id } }],
      };
      whereClause.AND = [advisorFilter];
    }

    return this.prisma.cotizacion.findMany({
      where: whereClause,
      include: {
        cliente: true,
        asesor: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
        items: {
          include: { equipo: true },
        },
        contratos: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, empresaId: string) {
    assertEmpresaId(empresaId);
    const whereClause: Prisma.CotizacionWhereInput = {
      id,
      OR: [{ empresaId }, { cliente: { empresaId } }],
    };

    const cotizacion = await this.prisma.cotizacion.findFirst({
      where: whereClause,
      include: {
        cliente: true,
        items: {
          include: { equipo: true },
        },
        contratos: true,
      },
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
    }

    return cotizacion;
  }

  async findByNumero(numeroCotizacion: string, empresaId: string) {
    assertEmpresaId(empresaId);
    const whereClause: Prisma.CotizacionWhereInput = {
      numeroCotizacion,
      OR: [{ empresaId }, { cliente: { empresaId } }],
    };

    const cotizacion = await this.prisma.cotizacion.findFirst({
      where: whereClause,
      include: {
        cliente: true,
        items: {
          include: { equipo: true },
        },
        contratos: true,
      },
    });

    if (!cotizacion) {
      throw new NotFoundException(
        `Cotización con Número ${numeroCotizacion} no encontrada`,
      );
    }

    return cotizacion;
  }

  /**
   * FLUJO PÚBLICO (sin sesión): la cotización se acota por `tokenPublico`
   * (UUID v4 no adivinable, revocable y con expiración), no por `empresaId`.
   * Por eso createPublic, findByPublicToken, acceptPublic y rejectPublic NO
   * exigen `assertEmpresaId`; todos los demás métodos autenticados sí.
   */
  async findByPublicToken(
    tokenPublico: string,
    context?: { ip?: string; userAgent?: string; requestId?: string },
  ) {
    const cotizacion = await this.prisma.cotizacion.findUnique({
      where: { tokenPublico },
      include: {
        empresa: {
          select: {
            id: true,
            nombre: true,
            rfc: true,
            telefono: true,
            email: true,
            direccion: true,
          },
        },
        cliente: {
          select: {
            id: true,
            nombre: true,
            razonSocial: true,
            rfc: true,
            direccion: true,
            telefono: true,
            emailFacturacion: true,
          },
        },
        asesor: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
        items: {
          select: {
            id: true,
            descripcion: true,
            tipoCobro: true,
            cantidad: true,
            dias: true,
            horas: true,
            precioUnitario: true,
            descuento: true,
            subtotal: true,
            equipo: {
              select: {
                id: true,
                codigo: true,
                modelo: true,
                descripcion: true,
                marca: {
                  select: { id: true, nombre: true },
                },
                categoria: {
                  select: { id: true, nombre: true },
                },
              },
            },
            producto: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                categoria: {
                  select: { id: true, nombre: true },
                },
              },
            },
          },
        },
      },
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización no encontrada o enlace inválido`);
    }

    // 1. Verificación de revocación explícita o cancelación
    if (cotizacion.tokenPublicoRevocado) {
      throw new UnauthorizedException(
        'El enlace público de esta cotización ha sido revocado',
      );
    }
    if (
      cotizacion.estado === 'CANCELADA' ||
      cotizacion.estado === 'RECHAZADA'
    ) {
      throw new UnauthorizedException(
        'El enlace público de esta cotización no está disponible',
      );
    }

    // 2. Verificación de expiración temporal por fecha de vencimiento
    const now = new Date();
    if (
      cotizacion.estado === 'VENCIDA' ||
      (cotizacion.fechaVence && now > new Date(cotizacion.fechaVence))
    ) {
      throw new UnauthorizedException(
        'El enlace público de esta cotización ha expirado',
      );
    }

    // 3. Registrar primera apertura válida (VISTA) sin degradar estados posteriores
    if (cotizacion.estado === EstadoCotizacion.ENVIADA) {
      const changed = await this.prisma.$transaction(async (tx) => {
        const result = await tx.cotizacion.updateMany({
          where: {
            id: cotizacion.id,
            estado: EstadoCotizacion.ENVIADA,
          },
          data: {
            estado: EstadoCotizacion.VISTA,
            fechaVista: now,
          },
        });
        if (result.count === 1 && cotizacion.empresaId) {
          await recordAuditInTx(tx, {
            empresaId: cotizacion.empresaId,
            accion: 'COTIZACION_VISTA',
            entidadTipo: 'COTIZACION',
            entidadId: cotizacion.id,
            detalles: {
              numeroCotizacion: cotizacion.numeroCotizacion,
              version: cotizacion.version,
            },
            ipDireccion: context?.ip || '127.0.0.1',
            userAgent: context?.userAgent || 'Public Portal',
            requestId: context?.requestId || null,
          });
        }
        return result.count === 1;
      });
      if (changed) cotizacion.estado = EstadoCotizacion.VISTA;
    }

    return {
      numeroCotizacion: cotizacion.numeroCotizacion,
      version: cotizacion.version,
      tokenPublico: cotizacion.tokenPublico,
      fechaEmision: cotizacion.fechaEmision,
      fechaVence: cotizacion.fechaVence,
      fechaInicioRenta: cotizacion.fechaInicioRenta,
      fechaFinRenta: cotizacion.fechaFinRenta,
      estado: cotizacion.estado,
      proyecto: cotizacion.proyecto,
      atencion: cotizacion.atencion,
      validezDias: cotizacion.validezDias,
      condiciones: cotizacion.condiciones,
      motivoRechazo: cotizacion.motivoRechazo,
      depositoGarantia: cotizacion.depositoGarantia,
      subtotal: cotizacion.subtotal,
      descuento: cotizacion.descuento,
      iva: cotizacion.iva,
      total: cotizacion.total,
      empresa: cotizacion.empresa
        ? {
            nombre: cotizacion.empresa.nombre,
            rfc: cotizacion.empresa.rfc,
            telefono: cotizacion.empresa.telefono,
            email: cotizacion.empresa.email,
            direccion: cotizacion.empresa.direccion,
          }
        : null,
      cliente: cotizacion.cliente
        ? {
            nombre: cotizacion.cliente.nombre,
            razonSocial: cotizacion.cliente.razonSocial,
            rfc: cotizacion.cliente.rfc,
            telefono: cotizacion.cliente.telefono,
            emailFacturacion: cotizacion.cliente.emailFacturacion,
          }
        : null,
      items: Array.isArray(cotizacion.items)
        ? cotizacion.items.map((item) => ({
            descripcion: item.descripcion,
            tipoCobro: item.tipoCobro,
            cantidad: item.cantidad,
            dias: toNumberHorasOrNull(item.dias),
            horas: toNumberHorasOrNull(item.horas),
            precioUnitario: item.precioUnitario,
            descuento: item.descuento,
            subtotal: item.subtotal,
            equipo: item.equipo
              ? {
                  codigo: item.equipo.codigo,
                  modelo: item.equipo.modelo,
                  descripcion: item.equipo.descripcion,
                  marca: item.equipo.marca?.nombre,
                  categoria: item.equipo.categoria?.nombre,
                }
              : undefined,
            producto: item.producto
              ? {
                  codigo: item.producto.codigo,
                  nombre: item.producto.nombre,
                  categoria: item.producto.categoria?.nombre,
                }
              : undefined,
          }))
        : [],
    };
  }

  async sendToClient(
    id: string,
    empresaId: string,
    usuarioId?: string,
    sendDto?: SendQuotationEmailDto,
  ) {
    if (!this.outboxService) {
      throw new BadRequestException(
        'El servicio de correo no está disponible.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "cotizaciones" WHERE id = ${id} FOR UPDATE`;
      const cotizacion = await tx.cotizacion.findFirst({
        where: { id, empresaId },
        include: { cliente: true, empresa: true },
      });
      if (!cotizacion) {
        throw new NotFoundException('Cotización no encontrada.');
      }
      const estadosNoPermitidos: EstadoCotizacion[] = [
        EstadoCotizacion.ACEPTADA,
        EstadoCotizacion.CONVERTIDA_A_CONTRATO,
        EstadoCotizacion.FACTURADA,
        EstadoCotizacion.CANCELADA,
      ];
      if (estadosNoPermitidos.includes(cotizacion.estado)) {
        throw new BadRequestException(
          `No es posible enviar una cotización que ya fue ${cotizacion.estado.toLowerCase()}. Estado actual: ${cotizacion.estado}.`,
        );
      }

      const destinatario = (
        sendDto?.emailDestino ||
        cotizacion.email ||
        cotizacion.cliente.emailFacturacion ||
        ''
      ).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) {
        throw new BadRequestException(
          'La cotización o el cliente no tienen un correo electrónico válido configurado para el envío.',
        );
      }

      const frontendUrl = (
        process.env.FRONTEND_PUBLIC_URL || 'http://localhost:5173'
      ).replace(/\/$/, '');
      const tokenPublico = cotizacion.tokenPublico || crypto.randomUUID();
      const emailParams = {
        empresaNombre:
          cotizacion.empresa?.nombre || 'BM Construcciones',
        clienteNombre: cotizacion.cliente?.nombre || 'Cliente',
        numeroCotizacion: cotizacion.numeroCotizacion,
        version: cotizacion.version,
        fechaEmision: cotizacion.fechaEmision.toISOString().split('T')[0],
        fechaVence: cotizacion.fechaVence.toISOString().split('T')[0],
        validezDias: cotizacion.validezDias,
        total: Number(cotizacion.total),
        publicUrl: `${frontendUrl}/cotizacion/${tokenPublico}`,
      };

      const notification = await this.outboxService!.enqueueNotification(
        {
          empresaId,
          clienteId: cotizacion.clienteId,
          evento: 'COTIZACION_ENVIADA',
          destino: destinatario,
          asunto: `Cotización Formal ${cotizacion.numeroCotizacion} (v${cotizacion.version}) - ${emailParams.empresaNombre}`,
          mensaje: generateQuotationEmailHtml(emailParams),
          tokenPublico,
          claveIdempotencia: `cotizacion:${cotizacion.id}:v${cotizacion.version}:${Date.now()}`,
        },
        tx,
      );
      const updated = await tx.cotizacion.update({
        where: { id: cotizacion.id },
        data: {
          tokenPublico,
          estado: EstadoCotizacion.ENVIADA,
          fechaEnvio: new Date(),
          tokenPublicoRevocado: false,
        },
      });
      await recordAuditInTx(tx, {
        empresaId,
        usuarioId: usuarioId || null,
        accion: 'COTIZACION_ENCOLADA',
        entidadTipo: 'COTIZACION',
        entidadId: cotizacion.id,
        detalles: {
          numeroCotizacion: cotizacion.numeroCotizacion,
          version: cotizacion.version,
          notificacionId: notification.id,
        },
      });
      return { updated, destinatario };
    });

    void this.outboxService.processPending().catch(() => undefined);

    const [localPart, domain] = result.destinatario.split('@');
    const destinatarioOculto = `${localPart.slice(0, 2)}***@${domain}`;

    return {
      success: true,
      message: `Cotización puesta en cola para ${destinatarioOculto}.`,
      data: result.updated,
    };
  }

  async acceptPublic(
    tokenPublico: string,
    context?: { ip?: string; userAgent?: string; requestId?: string },
  ) {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT id FROM "cotizaciones" WHERE "token_publico" = ${tokenPublico} FOR UPDATE`;

      const cotizacion = await tx.cotizacion.findUnique({
        where: { tokenPublico },
        include: {
          cliente: true,
          empresa: true,
          items: {
            include: { equipo: true, producto: true },
          },
        },
      });

      if (!cotizacion) {
        throw new NotFoundException(
          'Cotización no encontrada o enlace inválido.',
        );
      }

      if (cotizacion.tokenPublicoRevocado) {
        throw new UnauthorizedException(
          'El enlace público de esta cotización ha sido revocado.',
        );
      }

      // Idempotencia: si ya fue aceptada, retornar información existente sin duplicar contrato
      if (
        cotizacion.estado === EstadoCotizacion.ACEPTADA ||
        cotizacion.estado === EstadoCotizacion.CONVERTIDA_A_CONTRATO
      ) {
        const existingContract = await tx.contrato.findFirst({
          where: { cotizacionId: cotizacion.id },
        });

        return {
          success: true,
          message: 'La cotización ya fue aceptada previamente.',
          idempotent: true,
          data: {
            cotizacionId: cotizacion.id,
            contratoId: existingContract?.id || null,
            codigoContrato: existingContract?.codigo || null,
            estado: cotizacion.estado,
          },
          contract: existingContract
            ? {
                id: existingContract.id,
                codigo: existingContract.codigo,
                estado: existingContract.estado,
              }
            : null,
        };
      }

      if (
        cotizacion.estado !== EstadoCotizacion.ENVIADA &&
        cotizacion.estado !== EstadoCotizacion.VISTA
      ) {
        throw new BadRequestException(
          `La cotización no puede ser aceptada en su estado actual (${cotizacion.estado}).`,
        );
      }

      const now = new Date();
      if (cotizacion.fechaVence && now > new Date(cotizacion.fechaVence)) {
        throw new UnauthorizedException('La cotización ha expirado.');
      }

      // Transición a ACEPTADA
      await tx.cotizacion.update({
        where: { id: cotizacion.id },
        data: {
          estado: EstadoCotizacion.ACEPTADA,
          fechaAceptacion: now,
        },
      });

      // Creación del Contrato y Reservas
      const empId = cotizacion.empresaId;
      if (!empId) {
        throw new BadRequestException(
          'La cotización no tiene una empresa asignada.',
        );
      }
      let sucursalId = cotizacion.sucursalId;
      if (sucursalId) {
        await assertSucursalEnEmpresa(tx, sucursalId, empId);
      } else {
        const firstSuc = await tx.sucursal.findFirst({
          where: { empresaId: empId },
        });
        sucursalId = firstSuc?.id || null;
      }
      if (!sucursalId) {
        throw new BadRequestException(
          'No existe una sucursal disponible para generar el contrato.',
        );
      }

      const existingContract = await tx.contrato.findFirst({
        where: { cotizacionId: cotizacion.id },
      });
      if (existingContract) {
        return {
          success: true,
          message: 'La cotización ya tiene un contrato formalizado.',
          idempotent: true,
          data: {
            cotizacionId: cotizacion.id,
            contratoId: existingContract.id,
            codigoContrato: existingContract.codigo,
            estado: EstadoCotizacion.ACEPTADA,
          },
        };
      }

      // El UPSERT atomico de la secuencia (numbering.util) ya serializa los codigos.
      const codigoContrato = await nextContractCode(tx);

      const fechaInicio = cotizacion.fechaInicioRenta
        ? new Date(cotizacion.fechaInicioRenta)
        : new Date();
      // HORA: dias/horas son horas totales -> horas/24 (techo); tope 3650 dias.
      const maxDias = duracionContratoDias(
        cotizacion.items,
        cotizacion.validezDias,
      );
      const fechaFin = cotizacion.fechaFinRenta
        ? new Date(cotizacion.fechaFinRenta)
        : new Date(
            fechaInicio.getTime() +
              (maxDias > 0 ? maxDias : 30) * 24 * 60 * 60 * 1000,
          );

      let contractItems: Prisma.DetalleContratoCreateWithoutContratoInput[] =
        [];
      const itemsWithEquipment = (cotizacion.items || []).filter(
        (item) => item.equipoId,
      );

      if (itemsWithEquipment.length > 0) {
        contractItems = await resolveQuotationEquipment(
          tx,
          itemsWithEquipment,
          empId,
          sucursalId,
        );
      }

      const uniqueEquipoIds = [
        ...new Set(
          contractItems
            .map((item) => item.equipo?.connect?.id)
            .filter((eqId): eqId is string => Boolean(eqId)),
        ),
      ];

      const cantidadesSolicitadas = new Map<string, number>();
      let equiposById = new Map<string, Equipo>();
      if (uniqueEquipoIds.length > 0) {
        for (const eqId of uniqueEquipoIds) {
          await tx.$executeRaw`SELECT id FROM "equipos" WHERE id = ${eqId} FOR UPDATE`;
        }

        const equipos = await tx.equipo.findMany({
          where: {
            id: { in: uniqueEquipoIds },
            empresaId: empId,
          },
        });
        equiposById = new Map(equipos.map((equipo) => [equipo.id, equipo]));

        for (const cItem of contractItems) {
          const eqId = cItem.equipo?.connect?.id;
          if (!eqId) continue;
          const equipo = equiposById.get(eqId);
          if (!equipo) {
            throw new NotFoundException(`El equipo ${eqId} no fue encontrado.`);
          }
          const cantidad = Number(cItem.cantidad ?? 1);
          if (equipo.tipoControl === TipoControlEquipo.SERIALIZADO) {
            if (cantidad !== 1) {
              throw new BadRequestException(
                `El equipo serializado ${equipo.modelo} solo puede contratarse en cantidad 1.`,
              );
            }
            if (
              equipo.cantidadDisponible < 1 ||
              equipo.estado !== EstadoEquipo.DISPONIBLE
            ) {
              throw new BadRequestException(
                `El equipo serializado ${equipo.modelo} (serie: ${equipo.numeroSerie || 'S/N'}) no está disponible.`,
              );
            }
          }
          const solicitada = (cantidadesSolicitadas.get(eqId) ?? 0) + cantidad;
          if (equipo.cantidadDisponible < solicitada) {
            throw new BadRequestException(
              `Stock insuficiente para ${equipo.descripcion || equipo.modelo}. Disponible: ${equipo.cantidadDisponible}`,
            );
          }
          cantidadesSolicitadas.set(eqId, solicitada);
        }
      }

      const contratoCreado = await tx.contrato.create({
        data: {
          sucursalId,
          clienteId: cotizacion.clienteId,
          cotizacionId: cotizacion.id,
          codigo: codigoContrato,
          fechaInicio,
          fechaFin,
          estado: EstadoContrato.SIN_ABRIR,
          depositoGarantia: cotizacion.depositoGarantia ?? 0.0,
          condiciones:
            cotizacion.condiciones ||
            'Contrato generado por aceptación de cotización.',
          items: {
            create: contractItems,
          },
        },
        include: {
          items: true,
        },
      });

      // Crear reservas e impactar stock
      for (const [equipoId, cantidad] of cantidadesSolicitadas.entries()) {
        const equipo = equiposById.get(equipoId)!;
        await tx.reserva.create({
          data: {
            contratoId: contratoCreado.id,
            equipoId,
            fechaInicio,
            fechaFin,
            estado: EstadoReserva.CONFIRMADA,
          },
        });
        await tx.equipo.update({
          where: { id: equipoId },
          data:
            equipo.tipoControl === TipoControlEquipo.SERIALIZADO
              ? { estado: EstadoEquipo.RESERVADO, cantidadDisponible: 0 }
              : { cantidadDisponible: equipo.cantidadDisponible - cantidad },
        });
      }

      // Registro forense en auditoría
      if (empId) {
        await tx.auditoria.create({
          data: {
            empresaId: empId,
            accion: 'COTIZACION_ACEPTADA',
            entidadTipo: 'COTIZACION',
            entidadId: cotizacion.id,
            detalles: JSON.stringify({
              numeroCotizacion: cotizacion.numeroCotizacion,
              version: cotizacion.version,
              contratoId: contratoCreado?.id,
              codigoContrato: contratoCreado.codigo,
            }),
            ipDireccion: context?.ip || '127.0.0.1',
            userAgent: context?.userAgent || 'Public Portal',
            requestId: context?.requestId || null,
          },
        });
      }

      return {
        success: true,
        message: 'Cotización aceptada con éxito y contrato generado.',
        data: {
          cotizacionId: cotizacion.id,
          contratoId: contratoCreado.id,
          codigoContrato: contratoCreado.codigo,
          estado: EstadoCotizacion.ACEPTADA,
        },
        contract: {
          id: contratoCreado.id,
          codigo: contratoCreado.codigo,
          estado: contratoCreado.estado,
        },
      };
    });
  }

  async rejectPublic(
    tokenPublico: string,
    motivo: string,
    context?: { ip?: string; userAgent?: string; requestId?: string },
  ) {
    if (!motivo || typeof motivo !== 'string' || motivo.trim().length < 5) {
      throw new BadRequestException(
        'El motivo de rechazo es obligatorio y debe tener al menos 5 caracteres.',
      );
    }
    const cleanMotivo = motivo.trim();

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$executeRaw`SELECT id FROM "cotizaciones" WHERE "token_publico" = ${tokenPublico} FOR UPDATE`;

      const cotizacion = await tx.cotizacion.findUnique({
        where: { tokenPublico },
        include: {
          items: true,
          cliente: true,
        },
      });

      if (!cotizacion) {
        throw new NotFoundException(
          'Cotización no encontrada o enlace inválido.',
        );
      }

      // Idempotencia: si ya está rechazada, devolver la siguiente versión existente
      if (cotizacion.estado === EstadoCotizacion.RECHAZADA) {
        const nextVer = await tx.cotizacion.findFirst({
          where: {
            empresaId: cotizacion.empresaId,
            numeroCotizacion: cotizacion.numeroCotizacion,
            version: cotizacion.version + 1,
          },
        });
        return {
          success: true,
          message: 'La cotización ya fue rechazada previamente.',
          idempotent: true,
          data: {
            cotizacionId: cotizacion.id,
            nuevaVersionId: nextVer?.id || null,
            nuevaVersion: cotizacion.version + 1,
          },
          nextVersion: nextVer
            ? { id: nextVer.id, version: nextVer.version }
            : null,
        };
      }

      if (cotizacion.tokenPublicoRevocado) {
        throw new UnauthorizedException(
          'El enlace público de esta cotización ha sido revocado.',
        );
      }
      if (new Date() > new Date(cotizacion.fechaVence)) {
        throw new UnauthorizedException('La cotización ha expirado.');
      }

      if (
        cotizacion.estado !== EstadoCotizacion.ENVIADA &&
        cotizacion.estado !== EstadoCotizacion.VISTA
      ) {
        throw new BadRequestException(
          `La cotización no puede ser rechazada en su estado actual (${cotizacion.estado}).`,
        );
      }

      // 1. Marcar la versión actual como RECHAZADA, revocar token y registrar motivo
      await tx.cotizacion.update({
        where: { id: cotizacion.id },
        data: {
          estado: EstadoCotizacion.RECHAZADA,
          motivoRechazo: cleanMotivo,
          tokenPublicoRevocado: true,
        },
      });

      // 2. Crear versión + 1 en estado PENDIENTE editable para "Devueltas"
      const nextVersionNumber = cotizacion.version + 1;
      const nuevaVersion = await tx.cotizacion.create({
        data: {
          empresaId: cotizacion.empresaId,
          sucursalId: cotizacion.sucursalId,
          numeroCotizacion: cotizacion.numeroCotizacion,
          version: nextVersionNumber,
          clienteId: cotizacion.clienteId,
          proyecto: cotizacion.proyecto,
          atencion: cotizacion.atencion,
          telefono: cotizacion.telefono,
          email: cotizacion.email,
          referencia: cotizacion.referencia,
          asesorId: cotizacion.asesorId,
          estado: EstadoCotizacion.PENDIENTE,
          fechaEmision: new Date(),
          fechaVence: new Date(
            Date.now() + (cotizacion.validezDias || 15) * 24 * 60 * 60 * 1000,
          ),
          validezDias: cotizacion.validezDias || 15,
          fechaInicioRenta: cotizacion.fechaInicioRenta,
          fechaFinRenta: cotizacion.fechaFinRenta,
          subtotal: cotizacion.subtotal,
          descuento: cotizacion.descuento,
          iva: cotizacion.iva,
          total: cotizacion.total,
          depositoGarantia: cotizacion.depositoGarantia,
          condiciones: cotizacion.condiciones,
          notasRevision: `Versión derivada del rechazo de v${cotizacion.version}: ${cleanMotivo}`,
          motivoRechazo: cleanMotivo,
          tokenPublico: randomUUID(),
          tokenPublicoRevocado: false,
          items: {
            create: (cotizacion.items || []).map((it) => ({
              productoId: it.productoId,
              equipoId: it.equipoId,
              descripcion: it.descripcion,
              tipoCobro: it.tipoCobro,
              cantidad: it.cantidad,
              dias: it.dias,
              horas: it.horas,
              precioUnitario: it.precioUnitario,
              descuento: it.descuento,
              subtotal: it.subtotal,
            })),
          },
        },
      });

      // 3. Auditoría forense dentro de la misma transacción
      if (cotizacion.empresaId) {
        await tx.auditoria.create({
          data: {
            empresaId: cotizacion.empresaId,
            accion: 'COTIZACION_RECHAZADA',
            entidadTipo: 'COTIZACION',
            entidadId: cotizacion.id,
            detalles: JSON.stringify({
              numeroCotizacion: cotizacion.numeroCotizacion,
              versionRechazada: cotizacion.version,
              nuevaVersion: nextVersionNumber,
              motivo: cleanMotivo,
            }),
            ipDireccion: context?.ip || '127.0.0.1',
            userAgent: context?.userAgent || 'Public Portal',
            requestId: context?.requestId || null,
          },
        });
      }

      return {
        success: true,
        message: `Cotización rechazada. Se ha generado la versión ${nextVersionNumber} para revisión y ajustes.`,
        data: {
          cotizacionId: cotizacion.id,
          nuevaVersionId: nuevaVersion.id,
          nuevaVersion: nextVersionNumber,
        },
        nextVersion: { id: nuevaVersion.id, version: nuevaVersion.version },
      };
    });
  }

  async revokePublicToken(id: string, empresaId: string, usuarioId?: string) {
    const cotizacion = await this.prisma.cotizacion.findFirst({
      where: { id, empresaId },
    });
    if (!cotizacion) {
      throw new NotFoundException(`Cotización con ID: ${id} no encontrada`);
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.cotizacion.update({
        where: { id },
        data: { tokenPublicoRevocado: true },
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId: usuarioId || null,
        accion: 'COTIZACION_TOKEN_PUBLICO_REVOCADO',
        entidadTipo: 'COTIZACION',
        entidadId: id,
        detalles: {
          numeroCotizacion: cotizacion.numeroCotizacion,
          tokenPublicoRevocado: true,
        },
      });
    });

    return {
      success: true,
      message: 'Enlace público revocado con éxito',
    };
  }

  async rotatePublicToken(id: string, empresaId: string, usuarioId?: string) {
    const cotizacion = await this.prisma.cotizacion.findFirst({
      where: { id, empresaId },
    });
    if (!cotizacion) {
      throw new NotFoundException(`Cotización con ID: ${id} no encontrada`);
    }

    const nuevoToken = crypto.randomUUID();
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.cotizacion.update({
        where: { id },
        data: {
          tokenPublico: nuevoToken,
          tokenPublicoRevocado: false,
        },
      });

      await recordAuditInTx(tx, {
        empresaId,
        usuarioId: usuarioId || null,
        accion: 'COTIZACION_TOKEN_PUBLICO_ROTADO',
        entidadTipo: 'COTIZACION',
        entidadId: id,
        detalles: {
          numeroCotizacion: cotizacion.numeroCotizacion,
          tokenRotado: true,
        },
      });
    });

    return {
      success: true,
      message: 'Enlace público rotado con éxito',
      tokenPublico: nuevoToken,
    };
  }

  async update(
    id: string,
    updateDto: UpdateQuotationDto,
    empresaId: string,
    usuarioId?: string,
  ) {
    if (
      updateDto.estado === EstadoCotizacion.ACEPTADA ||
      updateDto.estado === EstadoCotizacion.CONVERTIDA_A_CONTRATO
    ) {
      throw new BadRequestException(
        'La aceptación y conversión a contrato solo pueden realizarse mediante el flujo público de consentimiento del cliente.',
      );
    }
    const existing = await this.findOne(id, empresaId);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Bloqueo pesimista de fila en PostgreSQL para evitar aprobaciones simultáneas
      await tx.$executeRaw`SELECT id FROM "cotizaciones" WHERE id = ${id} FOR UPDATE`;

      const current = await tx.cotizacion.findUnique({
        where: { id },
        include: { contratos: true, items: true },
      });

      if (!current) {
        throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
      }

      this.validateRentalPeriod(
        updateDto.fechaInicioRenta !== undefined ? updateDto.fechaInicioRenta : current.fechaInicioRenta,
        updateDto.fechaFinRenta !== undefined ? updateDto.fechaFinRenta : current.fechaFinRenta,
      );

      const targetClienteId = updateDto.clienteId || existing.clienteId;
      const targetCliente = await tx.cliente.findFirst({
        where: { id: targetClienteId, empresaId },
        select: { id: true, vendedorId: true, vendedor: true },
      });
      if (!targetCliente) {
        throw new NotFoundException(
          'El cliente no existe o no pertenece a tu empresa',
        );
      }

      let itemUpdateData:
        | Prisma.DetalleCotizacionUpdateManyWithoutCotizacionNestedInput
        | undefined = undefined;
      let subtotal: number = Number(current.subtotal);
      let descuento: number =
        updateDto.descuento !== undefined
          ? assertNonNegative(updateDto.descuento, 'descuento')
          : Number(current.descuento || 0);
      let iva: number = Number(current.iva);
      let total: number = Number(current.total);

      if (updateDto.items) {
        await tx.detalleCotizacion.deleteMany({
          where: { cotizacionId: id },
        });

        const calculation = await this.processAndValidateQuotationItems(
          tx,
          updateDto.items,
          empresaId,
          descuento,
          false,
        );
        subtotal = calculation.totals.subtotal;
        descuento = calculation.totals.descuento;
        iva = calculation.totals.iva;
        total = calculation.totals.total;

        itemUpdateData = {
          create: calculation.processedItems.map((item) => ({
            equipoId: item.equipoId ? item.equipoId : undefined,
            productoId: item.productoId ? item.productoId : undefined,
            descripcion: item.descripcion,
            tipoCobro: item.tipoCobro,
            cantidad: item.cantidad,
            dias: item.dias,
            horas: item.horas,
            precioUnitario: item.precioUnitario,
            descuento: item.descuento,
            subtotal: item.subtotal,
          })),
        };
      } else if (updateDto.descuento !== undefined) {
        const calcTotals = calculateTotals(
          (current.items || []).map((it) => ({
            ...it,
            subtotal: Number(it.subtotal),
          })),
          descuento,
          DEFAULT_IVA_RATE,
        );
        subtotal = calcTotals.subtotal;
        descuento = calcTotals.descuento;
        iva = calcTotals.iva;
        total = calcTotals.total;
      }

      const effectiveAsesorId = await this.resolveAsesorId(
        tx,
        targetCliente,
        empresaId,
        updateDto.asesorId,
        usuarioId,
        existing.asesorId,
      );

      const cotizacion = await tx.cotizacion.update({
        where: { id: existing.id },
        data: {
          estado: updateDto.estado,
          clienteId: updateDto.clienteId,
          proyecto: updateDto.proyecto,
          atencion: updateDto.atencion,
          telefono: updateDto.telefono,
          email: updateDto.email,
          referencia: updateDto.referencia,
          asesorId: effectiveAsesorId,
          validezDias: updateDto.validezDias,
          fechaInicioRenta:
            updateDto.fechaInicioRenta !== undefined
              ? updateDto.fechaInicioRenta
                ? new Date(updateDto.fechaInicioRenta)
                : null
              : current.fechaInicioRenta,
          fechaFinRenta:
            updateDto.fechaFinRenta !== undefined
              ? updateDto.fechaFinRenta
                ? new Date(updateDto.fechaFinRenta)
                : null
              : current.fechaFinRenta,
          condiciones: updateDto.condiciones,
          notasRevision: updateDto.notasRevision,
          subtotal,
          descuento,
          iva,
          total,
          depositoGarantia:
            updateDto.depositoGarantia !== undefined
              ? assertNonNegative(
                  updateDto.depositoGarantia,
                  'depositoGarantia',
                )
              : current.depositoGarantia,
          items: itemUpdateData,
        },
        include: {
          items: {
            include: { equipo: true },
          },
          cliente: true,
        },
      });

      // Auto-generación de Contrato y Solicitud de Despacho si la cotización pasa a ACEPTADA
      if (updateDto.estado === EstadoCotizacion.ACEPTADA) {
        const existingContract = tx.contrato?.findFirst
          ? await tx.contrato.findFirst({
              where: { cotizacionId: cotizacion.id },
            })
          : null;

        if (!existingContract && tx.contrato?.create) {
          // Falla cerrado: nunca se omite el filtro por empresa.
          const empId = assertEmpresaId(
            cotizacion.empresaId || empresaId || existing.empresaId,
          );
          // La sucursal debe existir y ser de la empresa: nunca se inventa un id
          // (un id inventado rompia la FK de contratos en runtime y daba un 500).
          const sucursalId = await resolveSucursalIdEnEmpresa(
            tx,
            cotizacion.sucursalId || existing.sucursalId,
            empId,
          );

          const codigoContrato = await nextContractCode(tx);

          const fechaInicio = cotizacion.fechaInicioRenta
            ? new Date(cotizacion.fechaInicioRenta)
            : new Date();
          const maxDias = duracionContratoDias(
            cotizacion.items,
            cotizacion.validezDias,
          );
          const fechaFin = cotizacion.fechaFinRenta
            ? new Date(cotizacion.fechaFinRenta)
            : new Date(
                fechaInicio.getTime() +
                  (maxDias > 0 ? maxDias : 30) * 24 * 60 * 60 * 1000,
              );
          const depositoGarantia =
            cotizacion.depositoGarantia ?? existing.depositoGarantia ?? 0.0;
          const condiciones =
            cotizacion.condiciones ||
            existing.condiciones ||
            'Contrato estándar de arrendamiento de equipos.';

          let contractItems: Prisma.DetalleContratoCreateWithoutContratoInput[] =
            [];
          const itemsWithEquipment = (cotizacion.items || []).filter(
            (item) => item.equipoId,
          );
          if (itemsWithEquipment.length > 0 && tx.equipo) {
            contractItems = await resolveQuotationEquipment(
              tx,
              itemsWithEquipment,
              empId,
              sucursalId,
            );
          }

          const uniqueEquipoIds = [
            ...new Set(
              contractItems
                .map((item) => item.equipo?.connect?.id)
                .filter((eqId): eqId is string => Boolean(eqId)),
            ),
          ];
          const cantidadesSolicitadas = new Map<string, number>();
          let equiposById = new Map<string, Equipo>();

          if (uniqueEquipoIds.length > 0 && tx.equipo) {
            for (const eqId of uniqueEquipoIds) {
              await tx.$executeRaw`SELECT id FROM "equipos" WHERE id = ${eqId} FOR UPDATE`;
            }

            const equipos = await tx.equipo.findMany({
              where: {
                id: { in: uniqueEquipoIds },
                empresaId: empId,
              },
            });
            equiposById = new Map(equipos.map((eq) => [eq.id, eq]));

            for (const cItem of contractItems) {
              const equipoId = (cItem.equipo as { connect?: { id?: string } })
                ?.connect?.id;
              if (!equipoId) continue;
              const equipo = equiposById.get(equipoId);
              if (!equipo) {
                throw new NotFoundException(
                  `El equipo ${equipoId} no fue encontrado.`,
                );
              }
              const cantidad = Number(cItem.cantidad ?? 1);
              if (equipo.tipoControl === TipoControlEquipo.SERIALIZADO) {
                if (cantidad !== 1) {
                  throw new BadRequestException(
                    `El equipo serializado ${equipo.modelo} solo puede contratarse en cantidad 1.`,
                  );
                }
                if (
                  equipo.cantidadDisponible < 1 ||
                  equipo.estado !== EstadoEquipo.DISPONIBLE
                ) {
                  throw new BadRequestException(
                    `El equipo serializado ${equipo.modelo} (serie: ${equipo.numeroSerie || 'S/N'}) no está disponible.`,
                  );
                }
              }

              const cantidadSolicitada =
                (cantidadesSolicitadas.get(equipoId) ?? 0) + cantidad;
              if (equipo.cantidadDisponible < cantidadSolicitada) {
                throw new BadRequestException(
                  `Stock insuficiente para el equipo ${equipo.descripcion || equipo.modelo}. Disponible: ${equipo.cantidadDisponible}`,
                );
              }
              cantidadesSolicitadas.set(equipoId, cantidadSolicitada);
            }
          }

          const contrato = await tx.contrato.create({
            data: {
              codigo: codigoContrato,
              sucursalId,
              clienteId: cotizacion.clienteId,
              cotizacionId: cotizacion.id,
              fechaInicio,
              fechaFin,
              depositoGarantia,
              condiciones,
              estado: 'ACTIVO',
              items:
                contractItems.length > 0
                  ? {
                      create: contractItems,
                    }
                  : undefined,
            },
          });

          // Reservar inventario y registrar en Reserva
          if (contractItems.length > 0 && tx.reserva?.create) {
            for (const [
              equipoId,
              cantReservada,
            ] of cantidadesSolicitadas.entries()) {
              const equipo = equiposById.get(equipoId);
              if (equipo && tx.equipo?.update) {
                if (equipo.tipoControl === TipoControlEquipo.SERIALIZADO) {
                  await tx.equipo.update({
                    where: { id: equipoId },
                    data: {
                      cantidadDisponible: 0,
                      estado: EstadoEquipo.RESERVADO,
                    },
                  });
                } else {
                  await tx.equipo.update({
                    where: { id: equipoId },
                    data: {
                      cantidadDisponible: Math.max(
                        0,
                        equipo.cantidadDisponible - cantReservada,
                      ),
                    },
                  });
                }
              }

              await tx.reserva.create({
                data: {
                  contratoId: contrato.id,
                  equipoId,
                  fechaInicio: contrato.fechaInicio,
                  fechaFin: contrato.fechaFin,
                  estado: EstadoReserva.CONFIRMADA,
                },
              });
            }
          }

          // Generar cortes de facturación proyectados
          if (tx.corteFacturacion?.create) {
            const diffMs = fechaFin.getTime() - fechaInicio.getTime();
            const diffDias = Math.max(
              1,
              Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
            );
            const periodoDias = 30;
            const cantidadCortes = Math.max(
              1,
              Math.ceil(diffDias / periodoDias),
            );
            const montoPorCorte =
              Math.round(
                ((Number(cotizacion.total) || 0) / cantidadCortes) * 100,
              ) / 100;
            let inicioPeriodo = new Date(fechaInicio);

            for (let i = 1; i <= cantidadCortes; i++) {
              const finPeriodo = new Date(
                inicioPeriodo.getTime() + periodoDias * 24 * 60 * 60 * 1000,
              );
              const fechaFinReal =
                finPeriodo > fechaFin ? fechaFin : finPeriodo;
              await tx.corteFacturacion.create({
                data: {
                  contratoId: contrato.id,
                  numeroCorte: i,
                  fechaInicio: inicioPeriodo,
                  fechaFin: fechaFinReal,
                  monto: montoPorCorte,
                  estado: EstadoCorteFacturacion.PENDIENTE,
                },
              });
              inicioPeriodo = new Date(
                fechaFinReal.getTime() + 24 * 60 * 60 * 1000,
              );
            }
          }

          // Generar automáticamente Solicitud de Despacho en Módulo de Operaciones
          if (tx.solicitudDespacho?.create) {
            const countDesp = tx.solicitudDespacho.count
              ? await tx.solicitudDespacho.count(
                  { where: { empresaId: empId } },
                )
              : 0;
            const codigoDesp = `SOL-DESP-${(countDesp + 1).toString().padStart(4, '0')}`;
            await tx.solicitudDespacho.create({
              data: {
                codigo: codigoDesp,
                empresaId: empId,
                sucursalId: contrato.sucursalId,
                contratoId: contrato.id,
                solicitadoPor: 'Sistema (Cotización Aprobada)',
                fechaProgramada: contrato.fechaInicio,
                direccionEntrega:
                  cotizacion.cliente?.direccion ||
                  'Dirección Registrada del Cliente',
                comentarios: `Despacho de equipos programado automáticamente desde cotización aprobada ${cotizacion.numeroCotizacion || cotizacion.id}`,
                estado: 'PENDIENTE',
              },
            });
          }
        }
      }

      if (cotizacion) {
        const accion = updateDto.estado
          ? `COTIZACION_ESTADO_${updateDto.estado}`
          : 'COTIZACION_ACTUALIZADA';
        await recordAuditInTx(tx, {
          empresaId: cotizacion.empresaId || empresaId,
          usuarioId: usuarioId || null,
          accion,
          entidadTipo: 'COTIZACION',
          entidadId: cotizacion.id,
          detalles: {
            numeroCotizacion: cotizacion.numeroCotizacion,
            estadoAnterior: current.estado,
            nuevoEstado: updateDto.estado || current.estado,
            total: cotizacion.total,
          },
        });
      }

      return cotizacion;
    });
  }

  async createNewVersion(id: string, empresaId: string) {
    const existing = await this.findOne(id, empresaId);
    const validez = existing.validezDias || 15;
    const fechaVence = new Date();
    fechaVence.setDate(fechaVence.getDate() + validez);

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const newVersion = await tx.cotizacion.create({
        data: {
          empresaId: existing.empresaId || empresaId,
          sucursalId: existing.sucursalId,
          numeroCotizacion: existing.numeroCotizacion,
          version: existing.version + 1,
          clienteId: existing.clienteId,
          proyecto: existing.proyecto,
          atencion: existing.atencion,
          telefono: existing.telefono,
          email: existing.email,
          referencia: existing.referencia,
          asesorId: existing.asesorId,
          validezDias: validez,
          fechaVence,
          fechaInicioRenta: existing.fechaInicioRenta,
          fechaFinRenta: existing.fechaFinRenta,
          condiciones: existing.condiciones,
          notasRevision: null,
          subtotal: existing.subtotal,
          descuento: existing.descuento,
          iva: existing.iva,
          total: existing.total,
          depositoGarantia: existing.depositoGarantia,
          estado: EstadoCotizacion.EN_REVISION,
          items: {
            create: existing.items.map((item) => ({
              equipoId: item.equipoId ? item.equipoId : undefined,
              productoId: item.productoId ? item.productoId : undefined,
              descripcion: item.descripcion,
              // Sin tipoCobro/horas una linea por hora volvia a POR_DIA al versionar
              // (default del schema) y, al aceptar, se facturaba como dias.
              tipoCobro: item.tipoCobro,
              cantidad: item.cantidad,
              dias: item.dias,
              horas: item.horas,
              precioUnitario: item.precioUnitario,
              descuento: item.descuento,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          items: {
            include: { equipo: true },
          },
          cliente: true,
        },
      });

      await tx.cotizacion.update({
        where: { id: existing.id },
        data: { estado: EstadoCotizacion.CANCELADA },
      });

      await recordAuditInTx(tx, {
        // Falla cerrado: nunca se audita con empresa vacia.
        empresaId: assertEmpresaId(
          newVersion.empresaId || existing.empresaId || empresaId,
        ),
        usuarioId: null,
        accion: 'COTIZACION_NUEVA_VERSION_CREADA',
        entidadTipo: 'COTIZACION',
        entidadId: newVersion.id,
        detalles: {
          numeroCotizacion: newVersion.numeroCotizacion,
          version: newVersion.version,
          versionAnteriorId: existing.id,
        },
      });

      return newVersion;
    });
  }

  async findVersionsByNumber(numeroCotizacion: string, empresaId: string) {
    assertEmpresaId(empresaId);
    const whereClause: Prisma.CotizacionWhereInput = {
      numeroCotizacion,
      OR: [{ empresaId }, { cliente: { empresaId } }],
    };

    return this.prisma.cotizacion.findMany({
      where: whereClause,
      include: {
        cliente: true,
        asesor: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
        items: {
          include: { equipo: true },
        },
      },
      orderBy: { version: 'desc' },
    });
  }

  async getSalesRanking(empresaId: string) {
    const comercialUsers = await this.prisma.usuario.findMany({
      where: {
        empresaId,
        roles: {
          some: {
            rol: { nombre: { in: ['COMERCIAL', 'GERENTE'] } },
          },
        },
      },
      select: { id: true, nombre: true, apellido: true, email: true },
    });

    const cotizaciones = await this.prisma.cotizacion.findMany({
      where: {
        OR: [{ empresaId }, { cliente: { empresaId } }],
      },
      include: {
        cliente: true,
        asesor: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
        contratos: true,
      },
    });

    const statsByAdvisor = new Map<string, AdvisorStats>();

    for (const u of comercialUsers) {
      statsByAdvisor.set(u.id, {
        asesorId: u.id,
        nombre: `${u.nombre} ${u.apellido}`.trim(),
        email: u.email,
        totalCotizaciones: 0,
        cotizacionesAprobadas: 0,
        cotizacionesPendientes: 0,
        cotizacionesRechazadas: 0,
        montoTotalCotizado: 0,
        montoTotalVendido: 0,
        ticketPromedio: 0,
        tasaConversion: 0,
        contratosGenerados: 0,
      });
    }

    for (const q of cotizaciones) {
      let asesorId = q.asesorId || q.cliente?.vendedorId;
      if (!asesorId && q.asesor?.id) asesorId = q.asesor.id;

      if (!asesorId) {
        asesorId = 'sin-asignar';
      }

      if (!statsByAdvisor.has(asesorId)) {
        const nombre = q.asesor
          ? `${q.asesor.nombre} ${q.asesor.apellido}`.trim()
          : q.cliente?.vendedor || 'Sin Asesor Asignado';
        statsByAdvisor.set(asesorId, {
          asesorId,
          nombre,
          email: q.asesor?.email || 'N/A',
          totalCotizaciones: 0,
          cotizacionesAprobadas: 0,
          cotizacionesPendientes: 0,
          cotizacionesRechazadas: 0,
          montoTotalCotizado: 0,
          montoTotalVendido: 0,
          ticketPromedio: 0,
          tasaConversion: 0,
          contratosGenerados: 0,
        });
      }

      const st = statsByAdvisor.get(asesorId)!;
      st.totalCotizaciones += 1;
      st.montoTotalCotizado += Number(q.total || 0);

      const isWon =
        q.estado === EstadoCotizacion.ACEPTADA ||
        q.estado === EstadoCotizacion.CONVERTIDA_A_CONTRATO ||
        q.estado === EstadoCotizacion.FACTURADA;
      const isPending =
        q.estado === EstadoCotizacion.PENDIENTE ||
        q.estado === EstadoCotizacion.BORRADOR ||
        q.estado === EstadoCotizacion.EN_REVISION ||
        q.estado === EstadoCotizacion.ENVIADA ||
        q.estado === EstadoCotizacion.VISTA;
      const isLost =
        q.estado === EstadoCotizacion.RECHAZADA ||
        q.estado === EstadoCotizacion.CANCELADA ||
        q.estado === EstadoCotizacion.VENCIDA;

      if (isWon) {
        st.cotizacionesAprobadas += 1;
        st.montoTotalVendido += Number(q.total || 0);
        st.contratosGenerados += q.contratos?.length || 0;
      } else if (isPending) {
        st.cotizacionesPendientes += 1;
      } else if (isLost) {
        st.cotizacionesRechazadas += 1;
      }
    }

    const ranking = Array.from(statsByAdvisor.values()).map((advisor) => {
      const conversion =
        advisor.totalCotizaciones > 0
          ? Math.round(
              (advisor.cotizacionesAprobadas / advisor.totalCotizaciones) *
                1000,
            ) / 10
          : 0;
      const ticket =
        advisor.cotizacionesAprobadas > 0
          ? Math.round(
              (advisor.montoTotalVendido / advisor.cotizacionesAprobadas) * 100,
            ) / 100
          : 0;

      return {
        ...advisor,
        montoTotalCotizado: Math.round(advisor.montoTotalCotizado * 100) / 100,
        montoTotalVendido: Math.round(advisor.montoTotalVendido * 100) / 100,
        tasaConversion: conversion,
        ticketPromedio: ticket,
      };
    });

    ranking.sort((a, b) => {
      if (b.montoTotalVendido !== a.montoTotalVendido) {
        return b.montoTotalVendido - a.montoTotalVendido;
      }
      return b.cotizacionesAprobadas - a.cotizacionesAprobadas;
    });

    const rankedWithPosition = ranking.map((item, idx) => ({
      ...item,
      posicion: idx + 1,
    }));

    const globalTotals = {
      totalCotizaciones: cotizaciones.length,
      totalAprobadas: rankedWithPosition.reduce(
        (sum, a) => sum + a.cotizacionesAprobadas,
        0,
      ),
      totalPendientes: rankedWithPosition.reduce(
        (sum, a) => sum + a.cotizacionesPendientes,
        0,
      ),
      montoGlobalCotizado:
        Math.round(
          rankedWithPosition.reduce((sum, a) => sum + a.montoTotalCotizado, 0) *
            100,
        ) / 100,
      montoGlobalVendido:
        Math.round(
          rankedWithPosition.reduce((sum, a) => sum + a.montoTotalVendido, 0) *
            100,
        ) / 100,
      tasaConversionPromedio:
        cotizaciones.length > 0
          ? Math.round(
              (rankedWithPosition.reduce(
                (sum, a) => sum + a.cotizacionesAprobadas,
                0,
              ) /
                cotizaciones.length) *
                1000,
            ) / 10
          : 0,
    };

    return {
      ranking: rankedWithPosition,
      globalTotals,
    };
  }

  async seedSalesTestData(empresaId: string) {
    const sucursal = await this.prisma.sucursal.findFirst({
      where: { empresaId },
    });
    const sucursalId = sucursal?.id;

    const clientes = await this.prisma.cliente.findMany({
      where: { empresaId },
      take: 20,
    });

    if (clientes.length === 0) {
      throw new BadRequestException(
        'No hay clientes registrados en la empresa',
      );
    }

    const equipos = await this.prisma.equipo.findMany({
      where: { empresaId },
      take: 25,
    });

    if (equipos.length === 0) {
      throw new BadRequestException(
        'No hay equipos registrados en el inventario',
      );
    }

    const asesores = await this.prisma.usuario.findMany({
      where: {
        empresaId,
        roles: { some: { rol: { nombre: { in: ['COMERCIAL', 'GERENTE'] } } } },
      },
    });

    if (asesores.length === 0) {
      throw new BadRequestException('No hay usuarios con rol comercial');
    }

    const scenarios = [
      { aprobadas: 3, pendientes: 1, enRevision: 1 },
      { aprobadas: 2, pendientes: 2, enRevision: 1 },
      { aprobadas: 2, pendientes: 1, enRevision: 0 },
      { aprobadas: 1, pendientes: 2, enRevision: 1 },
      { aprobadas: 1, pendientes: 1, enRevision: 0 },
    ];

    let createdQuotesCount = 0;
    let createdContractsCount = 0;

    for (let aIdx = 0; aIdx < asesores.length; aIdx++) {
      const asesor = asesores[aIdx];
      const scenario = scenarios[aIdx % scenarios.length];

      for (let i = 0; i < scenario.aprobadas; i++) {
        try {
          const cliente = clientes[(aIdx * 4 + i) % clientes.length];
          const eq1 = equipos[(aIdx * 3 + i) % equipos.length];
          const dias = 15 + i * 7;
          const precio1 = eq1.precioRentaDia
            ? Number(eq1.precioRentaDia)
            : 1500;
          const subtotal = precio1 * dias;
          const iva = subtotal * 0.15;
          const total = subtotal + iva;

          const cot = await this.create(
            {
              clienteId: cliente.id,
              asesorId: asesor.id,
              proyecto: `Construcción y Movimiento ${cliente.nombre.substring(0, 15)}`,
              validezDias: 30,
              condiciones:
                'Pago contra entrega de equipo. Depósito de garantía en custodia.',
              subtotal,
              iva,
              total,
              depositoGarantia: 5000,
              items: [
                {
                  equipoId: eq1.id,
                  descripcion: `${eq1.descripcion || eq1.modelo} (${dias} días)`,
                  cantidad: 1,
                  dias,
                  precioUnitario: precio1,
                  subtotal,
                  tipoCobro: TipoCobro.POR_DIA,
                },
              ],
            },
            empresaId,
            sucursalId,
            asesor.id,
          );

          createdQuotesCount++;

          await this.update(
            cot.id,
            { estado: EstadoCotizacion.ACEPTADA },
            empresaId,
            asesor.id,
          );
          createdContractsCount++;
        } catch {
          // Ignorar fallo de concurrencia o duplicidad en seed
        }
      }

      for (let i = 0; i < scenario.pendientes; i++) {
        try {
          const cliente =
            clientes[(aIdx * 4 + scenario.aprobadas + i) % clientes.length];
          const eq = equipos[(aIdx * 2 + i) % equipos.length];
          const dias = 10 + i * 5;
          const precio = eq.precioRentaDia ? Number(eq.precioRentaDia) : 1200;
          const subtotal = precio * dias;
          const iva = subtotal * 0.15;
          const total = subtotal + iva;

          await this.create(
            {
              clienteId: cliente.id,
              asesorId: asesor.id,
              proyecto: `Alquiler Maquinaria Fase ${i + 1}`,
              validezDias: 15,
              subtotal,
              iva,
              total,
              items: [
                {
                  equipoId: eq.id,
                  descripcion: `${eq.descripcion || eq.modelo} (${dias} días)`,
                  cantidad: 1,
                  dias,
                  precioUnitario: precio,
                  subtotal,
                  tipoCobro: TipoCobro.POR_DIA,
                },
              ],
            },
            empresaId,
            sucursalId,
            asesor.id,
          );

          createdQuotesCount++;
        } catch {
          // Ignorar fallo de concurrencia o duplicidad en seed
        }
      }

      for (let i = 0; i < scenario.enRevision; i++) {
        try {
          const cliente = clientes[(aIdx * 3 + i) % clientes.length];
          const eq = equipos[(aIdx * 3 + i) % equipos.length];
          const dias = 7;
          const precio = eq.precioRentaDia ? Number(eq.precioRentaDia) : 1800;
          const subtotal = precio * dias;
          const iva = subtotal * 0.15;
          const total = subtotal + iva;

          const cot = await this.create(
            {
              clienteId: cliente.id,
              asesorId: asesor.id,
              proyecto: `Obra Vial Tramo ${i + 1}`,
              validezDias: 15,
              subtotal,
              iva,
              total,
              items: [
                {
                  equipoId: eq.id,
                  descripcion: `${eq.descripcion || eq.modelo}`,
                  cantidad: 1,
                  dias,
                  precioUnitario: precio,
                  subtotal,
                  tipoCobro: TipoCobro.POR_DIA,
                },
              ],
            },
            empresaId,
            sucursalId,
            asesor.id,
          );

          await this.update(
            cot.id,
            {
              estado: EstadoCotizacion.EN_REVISION,
              notasRevision:
                'Revisión técnica de tarifas solicitada por cliente.',
            },
            empresaId,
            asesor.id,
          );
          createdQuotesCount++;
        } catch {
          // Ignorar fallo de concurrencia o duplicidad en seed
        }
      }
    }

    return {
      createdQuotesCount,
      createdContractsCount,
      advisorsSeeded: asesores.length,
    };
  }
}
