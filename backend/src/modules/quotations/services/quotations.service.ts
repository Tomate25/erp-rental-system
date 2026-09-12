import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateQuotationDto } from '../dto/create-quotation.dto';
import { UpdateQuotationDto } from '../dto/update-quotation.dto';
import { EstadoCotizacion, TipoCobro, EstadoEquipo, EstadoReserva, TipoControlEquipo, EstadoCorteFacturacion } from '@prisma/client';
import { resolveQuotationEquipment } from '../../contracts/utils/resolve-quotation-equipment';

@Injectable()
export class QuotationsService {
  constructor(private prisma: PrismaService) {}

  private readonly rolesAsesor = ['COMERCIAL', 'VENTAS', 'ASESOR'];

  private normalizarNombre(value?: string | null): string {
    return (value || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('es');
  }

  private async resolveAsesorId(
    db: any,
    cliente: { id: string; vendedorId?: string | null; vendedor?: string | null },
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
      const vendedorAsignado = usuarios.find((usuario: any) => {
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

    let effectiveAsesorId = asesorSolicitadoId || vendedorAsignadoId || asesorActualId || undefined;

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
            vendedor: `${creadorAsesor.nombre} ${creadorAsesor.apellido}`.trim(),
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
        throw new ForbiddenException('El asesor no existe o no pertenece a tu empresa');
      }
    }

    return effectiveAsesorId;
  }

  private async generateNextQuoteNumber(): Promise<string> {
    const lastQuote = await this.prisma.cotizacion.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { numeroCotizacion: true }
    });

    if (!lastQuote || !lastQuote.numeroCotizacion) {
      return 'COT-0001';
    }

    const match = lastQuote.numeroCotizacion.match(/^COT-(\d+)$/);
    if (!match) {
      return 'COT-0001';
    }

