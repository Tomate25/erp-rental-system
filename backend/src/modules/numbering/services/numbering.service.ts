import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import {
  Prisma,
  TipoDocumentoSerie,
  EstadoSerieDocumento,
  SerieDocumento,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSerieDto } from '../dto/create-serie.dto';
import { UpdateSerieDto } from '../dto/update-serie.dto';
import { QuerySeriesDto } from '../dto/query-series.dto';
import { PreviewSerieDto } from '../dto/preview-serie.dto';
import { nextSequenceValue } from '../../../common/utils/numbering.util';

export interface NextNumberParams {
  empresaId: string;
  sucursalId?: string | null;
  tipoDocumento: TipoDocumentoSerie;
  documentoId?: string | null;
  usuarioId?: string | null;
}

export interface FormattedNumberParts {
  prefijo?: string | null;
  serie: string;
  plantilla?: string | null;
  relleno?: number;
  numero: number;
  anio?: number;
}

@Injectable()
export class NumberingService {
  private readonly logger = new Logger(NumberingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Da formato al número de documento según la plantilla o formato estándar.
   */
  formatDocumentCode(params: FormattedNumberParts): string {
    const { prefijo, serie, plantilla, relleno = 6, numero, anio = new Date().getFullYear() } = params;
    const padded = String(numero).padStart(relleno, '0');

    if (plantilla && plantilla.trim().length > 0) {
      return plantilla
        .replace(/{prefijo}/gi, prefijo || '')
        .replace(/{serie}/gi, serie || '')
        .replace(/{numero}/gi, padded)
        .replace(/{anio}/gi, String(anio))
        .replace(/--+/g, '-')
        .replace(/^-|-$/g, '');
    }

    // Formato estándar limpio: [prefijo, serie, padded].
    // Si serie ya contiene el prefijo (ej. prefijo: FAC, serie: FAC-KM10), evitamos duplicar.
    const parts: string[] = [];
    const prefijoLimpio = prefijo?.trim() || '';
    const serieLimpia = serie?.trim() || '';

    if (prefijoLimpio && !serieLimpia.startsWith(prefijoLimpio)) {
      parts.push(prefijoLimpio);
    }
    if (serieLimpia) {
      parts.push(serieLimpia);
    }
    parts.push(padded);

    return parts.filter(Boolean).join('-');
  }

  /**
   * Genera el siguiente número oficial de la serie dentro de una transacción.
   * Aplica bloqueo pesimista a nivel de fila (FOR UPDATE) para serializar la concurrencia.
   * Si la serie se agota (numeroActual > numeroHasta), bloquea la emisión con BadRequestException.
   */
  async next(
    tx: Prisma.TransactionClient,
    params: NextNumberParams,
  ): Promise<string> {
    const { empresaId, sucursalId, tipoDocumento, documentoId, usuarioId } = params;

    if (!tx.serieDocumento?.findFirst) {
      return this.fallbackNext(tx, empresaId, tipoDocumento);
    }

    // 1. Buscar serie activa específica de la sucursal o fallback a nivel de empresa
    let serieActiva: SerieDocumento | null = null;

    if (sucursalId) {
      serieActiva = await tx.serieDocumento.findFirst({
        where: {
          empresaId,
          sucursalId,
          tipoDocumento,
          estado: EstadoSerieDocumento.ACTIVA,
        },
      });
    }

    if (!serieActiva) {
      serieActiva = await tx.serieDocumento.findFirst({
        where: {
          empresaId,
          sucursalId: null,
          tipoDocumento,
          estado: EstadoSerieDocumento.ACTIVA,
        },
      });
    }

    // 2. Si no existe serie configurada en este tenant, recurrir al generador de secuencias legacy
    if (!serieActiva) {
      this.logger.warn(
        `No se encontró SerieDocumento ACTIVA para empresa=${empresaId}, tipo=${tipoDocumento}, sucursal=${sucursalId || 'GLOBAL'}. Usando secuencia atómica de respaldo.`,
      );
      return this.fallbackNext(tx, empresaId, tipoDocumento);
    }

    // 3. Bloqueo pesimista exclusivo en PostgreSQL sobre la fila de la serie activa
    const filas = await tx.$queryRaw<
      Array<{
        id: string;
        numero_actual: number;
        numero_desde: number;
        numero_hasta: number;
        reinicia_por_anio: boolean;
        anio_actual: number | null;
        prefijo: string | null;
        serie: string;
        plantilla: string | null;
        relleno: number;
        alerta_porcentaje: number;
      }>
    >`SELECT id, numero_actual, numero_desde, numero_hasta, reinicia_por_anio, anio_actual, prefijo, serie, plantilla, relleno, alerta_porcentaje FROM "series_documento" WHERE id = ${serieActiva.id} FOR UPDATE`;

    if (!filas || filas.length === 0) {
      throw new NotFoundException(`La serie seleccionada ${serieActiva.id} ya no está disponible.`);
    }

    const serieRow = filas[0];
    const anioActual = new Date().getFullYear();
    let numeroBase = serieRow.numero_actual;

    // Reinicio anual automático si la serie está configurada para reiniciar cada año
    if (serieRow.reinicia_por_anio && serieRow.anio_actual !== anioActual) {
      numeroBase = Math.max(0, serieRow.numero_desde - 1);
    }

    let siguienteNumero = Math.max(numeroBase + 1, serieRow.numero_desde);
    let attempts = 0;
    while (siguienteNumero <= serieRow.numero_hasta && attempts < 200) {
      const candidato = this.formatDocumentCode({
        prefijo: serieRow.prefijo,
        serie: serieRow.serie,
        plantilla: serieRow.plantilla,
        relleno: serieRow.relleno,
        numero: siguienteNumero,
        anio: anioActual,
      });
      let ocupado = false;
      if (
        (tipoDocumento === TipoDocumentoSerie.FACTURA ||
          tipoDocumento === TipoDocumentoSerie.FACTURA_DANIO) &&
        (tx as any).factura?.findUnique
      ) {
        const ex = await (tx as any).factura.findUnique({
          where: { folio: candidato },
          select: { id: true, folio: true },
        });
        ocupado = Boolean(ex && (!ex.folio || ex.folio === candidato));
      } else if (
        tipoDocumento === TipoDocumentoSerie.RECIBO_CAJA &&
        (tx as any).reciboCaja?.findUnique
      ) {
        const ex = await (tx as any).reciboCaja.findUnique({
          where: { numeroRecibo: candidato },
          select: { id: true, numeroRecibo: true },
        });
        ocupado = Boolean(ex && (!ex.numeroRecibo || ex.numeroRecibo === candidato));
      } else if (
        tipoDocumento === TipoDocumentoSerie.NOTA_DEBITO &&
        (tx as any).notaDebito?.findUnique
      ) {
        const ex = await (tx as any).notaDebito.findUnique({
          where: { numeroNota: candidato },
          select: { id: true, numeroNota: true },
        });
        ocupado = Boolean(ex && (!ex.numeroNota || ex.numeroNota === candidato));
      } else if (
        tipoDocumento === TipoDocumentoSerie.CONTRATO &&
        (tx as any).contrato?.findUnique
      ) {
        const ex = await (tx as any).contrato.findUnique({
          where: { codigo: candidato },
          select: { id: true, codigo: true },
        });
        ocupado = Boolean(ex && (!ex.codigo || ex.codigo === candidato));
      }
      if (!ocupado) break;
      siguienteNumero++;
      attempts++;
    }

    // 4. Bloqueo de emisión si se agota el rango autorizado
    if (siguienteNumero > serieRow.numero_hasta) {
      await tx.serieDocumento.update({
        where: { id: serieRow.id },
        data: { estado: EstadoSerieDocumento.AGOTADA },
      });

      const serieLabel = [serieRow.prefijo, serieRow.serie].filter(Boolean).join('-');
      throw new BadRequestException(
        `La serie de numeración ${serieLabel} para ${tipoDocumento} se ha agotado. Rango autorizado hasta ${serieRow.numero_hasta}. Contacte a Administración para autorizar una nueva serie de folios.`,
      );
    }

    // 5. Actualizar el correlativo actual en la serie
    const nuevoEstado =
      siguienteNumero === serieRow.numero_hasta
        ? EstadoSerieDocumento.AGOTADA
        : EstadoSerieDocumento.ACTIVA;

    await tx.serieDocumento.update({
      where: { id: serieRow.id },
      data: {
        numeroActual: siguienteNumero,
        anioActual: serieRow.reinicia_por_anio ? anioActual : serieRow.anio_actual,
        estado: nuevoEstado,
      },
    });

    // 6. Generar código formateado
    const codigoFormateado = this.formatDocumentCode({
      prefijo: serieRow.prefijo,
      serie: serieRow.serie,
      plantilla: serieRow.plantilla,
      relleno: serieRow.relleno,
      numero: siguienteNumero,
      anio: anioActual,
    });

    // 7. Registrar bitácora de uso oficial
    if (tx.serieDocumentoUso?.create) {
      await tx.serieDocumentoUso.create({
        data: {
          serieId: serieRow.id,
          numero: siguienteNumero,
          codigoFormateado,
          tipoDocumento,
          documentoId: documentoId || null,
          usuarioId: usuarioId || null,
        },
      });
    }

    return codigoFormateado;
  }

  /**
   * Fallback de numeración cuando no hay serie configurada en la BD o en mocks.
   */
  private async fallbackNext(
    tx: Prisma.TransactionClient,
    empresaId: string,
    tipoDocumento: TipoDocumentoSerie,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const hasSeq = Boolean((tx as any)?.secuenciaNumeracion?.upsert);

    switch (tipoDocumento) {
      case TipoDocumentoSerie.COTIZACION: {
        const n = hasSeq ? await nextSequenceValue(tx as any, empresaId, 'COTIZACION') : 1;
        return `COT-${String(n).padStart(4, '0')}`;
      }
      case TipoDocumentoSerie.CONTRATO: {
        const n = hasSeq ? await nextSequenceValue(tx as any, 'GLOBAL', `CONTRATO:${year}`) : 1;
        return `CTR-${year}-${String(n).padStart(4, '0')}`;
      }
      case TipoDocumentoSerie.FACTURA: {
        const n = hasSeq ? await nextSequenceValue(tx as any, empresaId, 'FACTURA') : 1;
        return `FAC-${String(n).padStart(6, '0')}`;
      }
      case TipoDocumentoSerie.FACTURA_DANIO: {
        const n = hasSeq ? await nextSequenceValue(tx as any, empresaId, 'FACTURA_DANIO') : 1;
        return `FAC-DAN-${String(n).padStart(6, '0')}`;
      }
      case TipoDocumentoSerie.RECIBO_CAJA: {
        const n = hasSeq ? await nextSequenceValue(tx as any, empresaId, 'RECIBO_CAJA') : 1;
        return `RC-${String(n).padStart(6, '0')}`;
      }
      case TipoDocumentoSerie.NOTA_DEBITO: {
        const n = hasSeq ? await nextSequenceValue(tx as any, empresaId, 'NOTA_DEBITO') : 1;
        return `ND-${String(n).padStart(6, '0')}`;
      }
      default: {
        const n = hasSeq ? await nextSequenceValue(tx as any, empresaId, String(tipoDocumento)) : 1;
        return `${tipoDocumento}-${String(n).padStart(6, '0')}`;
      }
    }
  }

  /**
   * Obtiene las sucursales de la empresa para asignación de series.
   */
  async getSucursales(empresaId: string) {
    return this.prisma.sucursal.findMany({
      where: { empresaId },
      select: { id: true, nombre: true, codigo: true, direccion: true },
      orderBy: { nombre: 'asc' },
    });
  }

  /**
   * Lista todas las series de una empresa con métricas de consumo y alertas.
   */
  async findAll(empresaId: string, query: QuerySeriesDto) {
    const where: Prisma.SerieDocumentoWhereInput = {
      empresaId,
    };

    if (query.tipoDocumento) {
      where.tipoDocumento = query.tipoDocumento;
    }
    if (query.sucursalId) {
      where.sucursalId = query.sucursalId;
    }
    if (query.estado) {
      where.estado = query.estado;
    }
    if (query.esFiscal !== undefined) {
      where.esFiscal = query.esFiscal;
    }
    if (query.q) {
      const q = query.q.trim();
      where.OR = [
        { serie: { contains: q, mode: 'insensitive' } },
        { prefijo: { contains: q, mode: 'insensitive' } },
        { plantilla: { contains: q, mode: 'insensitive' } },
      ];
    }

    const series = await this.prisma.serieDocumento.findMany({
      where,
      include: {
        sucursal: {
          select: { id: true, nombre: true, codigo: true },
        },
      },
      orderBy: [{ tipoDocumento: 'asc' }, { estado: 'asc' }, { createdAt: 'desc' }],
    });

    const items = series.map((s) => this.calcularMetricas(s));

    const kpis = {
      totalSeries: items.length,
      activas: items.filter((s) => s.estado === EstadoSerieDocumento.ACTIVA).length,
      agotadas: items.filter((s) => s.estado === EstadoSerieDocumento.AGOTADA).length,
      enAlerta: items.filter((s) => s.alertaSuperada && s.estado === EstadoSerieDocumento.ACTIVA).length,
    };

    return { items, kpis };
  }

  /**
   * Obtiene el detalle de una serie con sus últimos usos registrados.
   */
  async findOne(id: string, empresaId: string) {
    const serie = await this.prisma.serieDocumento.findFirst({
      where: { id, empresaId },
      include: {
        sucursal: {
          select: { id: true, nombre: true, codigo: true },
        },
        usos: {
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
      },
    });

    if (!serie) {
      throw new NotFoundException(`Serie con ID ${id} no encontrada en esta empresa`);
    }

    return this.calcularMetricas(serie);
  }

  /**
   * Crea una nueva serie documental.
   */
  async create(empresaId: string, dto: CreateSerieDto, usuarioId?: string) {
    if (dto.numeroHasta < dto.numeroDesde) {
      throw new BadRequestException('El número hasta debe ser mayor o igual al número desde.');
    }

    // Verificar si ya existe serie activa para la misma combinación
    const estado = dto.estado || EstadoSerieDocumento.ACTIVA;
    if (estado === EstadoSerieDocumento.ACTIVA) {
      const existente = await this.prisma.serieDocumento.findFirst({
        where: {
          empresaId,
          sucursalId: dto.sucursalId || null,
          tipoDocumento: dto.tipoDocumento,
          estado: EstadoSerieDocumento.ACTIVA,
        },
      });

      if (existente) {
        throw new ConflictException(
          `Ya existe una serie ACTIVA (${existente.serie}) para ${dto.tipoDocumento} en esta sucursal. Desactívela primero o registre esta nueva serie como INACTIVA.`,
        );
      }
    }

    const numeroActual =
      dto.numeroActual !== undefined
        ? dto.numeroActual
        : Math.max(0, dto.numeroDesde - 1);

    const created = await this.prisma.serieDocumento.create({
      data: {
        empresaId,
        sucursalId: dto.sucursalId || null,
        tipoDocumento: dto.tipoDocumento,
        serie: dto.serie.trim().toUpperCase(),
        prefijo: dto.prefijo ? dto.prefijo.trim().toUpperCase() : null,
        plantilla: dto.plantilla ? dto.plantilla.trim() : null,
        relleno: dto.relleno ?? 6,
        numeroDesde: dto.numeroDesde,
        numeroHasta: dto.numeroHasta,
        numeroActual,
        reiniciaPorAnio: dto.reiniciaPorAnio ?? false,
        anioActual: new Date().getFullYear(),
        esFiscal: dto.esFiscal ?? false,
        alertaPorcentaje: dto.alertaPorcentaje ?? 80,
        estado,
        createdBy: usuarioId || null,
      },
      include: {
        sucursal: {
          select: { id: true, nombre: true, codigo: true },
        },
      },
    });

    return this.calcularMetricas(created);
  }

  /**
   * Modifica una serie existente.
   * Regla de negocio BM: No permitir editar desde/prefijo/serie si ya se emitió el primer número.
   */
  async update(id: string, empresaId: string, dto: UpdateSerieDto) {
    const serie = await this.prisma.serieDocumento.findFirst({
      where: { id, empresaId },
    });

    if (!serie) {
      throw new NotFoundException(`Serie con ID ${id} no encontrada`);
    }

    const yaEmitioFolios = serie.numeroActual >= serie.numeroDesde;

    if (yaEmitioFolios) {
      if (dto.numeroDesde !== undefined && dto.numeroDesde !== serie.numeroDesde) {
        throw new BadRequestException(
          'No se puede modificar el número inicial porque la serie ya tiene folios emitidos.',
        );
      }
      if (dto.prefijo !== undefined && dto.prefijo !== (serie.prefijo || '')) {
        throw new BadRequestException(
          'No se puede modificar el prefijo porque la serie ya tiene folios emitidos.',
        );
      }
      if (dto.serie !== undefined && dto.serie.toUpperCase() !== serie.serie) {
        throw new BadRequestException(
          'No se puede modificar el identificador de serie porque ya tiene folios emitidos.',
        );
      }
    }

    if (dto.numeroHasta !== undefined) {
      if (dto.numeroHasta < serie.numeroActual) {
        throw new BadRequestException(
          `El número hasta (${dto.numeroHasta}) no puede ser menor al número actual ya emitido (${serie.numeroActual}).`,
        );
      }
      if (dto.numeroHasta < serie.numeroDesde) {
        throw new BadRequestException('El número hasta debe ser mayor o igual al número inicial.');
      }
    }

    // Si se activa, verificar que no haya conflicto con otra serie activa
    if (dto.estado === EstadoSerieDocumento.ACTIVA && serie.estado !== EstadoSerieDocumento.ACTIVA) {
      const sucursalTarget = dto.sucursalId !== undefined ? (dto.sucursalId || null) : serie.sucursalId;
      const otraActiva = await this.prisma.serieDocumento.findFirst({
        where: {
          id: { not: serie.id },
          empresaId,
          sucursalId: sucursalTarget,
          tipoDocumento: serie.tipoDocumento,
          estado: EstadoSerieDocumento.ACTIVA,
        },
      });

      if (otraActiva) {
        throw new ConflictException(
          `Ya existe otra serie ACTIVA (${otraActiva.serie}) para ${serie.tipoDocumento} en la misma sucursal. Desactívela primero.`,
        );
      }
    }

    const updated = await this.prisma.serieDocumento.update({
      where: { id },
      data: {
        ...(dto.sucursalId !== undefined && !yaEmitioFolios ? { sucursalId: dto.sucursalId || null } : {}),
        ...(dto.serie && !yaEmitioFolios ? { serie: dto.serie.trim().toUpperCase() } : {}),
        ...(dto.prefijo !== undefined && !yaEmitioFolios ? { prefijo: dto.prefijo ? dto.prefijo.trim().toUpperCase() : null } : {}),
        ...(dto.numeroDesde !== undefined && !yaEmitioFolios ? { numeroDesde: dto.numeroDesde } : {}),
        ...(dto.numeroHasta !== undefined ? { numeroHasta: dto.numeroHasta } : {}),
        ...(dto.plantilla !== undefined ? { plantilla: dto.plantilla ? dto.plantilla.trim() : null } : {}),
        ...(dto.relleno !== undefined ? { relleno: dto.relleno } : {}),
        ...(dto.reiniciaPorAnio !== undefined ? { reiniciaPorAnio: dto.reiniciaPorAnio } : {}),
        ...(dto.esFiscal !== undefined ? { esFiscal: dto.esFiscal } : {}),
        ...(dto.alertaPorcentaje !== undefined ? { alertaPorcentaje: dto.alertaPorcentaje } : {}),
        ...(dto.estado !== undefined ? { estado: dto.estado } : {}),
      },
      include: {
        sucursal: {
          select: { id: true, nombre: true, codigo: true },
        },
      },
    });

    return this.calcularMetricas(updated);
  }

  /**
   * Activa una serie y desactiva atómicamente cualquier otra serie activa del mismo tipo y sucursal.
   */
  async activate(id: string, empresaId: string) {
    return this.prisma.$transaction(async (tx) => {
      const serie = await tx.serieDocumento.findFirst({
        where: { id, empresaId },
      });

      if (!serie) {
        throw new NotFoundException(`Serie con ID ${id} no encontrada`);
      }

      if (serie.numeroActual >= serie.numeroHasta) {
        throw new BadRequestException('No se puede activar una serie que ya tiene el rango agotado.');
      }

      // Desactivar las series activas previas
      await tx.serieDocumento.updateMany({
        where: {
          empresaId,
          sucursalId: serie.sucursalId,
          tipoDocumento: serie.tipoDocumento,
          estado: EstadoSerieDocumento.ACTIVA,
          id: { not: serie.id },
        },
        data: { estado: EstadoSerieDocumento.INACTIVA },
      });

      const updated = await tx.serieDocumento.update({
        where: { id: serie.id },
        data: { estado: EstadoSerieDocumento.ACTIVA },
        include: {
          sucursal: { select: { id: true, nombre: true, codigo: true } },
        },
      });

      return this.calcularMetricas(updated);
    });
  }

  /**
   * Vista previa formateada en tiempo real.
   */
  preview(dto: PreviewSerieDto): { preview: string } {
    const preview = this.formatDocumentCode({
      prefijo: dto.prefijo,
      serie: dto.serie || '001',
      plantilla: dto.plantilla,
      relleno: dto.relleno || 6,
      numero: dto.numero || 1,
      anio: dto.anio || new Date().getFullYear(),
    });
    return { preview };
  }

  /**
   * Calcula porcentaje de consumo, folios disponibles y alertas.
   */
  private calcularMetricas<T extends SerieDocumento>(serie: T) {
    const foliosEmitidos =
      serie.numeroActual >= serie.numeroDesde
        ? serie.numeroActual - serie.numeroDesde + 1
        : 0;
    const totalRango = Math.max(1, serie.numeroHasta - serie.numeroDesde + 1);
    const porcentajeConsumo = Math.min(
      100,
      Math.max(0, Math.round((foliosEmitidos / totalRango) * 100)),
    );
    const foliosDisponibles = Math.max(0, serie.numeroHasta - Math.max(serie.numeroActual, serie.numeroDesde - 1));
    const alertaSuperada = porcentajeConsumo >= serie.alertaPorcentaje;

    const siguienteNumero =
      serie.numeroActual >= serie.numeroDesde
        ? serie.numeroActual + 1
        : serie.numeroDesde;

    const siguientePreview =
      siguienteNumero <= serie.numeroHasta
        ? this.formatDocumentCode({
            prefijo: serie.prefijo,
            serie: serie.serie,
            plantilla: serie.plantilla,
            relleno: serie.relleno,
            numero: siguienteNumero,
            anio: serie.anioActual || new Date().getFullYear(),
          })
        : 'AGOTADO';

    return {
      ...serie,
      foliosEmitidos,
      totalRango,
      porcentajeConsumo,
      foliosDisponibles,
      alertaSuperada,
      siguienteNumero,
      siguientePreview,
    };
  }
}
