import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateNotaDto } from '../dto/create-nota.dto';
import { TipoCambioService } from './tipo-cambio.service';
import { CxcConfiguracionService } from './cxc-configuracion.service';
import { EstadoNotaCxc, OrigenNotaCxc, TipoNotaCxc } from '@prisma/client';

@Injectable()
export class CxcNotasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tipoCambioService: TipoCambioService,
    private readonly configService: CxcConfiguracionService,
  ) {}

  async crearNota(empresaId: string, dto: CreateNotaDto, usuarioId?: string) {
    const config = await this.configService.obtenerConfiguracion(empresaId);
    const tasaBcn = await this.tipoCambioService.obtenerTasaDelDia(new Date());

    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.clienteId },
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${dto.clienteId} no encontrado`);
    }

    const subtotal = Number(dto.subtotal);
    const iva = Number(dto.iva || 0);
    const total = Number(dto.total);

    if (Math.abs(subtotal + iva - total) > 0.05) {
      throw new BadRequestException('El total de la nota no coincide con la suma de subtotal + IVA');
    }

    const tipoNota = dto.tipoNota || TipoNotaCxc.DEBITO;
    const prefijo = tipoNota === TipoNotaCxc.DEBITO ? 'ND' : 'NC';
    const numeroNota = await this.generarSiguienteNumeroNota(empresaId, prefijo);

    const condicionPago = dto.condicionPago || 'CREDITO';
    const esContado = condicionPago === 'CONTADO';
    const saldoPendiente = esContado ? 0 : total;
    const estado = esContado ? EstadoNotaCxc.PAGADA : EstadoNotaCxc.PENDIENTE;

    const fechaVence = dto.fechaVence ? new Date(dto.fechaVence) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const nota = await tx.notaDebito.create({
        data: {
          empresaId,
          sucursalId: dto.sucursalId,
          clienteId: dto.clienteId,
          tipoNota,
          numeroNota,
          fechaEmision: new Date(),
          fechaVence,
          moneda: dto.moneda || 'NIO',
          montoMonedaOrigen: total,
          tipoCambioEmision: tasaBcn,
          subtotal,
          iva,
          total,
          saldoPendiente,
          condicionPago,
          estado,
          origen: dto.origen,
          concepto: dto.concepto,
          devolucionId: dto.devolucionId || null,
          facturaReferenciaId: dto.facturaReferenciaId || null,
        },
        include: {
          cliente: { select: { id: true, nombre: true, rfc: true } },
          sucursal: { select: { id: true, nombre: true } },
        },
      });

      // Si es Nota de Crédito con factura de referencia, aplicar reducción de saldo
      if (tipoNota === TipoNotaCxc.CREDITO && dto.facturaReferenciaId) {
        const fac = await tx.factura.findUnique({ where: { id: dto.facturaReferenciaId } });
        if (fac) {
          const saldoPrevio = Number(fac.saldoPendiente);
          const nuevoSaldo = Math.max(0, saldoPrevio - total);
          await tx.factura.update({
            where: { id: fac.id },
            data: {
              saldoPendiente: nuevoSaldo,
              estadoCxc: nuevoSaldo <= 0 ? 'PAGADA' : 'PARCIAL',
            },
          });
        }
      }

      // Generar Asiento Contable Automático
      const numeroAsiento = await this.generarSiguienteNumeroAsiento(empresaId, tx);
      const lineas: Array<{
        cuentaCodigo: string;
        cuentaNombre: string;
        debe: number;
        haber: number;
        conceptoLinea: string;
        clienteId?: string;
      }> = [];

      if (tipoNota === TipoNotaCxc.DEBITO) {
        if (condicionPago === 'CREDITO') {
          // Cargo: 1.1.05.001 Clientes
          lineas.push({
            cuentaCodigo: config.cuentaMayorClientes || '1.1.05.001',
            cuentaNombre: 'Clientes – cuentas por cobrar (control)',
            debe: total,
            haber: 0,
            conceptoLinea: `ND ${numeroNota} a favor de cartera – ${cliente.nombre}`,
            clienteId: cliente.id,
          });
        } else {
          // Cargo: Caja General
          lineas.push({
            cuentaCodigo: '1.1.01.001',
            cuentaNombre: 'Caja General',
            debe: total,
            haber: 0,
            conceptoLinea: `Cobro contado ND ${numeroNota} – ${cliente.nombre}`,
          });
        }

        // Abono: Cuenta de Ingreso según origen
        let cuentaIngreso = '4.1.03.001';
        let nombreIngreso = 'Ingresos por Reparaciones y Daños de Equipo';
        if (dto.origen === OrigenNotaCxc.INTERES_MORA) {
          cuentaIngreso = config.cuentaInteresesMoratorios || '4.2.01.001';
          nombreIngreso = 'Intereses Moratorios por Cobranza';
        } else if (dto.origen === OrigenNotaCxc.AJUSTE) {
          cuentaIngreso = config.cuentaGastosAdministrativos || '4.2.01.002';
          nombreIngreso = 'Gastos Administrativos / Ajuste de Cartera';
        } else if (dto.origen === OrigenNotaCxc.PENALIDAD_ARREGLO) {
          cuentaIngreso = '4.2.01.003';
          nombreIngreso = 'Penalidades por Incumplimiento de Arreglo';
        }

        lineas.push({
          cuentaCodigo: cuentaIngreso,
          cuentaNombre: nombreIngreso,
          debe: 0,
          haber: subtotal,
          conceptoLinea: `${dto.concepto} (ND ${numeroNota})`,
        });

        if (iva > 0) {
          lineas.push({
            cuentaCodigo: '2.1.03.001',
            cuentaNombre: 'IVA por Pagar (Débito Fiscal 15%)',
            debe: 0,
            haber: iva,
            conceptoLinea: `IVA 15% ND ${numeroNota}`,
          });
        }
      } else {
        // NOTA DE CRÉDITO
        lineas.push({
          cuentaCodigo: '4.1.01.099',
          cuentaNombre: 'Devoluciones y Descuentos en Ventas',
          debe: subtotal,
          haber: 0,
          conceptoLinea: `Descuento/Ajuste NC ${numeroNota}`,
        });

        if (iva > 0) {
          lineas.push({
            cuentaCodigo: '2.1.03.001',
            cuentaNombre: 'IVA por Pagar (Ajuste Crédito Fiscal 15%)',
            debe: iva,
            haber: 0,
            conceptoLinea: `IVA 15% ajuste NC ${numeroNota}`,
          });
        }

        lineas.push({
          cuentaCodigo: config.cuentaMayorClientes || '1.1.05.001',
          cuentaNombre: 'Clientes – cuentas por cobrar (control)',
          debe: 0,
          haber: total,
          conceptoLinea: `Abono a cartera por NC ${numeroNota} – ${cliente.nombre}`,
          clienteId: cliente.id,
        });
      }

      await tx.asientoContable.create({
        data: {
          empresaId,
          sucursalId: dto.sucursalId,
          numeroAsiento,
          fecha: new Date(),
          tipoAsiento: 'DIARIO',
          origenModulo: 'CXC',
          documentoReferencia: numeroNota,
          concepto: `${tipoNota === TipoNotaCxc.DEBITO ? 'Nota de Débito' : 'Nota de Crédito'} ${numeroNota}: ${dto.concepto}`,
          totalDebe: total,
          totalHaber: total,
          cuadrado: true,
          estado: 'PUBLICADO',
          creadoPorId: usuarioId || null,
          lineas: {
            create: lineas.map((l) => ({
              cuentaCodigo: l.cuentaCodigo,
              cuentaNombre: l.cuentaNombre,
              debe: l.debe,
              haber: l.haber,
              conceptoLinea: l.conceptoLinea,
              clienteId: l.clienteId || null,
            })),
          },
        },
      });

      return nota;
    });
  }

  async listarNotas(
    empresaId: string,
    filtros: {
      clienteId?: string;
      tipoNota?: TipoNotaCxc;
      estado?: EstadoNotaCxc;
      sucursalId?: string;
    },
  ) {
    const where: any = { empresaId };
    if (filtros.clienteId) where.clienteId = filtros.clienteId;
    if (filtros.tipoNota) where.tipoNota = filtros.tipoNota;
    if (filtros.estado) where.estado = filtros.estado;
    if (filtros.sucursalId) where.sucursalId = filtros.sucursalId;

    return this.prisma.notaDebito.findMany({
      where,
      orderBy: { fechaEmision: 'desc' },
      include: {
        cliente: { select: { id: true, nombre: true, rfc: true, tipoCliente: true } },
        sucursal: { select: { id: true, nombre: true } },
        facturaReferencia: { select: { id: true, folio: true, total: true } },
      },
    });
  }

  async obtenerNotaPorId(empresaId: string, id: string) {
    const nota = await this.prisma.notaDebito.findFirst({
      where: { id, empresaId },
      include: {
        cliente: true,
        sucursal: true,
        facturaReferencia: true,
        devolucion: true,
        reciboAplicaciones: {
          include: {
            reciboCaja: true,
          },
        },
        arregloDocumentos: {
          include: {
            arreglo: true,
          },
        },
      },
    });
    if (!nota) {
      throw new NotFoundException(`Nota con ID ${id} no encontrada`);
    }
    return nota;
  }

  async anularNota(empresaId: string, id: string, motivo: string, usuarioId?: string) {
    const nota = await this.prisma.notaDebito.findFirst({
      where: { id, empresaId },
      include: {
        reciboAplicaciones: true,
        arregloDocumentos: {
          include: {
            arreglo: true,
          },
        },
        cliente: true,
      },
    });

    if (!nota) {
      throw new NotFoundException(`Nota con ID ${id} no encontrada`);
    }
    if (nota.estado === EstadoNotaCxc.ANULADA) {
      throw new BadRequestException('La nota ya se encuentra anulada');
    }
    if (nota.reciboAplicaciones.length > 0) {
      throw new BadRequestException('No se puede anular una nota que tiene abonos o pagos aplicados mediante Recibos de Caja');
    }
    const arreglosActivos = nota.arregloDocumentos.filter((a) => a.arreglo.estado !== 'ANULADO');
    if (arreglosActivos.length > 0) {
      throw new BadRequestException('No se puede anular una nota que está incorporada en un Arreglo de Pago activo');
    }

    const config = await this.configService.obtenerConfiguracion(empresaId);

    return this.prisma.$transaction(async (tx) => {
      const notaActualizada = await tx.notaDebito.update({
        where: { id },
        data: {
          estado: EstadoNotaCxc.ANULADA,
          saldoPendiente: 0,
        },
      });

      // Si fue una NC que redujo saldo de una factura, restaurar el saldo de la factura
      if (nota.tipoNota === TipoNotaCxc.CREDITO && nota.facturaReferenciaId) {
        const fac = await tx.factura.findUnique({ where: { id: nota.facturaReferenciaId } });
        if (fac) {
          const nuevoSaldo = Number(fac.saldoPendiente) + Number(nota.total);
          await tx.factura.update({
            where: { id: fac.id },
            data: {
              saldoPendiente: nuevoSaldo,
              estadoCxc: nuevoSaldo >= Number(fac.total) ? 'PENDIENTE' : 'PARCIAL',
            },
          });
        }
      }

      // Asiento contable de reversión
      const numeroAsiento = await this.generarSiguienteNumeroAsiento(empresaId, tx);
      const total = Number(nota.total);
      const subtotal = Number(nota.subtotal);
      const iva = Number(nota.iva);

      const lineas: Array<{
        cuentaCodigo: string;
        cuentaNombre: string;
        debe: number;
        haber: number;
        conceptoLinea: string;
        clienteId?: string;
      }> = [];

      if (nota.tipoNota === TipoNotaCxc.DEBITO) {
        let cuentaIngreso = '4.1.03.001';
        let nombreIngreso = 'Ingresos por Reparaciones y Daños de Equipo';
        if (nota.origen === OrigenNotaCxc.INTERES_MORA) {
          cuentaIngreso = config.cuentaInteresesMoratorios || '4.2.01.001';
          nombreIngreso = 'Intereses Moratorios por Cobranza';
        } else if (nota.origen === OrigenNotaCxc.AJUSTE) {
          cuentaIngreso = config.cuentaGastosAdministrativos || '4.2.01.002';
          nombreIngreso = 'Gastos Administrativos / Ajustes de Cartera';
        }

        lineas.push({
          cuentaCodigo: cuentaIngreso,
          cuentaNombre: nombreIngreso,
          debe: subtotal,
          haber: 0,
          conceptoLinea: `Reversión por anulación ${nota.numeroNota}`,
        });

        if (iva > 0) {
          lineas.push({
            cuentaCodigo: '2.1.03.001',
            cuentaNombre: 'IVA por Pagar (Reversión)',
            debe: iva,
            haber: 0,
            conceptoLinea: `Reversión IVA ${nota.numeroNota}`,
          });
        }

        lineas.push({
          cuentaCodigo: config.cuentaMayorClientes || '1.1.05.001',
          cuentaNombre: 'Clientes – cuentas por cobrar (control)',
          debe: 0,
          haber: total,
          conceptoLinea: `Reversión ND ${nota.numeroNota} – ${nota.cliente.nombre}`,
          clienteId: nota.cliente.id,
        });
      } else {
        // Reversión NC
        lineas.push({
          cuentaCodigo: config.cuentaMayorClientes || '1.1.05.001',
          cuentaNombre: 'Clientes – cuentas por cobrar (control)',
          debe: total,
          haber: 0,
          conceptoLinea: `Reversión NC ${nota.numeroNota} – ${nota.cliente.nombre}`,
          clienteId: nota.cliente.id,
        });

        lineas.push({
          cuentaCodigo: '4.1.01.099',
          cuentaNombre: 'Devoluciones y Descuentos en Ventas',
          debe: 0,
          haber: subtotal,
          conceptoLinea: `Reversión ajuste NC ${nota.numeroNota}`,
        });

        if (iva > 0) {
          lineas.push({
            cuentaCodigo: '2.1.03.001',
            cuentaNombre: 'IVA por Pagar (Reversión ajuste)',
            debe: 0,
            haber: iva,
            conceptoLinea: `Reversión IVA NC ${nota.numeroNota}`,
          });
        }
      }

      await tx.asientoContable.create({
        data: {
          empresaId,
          sucursalId: nota.sucursalId,
          numeroAsiento,
          fecha: new Date(),
          tipoAsiento: 'DIARIO',
          origenModulo: 'CXC',
          documentoReferencia: nota.numeroNota,
          concepto: `Anulación de Nota ${nota.numeroNota}: ${motivo}`,
          totalDebe: total,
          totalHaber: total,
          cuadrado: true,
          estado: 'PUBLICADO',
          creadoPorId: usuarioId || null,
          lineas: {
            create: lineas.map((l) => ({
              cuentaCodigo: l.cuentaCodigo,
              cuentaNombre: l.cuentaNombre,
              debe: l.debe,
              haber: l.haber,
              conceptoLinea: l.conceptoLinea,
              clienteId: l.clienteId || null,
            })),
          },
        },
      });

      return notaActualizada;
    });
  }

  private async generarSiguienteNumeroNota(empresaId: string, prefijo: string): Promise<string> {
    const ult = await this.prisma.notaDebito.findFirst({
      where: {
        empresaId,
        numeroNota: { startsWith: `${prefijo}-` },
      },
      orderBy: { createdAt: 'desc' },
      select: { numeroNota: true },
    });

    let correlativo = 1;
    if (ult?.numeroNota) {
      const match = ult.numeroNota.match(new RegExp(`^${prefijo}-(\\d+)`));
      if (match) correlativo = parseInt(match[1], 10) + 1;
    }
    return `${prefijo}-${String(correlativo).padStart(6, '0')}`;
  }

  private async generarSiguienteNumeroAsiento(empresaId: string, tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const prefijo = `AS-${year}-`;
    const ult = await tx.asientoContable.findFirst({
      where: { empresaId, numeroAsiento: { startsWith: prefijo } },
      orderBy: { createdAt: 'desc' },
      select: { numeroAsiento: true },
    });
    let correlativo = 1;
    if (ult?.numeroAsiento) {
      const match = ult.numeroAsiento.match(new RegExp(`^${prefijo}(\\d+)`));
      if (match) correlativo = parseInt(match[1], 10) + 1;
    }
    return `${prefijo}${String(correlativo).padStart(6, '0')}`;
  }
}