    const currentNumber = parseInt(match[1], 10);
    const nextNumber = currentNumber + 1;
    return `COT-${nextNumber.toString().padStart(4, '0')}`;
  }

  async create(createDto: CreateQuotationDto, empresaId: string, sucursalId?: string, usuarioId?: string) {
    const numeroCotizacion = await this.generateNextQuoteNumber();
    const validez = createDto.validezDias || 15;
    const fechaVence = new Date();
    fechaVence.setDate(fechaVence.getDate() + validez);

    const cliente = await this.prisma.cliente.findFirst({
      where: { id: createDto.clienteId, empresaId },
      select: { id: true, vendedorId: true, vendedor: true }
    });
    if (!cliente) {
      throw new NotFoundException('El cliente no existe o no pertenece a tu empresa');
    }

    const effectiveAsesorId = await this.resolveAsesorId(
      this.prisma,
      cliente,
      empresaId,
      createDto.asesorId,
      usuarioId,
    );

    return this.prisma.cotizacion.create({
      data: {
        empresaId,
        sucursalId,
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
        condiciones: createDto.condiciones,
        notasRevision: (createDto as any).notasRevision,
        subtotal: createDto.subtotal,
        descuento: createDto.descuento || 0,
        iva: createDto.iva,
        total: createDto.total,
        depositoGarantia: createDto.depositoGarantia || 0,
        estado: createDto.estado || EstadoCotizacion.BORRADOR,
        items: {
          create: createDto.items.map((item: any) => ({
            productoId: item.productoId ? item.productoId : undefined,
            equipoId: item.equipoId ? item.equipoId : undefined,
            descripcion: item.descripcion,
            tipoCobro: item.tipoCobro || (item.tipoTarifa === 'HORA' ? TipoCobro.POR_HORA : TipoCobro.POR_DIA),
            cantidad: item.cantidad,
            dias: item.dias,
            horas: item.horas || (item.tipoCobro === TipoCobro.POR_HORA || item.tipoTarifa === 'HORA' ? item.dias : undefined),
            precioUnitario: item.precioUnitario,
            descuento: item.descuento || 0,
            subtotal: item.subtotal
          }))
        }
      },
      include: {
        items: {
          include: { equipo: true }
        },
        cliente: true
      }
    });
  }

  async createPublic(createDto: any) {
    const numeroCotizacion = await this.generateNextQuoteNumber();
    const validez = createDto.validezDias || 15;
    const fechaVence = new Date();
    fechaVence.setDate(fechaVence.getDate() + validez);
    
    return this.prisma.$transaction(async (tx: any) => {
      let empresa = await tx.empresa.findFirst();
      if (!empresa) throw new Error('Sistema no tiene empresa configurada');

      let cliente = await tx.cliente.findFirst({
        where: { 
          emailFacturacion: createDto.email,
          empresaId: empresa.id
        }
      });

      if (!cliente) {
        cliente = await tx.cliente.create({
          data: {
            empresaId: empresa.id,
            nombre: createDto.atencion || 'Solicitante Público',
            emailFacturacion: createDto.email,
            telefono: createDto.telefono,
          }
        });
      }

      const cotizacion = await tx.cotizacion.create({
        data: {
          empresaId: empresa.id,
          numeroCotizacion,
          clienteId: cliente.id,
          proyecto: createDto.proyecto,
          atencion: createDto.atencion,
          telefono: createDto.telefono,
          email: createDto.email,
          validezDias: validez,
          fechaVence,
          condiciones: createDto.condiciones,
          subtotal: createDto.subtotal || 0,
          descuento: createDto.descuento || 0,
          iva: createDto.iva || 0,
          total: createDto.total || 0,
          depositoGarantia: createDto.depositoGarantia || 0,
          estado: EstadoCotizacion.PENDIENTE,
          items: {
            create: createDto.items?.map((item: any) => ({
              descripcion: item.descripcion,
              cantidad: item.cantidad,
              dias: item.dias,
              precioUnitario: item.precioUnitario,
              descuento: item.descuento || 0,
              subtotal: item.subtotal
            })) || []
          }
        },
        include: {
          items: true,
          cliente: true
        }
      });
      return cotizacion;
    });
  }

  async findAll(empresaId?: string) {
    const whereClause: any = empresaId
      ? {
          OR: [
            { empresaId },
            { cliente: { empresaId } }
          ]
        }
      : {};

    return this.prisma.cotizacion.findMany({
      where: whereClause,
      include: {
        cliente: true,
        items: {
          include: { equipo: true }
        },
        contratos: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string, empresaId?: string) {
    const whereClause: any = { id };
    if (empresaId) {
      whereClause.OR = [
        { empresaId },
        { cliente: { empresaId } }
      ];
    }

    const cotizacion = await this.prisma.cotizacion.findFirst({
      where: whereClause,
      include: {
        cliente: true,
        items: {
          include: { equipo: true }
        },
        contratos: true,
      }
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
    }

    return cotizacion;
  }

  async findByNumero(numeroCotizacion: string, empresaId?: string) {
    const whereClause: any = { numeroCotizacion };
    if (empresaId) {
      whereClause.OR = [
        { empresaId },
        { cliente: { empresaId } }
      ];
    }

    const cotizacion = await this.prisma.cotizacion.findFirst({
      where: whereClause,
      include: {
        cliente: true,
        items: {
          include: { equipo: true }
        },
        contratos: true,
      }
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización con Número ${numeroCotizacion} no encontrada`);
    }

    return cotizacion;
  }

  async findByPublicToken(tokenPublico: string) {
    const cotizacion = await this.prisma.cotizacion.findUnique({
      where: { tokenPublico },
      include: {
        cliente: true,
        asesor: {
          select: { id: true, nombre: true, apellido: true, email: true }
        },
        items: {
          include: { equipo: true }
        }
      }
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotizacion no encontrada`);
    }

    return cotizacion;
  }

  async update(id: string, updateDto: UpdateQuotationDto, empresaId: string, usuarioId?: string) {
    const existing = await this.findOne(id, empresaId);
    
    return this.prisma.$transaction(async (tx: any) => {
      // Bloqueo pesimista de fila en PostgreSQL para evitar aprobaciones simultáneas
      await tx.$executeRaw`SELECT id FROM "cotizaciones" WHERE id = ${id} FOR UPDATE`;

      const current = await tx.cotizacion.findUnique({
        where: { id },
        include: { contratos: true }
      });

      if (!current) {
        throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
      }

      const targetClienteId = updateDto.clienteId || existing.clienteId;
      const targetCliente = await tx.cliente.findFirst({
        where: { id: targetClienteId, empresaId },
        select: { id: true, vendedorId: true, vendedor: true }
      });
      if (!targetCliente) {
        throw new NotFoundException('El cliente no existe o no pertenece a tu empresa');
      }

      if (updateDto.items) {
        await tx.detalleCotizacion.deleteMany({
          where: { cotizacionId: id }
        });
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
          condiciones: updateDto.condiciones,
          notasRevision: updateDto.notasRevision,
          subtotal: updateDto.subtotal,
          descuento: updateDto.descuento,
          iva: updateDto.iva,
          total: updateDto.total,
          depositoGarantia: updateDto.depositoGarantia,
          items: updateDto.items ? {
            create: updateDto.items.map((item: any) => ({
              equipoId: item.equipoId ? item.equipoId : undefined,
              descripcion: item.descripcion,
              tipoCobro: item.tipoCobro || (item.tipoTarifa === 'HORA' ? TipoCobro.POR_HORA : TipoCobro.POR_DIA),
              cantidad: item.cantidad,
              dias: item.dias,
              horas: item.horas || (item.tipoCobro === TipoCobro.POR_HORA || item.tipoTarifa === 'HORA' ? item.dias : undefined),
              precioUnitario: item.precioUnitario,
              descuento: item.descuento || 0,
              subtotal: item.subtotal
            }))
          } : undefined
        },
        include: {
          items: {
            include: { equipo: true }
          },
          cliente: true
        }
      });

      // Auto-generación de Contrato y Solicitud de Despacho si la cotización pasa a ACEPTADA
      if (updateDto.estado === EstadoCotizacion.ACEPTADA) {
        const existingContract = tx.contrato?.findFirst
          ? await tx.contrato.findFirst({
              where: { cotizacionId: cotizacion.id }
            })
          : null;

        if (!existingContract && tx.contrato?.create) {
          const empId = cotizacion.empresaId || empresaId || existing.empresaId || '';
          let sucursalId = cotizacion.sucursalId || existing.sucursalId;
          if (!sucursalId && tx.sucursal?.findFirst) {
            const firstSuc = await tx.sucursal.findFirst({
              where: empId ? { empresaId: empId } : undefined
            });
            sucursalId = firstSuc?.id;
          }

          const countContrato = tx.contrato?.count ? await tx.contrato.count() : 0;
          const year = new Date().getFullYear();
          const codigoContrato = `CTR-${year}-${(countContrato + 1).toString().padStart(4, '0')}`;

          const fechaInicio = new Date();
          const maxDias = cotizacion.items && cotizacion.items.length > 0
            ? Math.max(...cotizacion.items.map((it: any) => it.dias || 30))
            : (cotizacion.validezDias || 30);
          const fechaFin = new Date(fechaInicio.getTime() + (maxDias > 0 ? maxDias : 30) * 24 * 60 * 60 * 1000);
          const depositoGarantia = cotizacion.depositoGarantia ?? existing.depositoGarantia ?? 0.0;
          const condiciones = cotizacion.condiciones || existing.condiciones || 'Contrato estándar de arrendamiento de equipos.';

          let contractItems: any[] = [];
          const itemsWithEquipment = (cotizacion.items || []).filter((item: any) => item.equipoId);
          if (itemsWithEquipment.length > 0 && empId && sucursalId && tx.equipo) {
            contractItems = await resolveQuotationEquipment(tx, itemsWithEquipment, empId, sucursalId);
          }

          const uniqueEquipoIds = [...new Set(contractItems.map((item: any) => (item.equipo as any).connect.id))];
          const cantidadesSolicitadas = new Map<string, number>();
          let equiposById = new Map<string, any>();

          if (uniqueEquipoIds.length > 0 && tx.equipo) {
            for (const eqId of uniqueEquipoIds) {
              if (tx.$executeRaw) {
                await tx.$executeRaw`SELECT id FROM "equipos" WHERE id = ${eqId} FOR UPDATE`;
              }
            }

            const equipos = await tx.equipo.findMany({
              where: { id: { in: uniqueEquipoIds }, ...(empId ? { empresaId: empId } : {}) }
            });
            equiposById = new Map(equipos.map((eq: any) => [eq.id, eq]));

            for (const cItem of contractItems) {
              const equipoId = (cItem.equipo as any).connect.id;
              const equipo = equiposById.get(equipoId);
              if (!equipo) {
                throw new NotFoundException(`El equipo ${equipoId} no fue encontrado.`);
              }
              const cantidad = cItem.cantidad ?? 1;
              if (equipo.tipoControl === TipoControlEquipo.SERIALIZADO) {
                if (cantidad !== 1) {
                  throw new BadRequestException(`El equipo serializado ${equipo.modelo} solo puede contratarse en cantidad 1.`);
                }
                if (equipo.cantidadDisponible < 1 || equipo.estado !== EstadoEquipo.DISPONIBLE) {
                  throw new BadRequestException(`El equipo serializado ${equipo.modelo} (serie: ${equipo.numeroSerie || 'S/N'}) no está disponible.`);
                }
              }

              const cantidadSolicitada = (cantidadesSolicitadas.get(equipoId) ?? 0) + cantidad;
              if (equipo.cantidadDisponible < cantidadSolicitada) {
                throw new BadRequestException(`Stock insuficiente para el equipo ${equipo.descripcion || equipo.modelo}. Disponible: ${equipo.cantidadDisponible}`);
              }
              cantidadesSolicitadas.set(equipoId, cantidadSolicitada);
            }
          }

          const contrato = await tx.contrato.create({
            data: {
              codigo: codigoContrato,
              sucursalId: sucursalId || 'default-sucursal',
              clienteId: cotizacion.clienteId,
              cotizacionId: cotizacion.id,
              fechaInicio,
              fechaFin,
              depositoGarantia,
              condiciones,
              estado: 'ACTIVO',
              items: contractItems.length > 0 ? {
                create: contractItems
              } : undefined
            }
          });

          // Reservar inventario y registrar en Reserva
          if (contractItems.length > 0 && tx.reserva?.create) {
            for (const [equipoId, cantReservada] of cantidadesSolicitadas.entries()) {
              const equipo = equiposById.get(equipoId);
              if (equipo && tx.equipo?.update) {
                if (equipo.tipoControl === TipoControlEquipo.SERIALIZADO) {
                  await tx.equipo.update({
                    where: { id: equipoId },
                    data: {
                      cantidadDisponible: 0,
                      estado: EstadoEquipo.RESERVADO
                    }
                  });
                } else {
                  await tx.equipo.update({
                    where: { id: equipoId },
                    data: {
                      cantidadDisponible: Math.max(0, equipo.cantidadDisponible - cantReservada)
                    }
                  });
                }
              }

              await tx.reserva.create({
                data: {
                  contratoId: contrato.id,
                  equipoId,
                  fechaInicio: contrato.fechaInicio,
                  fechaFin: contrato.fechaFin,
                  estado: EstadoReserva.CONFIRMADA
                }
              });
            }
          }

          // Generar cortes de facturación proyectados
          if (tx.corteFacturacion?.create) {
            const diffMs = fechaFin.getTime() - fechaInicio.getTime();
            const diffDias = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
            const periodoDias = 30;
            const cantidadCortes = Math.max(1, Math.ceil(diffDias / periodoDias));
            const montoPorCorte = Math.round(((cotizacion.total || 0) / cantidadCortes) * 100) / 100;
            let inicioPeriodo = new Date(fechaInicio);

            for (let i = 1; i <= cantidadCortes; i++) {
              const finPeriodo = new Date(inicioPeriodo.getTime() + periodoDias * 24 * 60 * 60 * 1000);
              const fechaFinReal = finPeriodo > fechaFin ? fechaFin : finPeriodo;
              await tx.corteFacturacion.create({
                data: {
                  contratoId: contrato.id,
                  numeroCorte: i,
                  fechaInicio: inicioPeriodo,
                  fechaFin: fechaFinReal,
                  monto: montoPorCorte,
                  estado: EstadoCorteFacturacion.PENDIENTE
                }
              });
              inicioPeriodo = new Date(fechaFinReal.getTime() + 24 * 60 * 60 * 1000);
            }
          }

          // Generar automáticamente Solicitud de Despacho en Módulo de Operaciones
          if (tx.solicitudDespacho?.create) {
            const countDesp = tx.solicitudDespacho.count
              ? await tx.solicitudDespacho.count(empId ? { where: { empresaId: empId } } : undefined)
              : 0;
            const codigoDesp = `SOL-DESP-${(countDesp + 1).toString().padStart(4, '0')}`;
            await tx.solicitudDespacho.create({
              data: {
                codigo: codigoDesp,
                empresaId: empId || undefined,
                sucursalId: contrato.sucursalId,
                contratoId: contrato.id,
                solicitadoPor: 'Sistema (Cotización Aprobada)',
                fechaProgramada: contrato.fechaInicio,
                direccionEntrega: cotizacion.cliente?.direccion || 'Dirección Registrada del Cliente',
                comentarios: `Despacho de equipos programado automáticamente desde cotización aprobada ${cotizacion.numeroCotizacion || cotizacion.id}`,
                estado: 'PENDIENTE'
              }
            });
          }
        }
      }

      return cotizacion;
    });
  }

  async createNewVersion(id: string, empresaId?: string) {
    const existing = await this.findOne(id, empresaId);
    const validez = existing.validezDias || 15;
    const fechaVence = new Date();
    fechaVence.setDate(fechaVence.getDate() + validez);
    
    return this.prisma.$transaction(async (tx: any) => {
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
          condiciones: existing.condiciones,
          notasRevision: null,
          subtotal: existing.subtotal,
          descuento: existing.descuento,
          iva: existing.iva,
          total: existing.total,
          depositoGarantia: existing.depositoGarantia,
          estado: EstadoCotizacion.EN_REVISION,
          items: {
            create: existing.items.map((item: any) => ({
              equipoId: item.equipoId ? item.equipoId : undefined,
              descripcion: item.descripcion,
              cantidad: item.cantidad,
              dias: item.dias,
              precioUnitario: item.precioUnitario,
              descuento: item.descuento,
              subtotal: item.subtotal
            }))
          }
        },
        include: {
          items: {
            include: { equipo: true }
          },
          cliente: true
        }
      });

      await tx.cotizacion.update({
        where: { id: existing.id },
        data: { estado: EstadoCotizacion.CANCELADA }
      });

      return newVersion;
    });
  }

  async findVersionsByNumber(numeroCotizacion: string, empresaId?: string) {
    const whereClause: any = { numeroCotizacion };
    if (empresaId) {
      whereClause.OR = [
        { empresaId },
        { cliente: { empresaId } }
      ];
    }

    return this.prisma.cotizacion.findMany({
      where: whereClause,
      include: {
        cliente: true,
        asesor: {
          select: { id: true, nombre: true, apellido: true, email: true }
        },
        items: {
          include: { equipo: true }
        }
      },
      orderBy: { version: 'desc' }
    });
  }
}
