import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateReciboCajaDto } from '../dto/create-recibo-caja.dto';
import { TipoCambioService } from './tipo-cambio.service';
import { CxcConfiguracionService } from './cxc-configuracion.service';

@Injectable()
export class CxcRecibosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tipoCambioService: TipoCambioService,
    private readonly configService: CxcConfiguracionService
  ) {}

  /**
   * Genera el siguiente número de consecutivo continuo para el recibo de caja.
   */
  private async generarSiguienteNumeroRecibo(empresaId: string, sucursalId: string, seriePorSucursal: boolean): Promise<string> {
    const sucursal = await this.prisma.sucursal.findUnique({ where: { id: sucursalId } });
    const prefijo = seriePorSucursal && sucursal?.codigo
      ? `RC-${sucursal.codigo}`
      : 'RC';

    const ultimo = await this.prisma.reciboCaja.findFirst({
      where: {
        empresaId,
        numeroRecibo: { startsWith: prefijo },
      },
      orderBy: { createdAt: 'desc' },
    });

    let siguiente = 1;
    if (ultimo) {
      const match = ultimo.numeroRecibo.match(/-(\d+)$/);
      if (match) {
        siguiente = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefijo}-${String(siguiente).padStart(5, '0')}`;
  }

  /**
   * Genera el siguiente número de asiento contable consecutivo.
   */
  private async generarSiguienteNumeroAsiento(empresaId: string): Promise<string> {
    const anio = new Date().getFullYear();
    const prefijo = `AS-${anio}`;
    const ultimo = await this.prisma.asientoContable.findFirst({
      where: {
        empresaId,
        numeroAsiento: { startsWith: prefijo },
      },
      orderBy: { createdAt: 'desc' },
    });

    let siguiente = 1;
    if (ultimo) {
      const match = ultimo.numeroAsiento.match(/-(\d+)$/);
      if (match) {
        siguiente = parseInt(match[1], 10) + 1;
      }
    }

    return `${prefijo}-${String(siguiente).padStart(5, '0')}`;
  }

  /**
   * Registra un nuevo Recibo de Caja con validación de retenciones, imputación (FIFO o manual),
   * sobrepagos a anticipo, concepto automático y asiento contable automático.
   */
  async crearReciboCaja(empresaId: string, usuarioId: string, dto: CreateReciboCajaDto) {
    const config = await this.configService.getConfiguracion(empresaId);
    const cliente = await this.prisma.cliente.findUnique({ where: { id: dto.clienteId } });
    if (!cliente) throw new NotFoundException('Cliente no encontrado');

    // 1. Validar retenciones
    const tieneRetIr = (dto.montoRetencionIr || 0) > 0;
    const tieneRetImi = (dto.montoRetencionImi || 0) > 0;

    if (tieneRetIr || tieneRetImi) {
      if (!cliente.esRetenedor) {
        throw new BadRequestException(
          `El cliente "${cliente.nombre}" no está marcado como agente retenedor. No se permite aplicar retenciones fiscales a este cliente.`
        );
      }
      if (tieneRetIr && (!dto.noConstanciaRetencionIr || !dto.noConstanciaRetencionIr.trim())) {
        throw new BadRequestException('Debe proporcionar el número de constancia de retención en la fuente (IR 2%).');
      }
      if (tieneRetImi && (!dto.noConstanciaRetencionImi || !dto.noConstanciaRetencionImi.trim())) {
        throw new BadRequestException('Debe proporcionar el número de constancia de retención municipal (IMI 1%).');
      }
    }

    // 2. Tipo de cambio
    const tcInfo = await this.tipoCambioService.getTipoCambioHoy(dto.fechaRecibo);
    const tasaBcn = dto.tipoCambioBcn && dto.tipoCambioBcn > 0 ? dto.tipoCambioBcn : tcInfo.tasa;

    const montoEfectivo = Number(dto.montoEfectivoBancos || 0);
    const montoRetIr = Number(dto.montoRetencionIr || 0);
    const montoRetImi = Number(dto.montoRetencionImi || 0);
    const otrasRet = Number(dto.otrasRetenciones || 0);

    const totalLiquidado = montoEfectivo + montoRetIr + montoRetImi + otrasRet;
    if (totalLiquidado <= 0) {
      throw new BadRequestException('El importe total a liquidar en el recibo debe ser mayor a cero.');
    }

    // 3. Determinar o preparar aplicaciones
    // Si aplicarAutoFifo es true o no se enviaron aplicaciones, buscar facturas y notas pendientes en orden FIFO
    let aplicacionesAProcesar: Array<{
      tipoDocumento: 'FACTURA' | 'NOTA_DEBITO' | 'CUOTA_ARREGLO';
      documentoId: string;
      folio: string;
      montoAplicar: number;
      retencionIr: number;
      retencionImi: number;
      saldoAnterior: number;
      saldoRestante: number;
      cancelaTotal: boolean;
    }> = [];

    if (dto.aplicarAutoFifo || !dto.aplicaciones || dto.aplicaciones.length === 0) {
      // Obtener facturas pendientes ordenadas por fechaVence asc
      const facturasPendientes = await this.prisma.factura.findMany({
        where: {
          clienteId: dto.clienteId,
          condicionPago: 'CREDITO',
          estado: { notIn: ['PAGADA', 'CANCELADA'] },
          estadoCxc: { in: ['PENDIENTE', 'PARCIAL'] },
          saldoPendiente: { gt: 0.01 },
        },
        orderBy: { fechaVence: 'asc' },
      });

      let saldoDisponibleParaAplicar = totalLiquidado;
      let retIrPendiente = montoRetIr;
      let retImiPendiente = montoRetImi;

      for (const f of facturasPendientes) {
        if (saldoDisponibleParaAplicar <= 0) break;

        const saldoFac = Number(f.saldoPendiente);
        const aPagar = Math.min(saldoFac, saldoDisponibleParaAplicar);

        // Distribuir retenciones proporcionalmente
        const retIrFac = Math.min(aPagar * 0.02, retIrPendiente);
        const retImiFac = Math.min(aPagar * 0.01, retImiPendiente);
        retIrPendiente -= retIrFac;
        retImiPendiente -= retImiFac;

        const saldoRestante = Math.max(0, saldoFac - aPagar);
        aplicacionesAProcesar.push({
          tipoDocumento: 'FACTURA',
          documentoId: f.id,
          folio: f.folio,
          montoAplicar: aPagar,
          retencionIr: Math.round(retIrFac * 100) / 100,
          retencionImi: Math.round(retImiFac * 100) / 100,
          saldoAnterior: saldoFac,
          saldoRestante: Math.round(saldoRestante * 100) / 100,
          cancelaTotal: saldoRestante <= 0,
        });

        saldoDisponibleParaAplicar -= aPagar;
      }
    } else {
      // Aplicación manual/seleccionada por el usuario
      for (const app of dto.aplicaciones) {
        if (app.tipoDocumento === 'FACTURA') {
          const fac = await this.prisma.factura.findUnique({ where: { id: app.documentoId } });
          if (!fac) throw new NotFoundException(`Factura ${app.documentoId} no encontrada`);
          const saldoFac = Number(fac.saldoPendiente);
          const montoApp = Math.min(saldoFac, Number(app.montoAplicar));
          const saldoRestante = Math.max(0, saldoFac - montoApp);

          aplicacionesAProcesar.push({
            tipoDocumento: 'FACTURA',
            documentoId: fac.id,
            folio: fac.folio,
            montoAplicar: montoApp,
            retencionIr: Number(app.retencionIr || 0),
            retencionImi: Number(app.retencionImi || 0),
            saldoAnterior: saldoFac,
            saldoRestante: Math.round(saldoRestante * 100) / 100,
            cancelaTotal: saldoRestante <= 0,
          });
        } else if (app.tipoDocumento === 'NOTA_DEBITO') {
          const nd = await this.prisma.notaDebito.findUnique({ where: { id: app.documentoId } });
          if (!nd) throw new NotFoundException(`Nota de débito ${app.documentoId} no encontrada`);
          const saldoNd = Number(nd.saldoPendiente);
          const montoApp = Math.min(saldoNd, Number(app.montoAplicar));
          const saldoRestante = Math.max(0, saldoNd - montoApp);

          aplicacionesAProcesar.push({
            tipoDocumento: 'NOTA_DEBITO',
            documentoId: nd.id,
            folio: nd.numeroNota,
            montoAplicar: montoApp,
            retencionIr: 0,
            retencionImi: 0,
            saldoAnterior: saldoNd,
            saldoRestante: Math.round(saldoRestante * 100) / 100,
            cancelaTotal: saldoRestante <= 0,
          });
        } else if (app.tipoDocumento === 'CUOTA_ARREGLO') {
          const cuota = await this.prisma.arregloPagoCuota.findUnique({
            where: { id: app.documentoId },
            include: { arreglo: true },
          });
          if (!cuota) throw new NotFoundException(`Cuota ${app.documentoId} no encontrada`);
          const saldoCuota = Number(cuota.saldoCuota);
          const montoApp = Math.min(saldoCuota, Number(app.montoAplicar));
          const saldoRestante = Math.max(0, saldoCuota - montoApp);

          aplicacionesAProcesar.push({
            tipoDocumento: 'CUOTA_ARREGLO',
            documentoId: cuota.id,
            folio: `${cuota.arreglo.numeroArreglo} (Cuota ${cuota.numeroCuota})`,
            montoAplicar: montoApp,
            retencionIr: 0,
            retencionImi: 0,
            saldoAnterior: saldoCuota,
            saldoRestante: Math.round(saldoRestante * 100) / 100,
            cancelaTotal: saldoRestante <= 0,
          });
        }
      }
    }

    // 4. Calcular total aplicado y sobrepago (anticipo)
    const totalAplicado = aplicacionesAProcesar.reduce((s, a) => s + a.montoAplicar, 0);
    const montoExcedenteAnticipo = Math.max(0, totalLiquidado - totalAplicado);

    // 5. Redactar concepto automático profesional
    let conceptoRedactado = dto.concepto?.trim() || '';
    if (!conceptoRedactado) {
      const frases: string[] = [];
      const canceladas = aplicacionesAProcesar.filter((a) => a.cancelaTotal).map((a) => a.folio);
      const abonadas = aplicacionesAProcesar.filter((a) => !a.cancelaTotal);

      if (canceladas.length > 0) {
        frases.push(`Cancelación ${canceladas.join(', ')}`);
      }
      if (abonadas.length > 0) {
        abonadas.forEach((ab) => {
          frases.push(`Abono a ${ab.folio} (saldo C$ ${ab.saldoRestante.toLocaleString('es-NI', { minimumFractionDigits: 2 })})`);
        });
      }
      if (montoExcedenteAnticipo > 0) {
        frases.push(`Excedente de C$ ${montoExcedenteAnticipo.toLocaleString('es-NI', { minimumFractionDigits: 2 })} acreditado a anticipo de cliente`);
      }
      if (tieneRetIr) {
        frases.push(`Ret. IR 2% const. N.º ${dto.noConstanciaRetencionIr}`);
      }
      if (tieneRetImi) {
        frases.push(`Ret. IMI 1% const. N.º ${dto.noConstanciaRetencionImi}`);
      }

      conceptoRedactado = frases.length > 0 ? frases.join('; ') : `Pago recibido de cliente ${cliente.nombre}`;
    }

    // 6. Transacción atómica de base de datos
    return this.prisma.$transaction(async (tx) => {
      const numeroRecibo = await this.generarSiguienteNumeroRecibo(
        empresaId,
        dto.sucursalId,
        config.serieReciboPorSucursal
      );

      // Crear cabecera de Recibo de Caja
      const recibo = await tx.reciboCaja.create({
        data: {
          empresaId,
          sucursalId: dto.sucursalId,
          clienteId: dto.clienteId,
          numeroRecibo,
          fechaRecibo: new Date(dto.fechaRecibo.slice(0, 10)),
          moneda: dto.moneda || 'NIO',
          tipoCambioBcn: tasaBcn,
          montoEfectivoBancos: montoEfectivo,
          montoRetencionIr: montoRetIr,
          noConstanciaRetencionIr: dto.noConstanciaRetencionIr,
          montoRetencionImi: montoRetImi,
          noConstanciaRetencionImi: dto.noConstanciaRetencionImi,
          otrasRetenciones: otrasRet,
          totalLiquidado,
          totalAplicadoDocumentos: totalAplicado,
          montoExcedenteAnticipo,
          metodoPago: dto.metodoPago,
          banco: dto.banco,
          numeroTransferenciaReferencia: dto.numeroTransferenciaReferencia,
          concepto: conceptoRedactado,
          estado: 'EMITIDO',
          creadoPorId: usuarioId,
        },
      });

      // Crear aplicaciones y actualizar saldos de facturas/documentos
      for (const app of aplicacionesAProcesar) {
        if (app.tipoDocumento === 'FACTURA') {
          await tx.reciboCajaAplicacion.create({
            data: {
              reciboCajaId: recibo.id,
              tipoDocumento: 'FACTURA',
              facturaId: app.documentoId,
              montoCapitalAplicado: app.montoAplicar,
              montoRetencionIrAplicado: app.retencionIr,
              montoRetencionImiAplicado: app.retencionImi,
              saldoAnterior: app.saldoAnterior,
              saldoRestante: app.saldoRestante,
            },
          });

          const nuevoEstado = app.saldoRestante <= 0 ? 'PAGADA' : 'PARCIAL';
          await tx.factura.update({
            where: { id: app.documentoId },
            data: {
              saldoPendiente: app.saldoRestante,
              estadoCxc: nuevoEstado,
              estado: nuevoEstado === 'PAGADA' ? 'PAGADA' : 'PENDIENTE',
              fechaUltimoPago: new Date(),
            },
          });
        } else if (app.tipoDocumento === 'NOTA_DEBITO') {
          await tx.reciboCajaAplicacion.create({
            data: {
              reciboCajaId: recibo.id,
              tipoDocumento: 'NOTA_DEBITO',
              notaDebitoId: app.documentoId,
              montoCapitalAplicado: app.montoAplicar,
              saldoAnterior: app.saldoAnterior,
              saldoRestante: app.saldoRestante,
            },
          });

          await tx.notaDebito.update({
            where: { id: app.documentoId },
            data: {
              saldoPendiente: app.saldoRestante,
              estado: app.saldoRestante <= 0 ? 'PAGADA' : 'PARCIAL',
            },
          });
        } else if (app.tipoDocumento === 'CUOTA_ARREGLO') {
          await tx.reciboCajaAplicacion.create({
            data: {
              reciboCajaId: recibo.id,
              tipoDocumento: 'CUOTA_ARREGLO',
              cuotaArregloId: app.documentoId,
              montoCapitalAplicado: app.montoAplicar,
              saldoAnterior: app.saldoAnterior,
              saldoRestante: app.saldoRestante,
            },
          });

          await tx.arregloPagoCuota.update({
            where: { id: app.documentoId },
            data: {
              saldoCuota: app.saldoRestante,
              estado: app.saldoRestante <= 0 ? 'PAGADA' : 'PARCIAL',
              fechaPagoTotal: app.saldoRestante <= 0 ? new Date() : undefined,
            },
          });
        }
      }

      // Si hay excedente, crear registro de anticipo
      if (montoExcedenteAnticipo > 0) {
        await tx.anticipoCliente.create({
          data: {
            empresaId,
            clienteId: dto.clienteId,
            reciboCajaOrigenId: recibo.id,
            montoOriginal: montoExcedenteAnticipo,
            saldoDisponible: montoExcedenteAnticipo,
            moneda: dto.moneda || 'NIO',
            tipoCambioOrigen: tasaBcn,
            estado: 'DISPONIBLE',
          },
        });
      }

      // 7. Generar Asiento Contable Automático
      const numeroAsiento = await this.generarSiguienteNumeroAsiento(empresaId);
      const cuentaCajaBanco = dto.metodoPago === 'EFECTIVO' ? '1.1.01.001' : '1.1.02.001';
      const nombreCajaBanco = dto.metodoPago === 'EFECTIVO' ? 'Caja General' : 'Bancos C$ – Recaudación';

      const lineasAsiento: Array<{
        cuentaCodigo: string;
        cuentaNombre: string;
        debe: number;
        haber: number;
        conceptoLinea: string;
        clienteId?: string;
      }> = [];

      // Debe: Efectivo o Banco recibido
      if (montoEfectivo > 0) {
        lineasAsiento.push({
          cuentaCodigo: cuentaCajaBanco,
          cuentaNombre: nombreCajaBanco,
          debe: montoEfectivo,
          haber: 0,
          conceptoLinea: `Ingreso por Recibo ${numeroRecibo}`,
        });
      }

      // Debe: Retención IR 2% a favor
      if (montoRetIr > 0) {
        lineasAsiento.push({
          cuentaCodigo: config.cuentaRetencionIrFavor || '1.1.07.003',
          cuentaNombre: 'Retenciones IR 2% a favor (clientes)',
          debe: montoRetIr,
          haber: 0,
          conceptoLinea: `Ret. IR 2% const. ${dto.noConstanciaRetencionIr}`,
          clienteId: dto.clienteId,
        });
      }

      // Debe: Retención IMI 1% a favor
      if (montoRetImi > 0) {
        lineasAsiento.push({
          cuentaCodigo: config.cuentaRetencionImiFavor || '1.1.07.004',
          cuentaNombre: 'Retenciones IMI 1% a favor (ALMA)',
          debe: montoRetImi,
          haber: 0,
          conceptoLinea: `Ret. IMI 1% const. ${dto.noConstanciaRetencionImi}`,
          clienteId: dto.clienteId,
        });
      }

      // Haber: Cartera Clientes 1.1.05.001 por el total amortizado
      if (totalAplicado > 0) {
        lineasAsiento.push({
          cuentaCodigo: config.cuentaMayorClientes || '1.1.05.001',
          cuentaNombre: 'Clientes – cuentas por cobrar (control)',
          debe: 0,
          haber: totalAplicado,
          conceptoLinea: `Abono a cartera según Recibo ${numeroRecibo}`,
          clienteId: dto.clienteId,
        });
      }

      // Haber: Anticipos de Clientes 2.1.06.001 por el excedente
      if (montoExcedenteAnticipo > 0) {
        lineasAsiento.push({
          cuentaCodigo: config.cuentaAnticiposClientes || '2.1.06.001',
          cuentaNombre: 'Anticipos recibidos de clientes',
          debe: 0,
          haber: montoExcedenteAnticipo,
          conceptoLinea: `Excedente a anticipo según Recibo ${numeroRecibo}`,
          clienteId: dto.clienteId,
        });
      }

      const totalDebe = lineasAsiento.reduce((s, l) => s + l.debe, 0);
      const totalHaber = lineasAsiento.reduce((s, l) => s + l.haber, 0);

      const asiento = await tx.asientoContable.create({
        data: {
          empresaId,
          sucursalId: dto.sucursalId,
          numeroAsiento,
          fecha: new Date(dto.fechaRecibo.slice(0, 10)),
          tipoAsiento: 'CXC_COBRO',
          origenModulo: 'CXC',
          documentoReferencia: numeroRecibo,
          concepto: `Recibo de Caja ${numeroRecibo} - ${cliente.nombre}`,
          totalDebe,
          totalHaber,
          cuadrado: Math.abs(totalDebe - totalHaber) < 0.01,
          estado: 'PUBLICADO',
          creadoPorId: usuarioId,
          lineas: {
            create: lineasAsiento.map((l) => ({
              cuentaCodigo: l.cuentaCodigo,
              cuentaNombre: l.cuentaNombre,
              debe: l.debe,
              haber: l.haber,
              conceptoLinea: l.conceptoLinea,
              clienteId: l.clienteId,
            })),
          },
        },
      });

      return {
        recibo,
        asiento,
        totalLiquidado,
        totalAplicado,
        montoExcedenteAnticipo,
        aplicaciones: aplicacionesAProcesar,
      };
    });
  }

  /**
   * Anula un Recibo de Caja, revirtiendo aplicaciones, restaurando saldos y generando asiento de reversión.
   */
  async anularReciboCaja(empresaId: string, reciboId: string, usuarioId: string, motivo: string) {
    if (!motivo || !motivo.trim()) {
      throw new BadRequestException('Debe indicar el motivo de la anulación del recibo de caja.');
    }

    const recibo = await this.prisma.reciboCaja.findUnique({
      where: { id: reciboId },
      include: {
        aplicaciones: true,
        anticiposGenerados: true,
      },
    });

    if (!recibo) throw new NotFoundException('Recibo de caja no encontrado');
    if (recibo.estado === 'ANULADO') throw new BadRequestException('El recibo de caja ya fue anulado previamente.');

    // Verificar si el anticipo generado ya fue consumido
    if (recibo.anticiposGenerados && recibo.anticiposGenerados.length > 0) {
      for (const ant of recibo.anticiposGenerados) {
        if (Number(ant.saldoDisponible) < Number(ant.montoOriginal)) {
          throw new BadRequestException(
            'No se puede anular este recibo porque el anticipo generado ya fue aplicado parcialmente a otras operaciones.'
          );
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Restaurar saldos de facturas aplicadas
      for (const app of recibo.aplicaciones) {
        if (app.tipoDocumento === 'FACTURA' && app.facturaId) {
          const fac = await tx.factura.findUnique({ where: { id: app.facturaId } });
          if (fac) {
            const saldoRestaurado = Number(fac.saldoPendiente) + Number(app.montoCapitalAplicado);
            await tx.factura.update({
              where: { id: app.facturaId },
              data: {
                saldoPendiente: saldoRestaurado,
                estadoCxc: saldoRestaurado >= Number(fac.total) ? 'PENDIENTE' : 'PARCIAL',
                estado: 'PENDIENTE',
              },
            });
          }
        } else if (app.tipoDocumento === 'NOTA_DEBITO' && app.notaDebitoId) {
          const nd = await tx.notaDebito.findUnique({ where: { id: app.notaDebitoId } });
          if (nd) {
            const saldoRestaurado = Number(nd.saldoPendiente) + Number(app.montoCapitalAplicado);
            await tx.notaDebito.update({
              where: { id: app.notaDebitoId },
              data: {
                saldoPendiente: saldoRestaurado,
                estado: saldoRestaurado >= Number(nd.total) ? 'PENDIENTE' : 'PARCIAL',
              },
            });
          }
        } else if (app.tipoDocumento === 'CUOTA_ARREGLO' && app.cuotaArregloId) {
          const cuota = await tx.arregloPagoCuota.findUnique({ where: { id: app.cuotaArregloId } });
          if (cuota) {
            const saldoRestaurado = Number(cuota.saldoCuota) + Number(app.montoCapitalAplicado);
            await tx.arregloPagoCuota.update({
              where: { id: app.cuotaArregloId },
              data: {
                saldoCuota: saldoRestaurado,
                estado: 'PENDIENTE',
                fechaPagoTotal: null,
              },
            });
          }
        }
      }

      // 2. Anular anticipos generados
      if (recibo.anticiposGenerados) {
        for (const ant of recibo.anticiposGenerados) {
          await tx.anticipoCliente.update({
            where: { id: ant.id },
            data: { estado: 'DEVUELTO', saldoDisponible: 0 },
          });
        }
      }

      // 3. Marcar recibo como anulado
      const reciboAnulado = await tx.reciboCaja.update({
        where: { id: reciboId },
        data: {
          estado: 'ANULADO',
          motivoAnulacion: motivo,
          anuladoPorId: usuarioId,
          fechaAnulacion: new Date(),
        },
      });

      // 4. Crear Asiento de Reversión
      const numeroAsiento = await this.generarSiguienteNumeroAsiento(empresaId);
      const cuentaCajaBanco = recibo.metodoPago === 'EFECTIVO' ? '1.1.01.001' : '1.1.02.001';
      const montoEfectivo = Number(recibo.montoEfectivoBancos);
      const montoRetIr = Number(recibo.montoRetencionIr);
      const montoRetImi = Number(recibo.montoRetencionImi);
      const totalAplicado = Number(recibo.totalAplicadoDocumentos);
      const montoExcedente = Number(recibo.montoExcedenteAnticipo);

      const lineasReversion: Array<{
        cuentaCodigo: string;
        cuentaNombre: string;
        debe: number;
        haber: number;
        conceptoLinea: string;
        clienteId?: string;
      }> = [];

      // Debe: Clientes 1.1.05.001 (restitución de cuenta por cobrar)
      if (totalAplicado > 0) {
        lineasReversion.push({
          cuentaCodigo: '1.1.05.001',
          cuentaNombre: 'Clientes – cuentas por cobrar (control)',
          debe: totalAplicado,
          haber: 0,
          conceptoLinea: `Reversión anulación Recibo ${recibo.numeroRecibo}`,
          clienteId: recibo.clienteId,
        });
      }

      // Debe: Anticipos 2.1.06.001 (reversión de anticipo)
      if (montoExcedente > 0) {
        lineasReversion.push({
          cuentaCodigo: '2.1.06.001',
          cuentaNombre: 'Anticipos recibidos de clientes',
          debe: montoExcedente,
          haber: 0,
          conceptoLinea: `Reversión anticipo Recibo ${recibo.numeroRecibo}`,
          clienteId: recibo.clienteId,
        });
      }

      // Haber: Caja/Banco
      if (montoEfectivo > 0) {
        lineasReversion.push({
          cuentaCodigo: cuentaCajaBanco,
          cuentaNombre: 'Caja/Banco Reversión',
          debe: 0,
          haber: montoEfectivo,
          conceptoLinea: `Reversión cobro Recibo ${recibo.numeroRecibo}`,
        });
      }

      // Haber: Retención IR
      if (montoRetIr > 0) {
        lineasReversion.push({
          cuentaCodigo: '1.1.07.003',
          cuentaNombre: 'Retenciones IR 2% a favor',
          debe: 0,
          haber: montoRetIr,
          conceptoLinea: `Reversión Ret. IR Recibo ${recibo.numeroRecibo}`,
          clienteId: recibo.clienteId,
        });
      }

      // Haber: Retención IMI
      if (montoRetImi > 0) {
        lineasReversion.push({
          cuentaCodigo: '1.1.07.004',
          cuentaNombre: 'Retenciones IMI 1% a favor',
          debe: 0,
          haber: montoRetImi,
          conceptoLinea: `Reversión Ret. IMI Recibo ${recibo.numeroRecibo}`,
          clienteId: recibo.clienteId,
        });
      }

      const totalDebe = lineasReversion.reduce((s, l) => s + l.debe, 0);
      const totalHaber = lineasReversion.reduce((s, l) => s + l.haber, 0);

      await tx.asientoContable.create({
        data: {
          empresaId,
          sucursalId: recibo.sucursalId,
          numeroAsiento,
          fecha: new Date(),
          tipoAsiento: 'CXC_REVERSION',
          origenModulo: 'CXC',
          documentoReferencia: recibo.numeroRecibo,
          concepto: `Reversión por anulación de Recibo ${recibo.numeroRecibo}: ${motivo}`,
          totalDebe,
          totalHaber,
          cuadrado: Math.abs(totalDebe - totalHaber) < 0.01,
          estado: 'PUBLICADO',
          creadoPorId: usuarioId,
          lineas: {
            create: lineasReversion.map((l) => ({
              cuentaCodigo: l.cuentaCodigo,
              cuentaNombre: l.cuentaNombre,
              debe: l.debe,
              haber: l.haber,
              conceptoLinea: l.conceptoLinea,
              clienteId: l.clienteId,
            })),
          },
        },
      });

      return reciboAnulado;
    });
  }

  /**
   * Consulta el listado de recibos de caja con filtros y paginación.
   */
  async listarRecibos(
    empresaId: string,
    filtrosOrSucursalId?: string | { sucursalId?: string; clienteId?: string; estado?: any },
    clienteId?: string,
  ) {
    const where: any = { empresaId };
    if (typeof filtrosOrSucursalId === 'string') {
      if (filtrosOrSucursalId) where.sucursalId = filtrosOrSucursalId;
      if (clienteId) where.clienteId = clienteId;
    } else if (filtrosOrSucursalId && typeof filtrosOrSucursalId === 'object') {
      if (filtrosOrSucursalId.sucursalId) where.sucursalId = filtrosOrSucursalId.sucursalId;
      if (filtrosOrSucursalId.clienteId) where.clienteId = filtrosOrSucursalId.clienteId;
      if (filtrosOrSucursalId.estado) where.estado = filtrosOrSucursalId.estado;
    }

    return this.prisma.reciboCaja.findMany({
      where,
      include: {
        cliente: true,
        sucursal: true,
        creadoPor: { select: { nombre: true, apellido: true } },
        aplicaciones: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Obtiene el detalle de un recibo de caja para impresión o consulta.
   */
  async getReciboPorId(id: string) {
    const recibo = await this.prisma.reciboCaja.findUnique({
      where: { id },
      include: {
        cliente: true,
        sucursal: true,
        empresa: true,
        creadoPor: { select: { nombre: true, apellido: true } },
        anuladoPor: { select: { nombre: true, apellido: true } },
        aplicaciones: {
          include: {
            factura: true,
            notaDebito: true,
            cuotaArreglo: true,
          },
        },
      },
    });

    if (!recibo) throw new NotFoundException('Recibo de caja no encontrado');
    return recibo;
  }

  async obtenerReciboPorId(empresaId: string, id: string) {
    return this.getReciboPorId(id);
  }

  async crearRecibo(empresaId: string, dto: CreateReciboCajaDto, usuarioId?: string) {
    return this.crearReciboCaja(empresaId, usuarioId || '', dto);
  }

  async anularRecibo(empresaId: string, reciboId: string, motivo: string, usuarioId?: string) {
    return this.anularReciboCaja(empresaId, reciboId, usuarioId || '', motivo);
  }
}
