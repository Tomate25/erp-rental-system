import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

/** Clave de empresa para contadores compartidos por todos los tenants. */
export const SECUENCIA_GLOBAL = 'GLOBAL';

type SequenceClient = any;

export function formatDocumentNumberCode(params: {
  prefijo?: string | null;
  serie?: string | null;
  plantilla?: string | null;
  relleno?: number;
  numero: number;
  anio?: number;
}): string {
  const {
    prefijo,
    serie,
    plantilla,
    relleno = 6,
    numero,
    anio = new Date().getFullYear(),
  } = params;
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
 * Incrementa y devuelve el siguiente valor de una secuencia de forma atómica.
 */
export async function nextSequenceValue(
  tx: SequenceClient,
  empresaId: string,
  tipo: string,
): Promise<number> {
  const fila = await tx.secuenciaNumeracion.upsert({
    where: { empresaId_tipo: { empresaId, tipo } },
    create: { empresaId, tipo, ultimoValor: 1 },
    update: { ultimoValor: { increment: 1 } },
    select: { ultimoValor: true },
  });
  return fila.ultimoValor;
}

interface ActiveSeriesNextOptions {
  empresaId?: string | null;
  sucursalId?: string | null;
  tipoDocumento: string;
  anio?: number;
  usuarioId?: string | null;
  documentoId?: string | null;
  isOccupied?: (candidato: string) => Promise<boolean>;
}

/**
 * Consume de forma atómica el siguiente folio de una SerieDocumento ACTIVA
 * (priorizando la serie de sucursal y luego la serie global de empresa).
 * Retorna null si no existe SerieDocumento ACTIVA configurada.
 */
export async function nextFromActiveSerieDocumento(
  tx: SequenceClient,
  options: ActiveSeriesNextOptions,
): Promise<string | null> {
  if (!tx?.serieDocumento?.findFirst) {
    return null;
  }

  const {
    empresaId,
    sucursalId,
    tipoDocumento,
    anio = new Date().getFullYear(),
    usuarioId,
    documentoId,
    isOccupied,
  } = options;

  let serieActiva: any = null;
  if (sucursalId) {
    serieActiva = await tx.serieDocumento.findFirst({
      where: {
        ...(empresaId ? { empresaId } : {}),
        sucursalId,
        tipoDocumento,
        estado: 'ACTIVA',
      },
    });
    if (!serieActiva) {
      serieActiva = await tx.serieDocumento.findFirst({
        where: {
          ...(empresaId ? { empresaId } : {}),
          sucursalId: null,
          tipoDocumento,
          estado: 'ACTIVA',
        },
      });
    }
  } else {
    serieActiva = await tx.serieDocumento.findFirst({
      where: {
        ...(empresaId ? { empresaId } : {}),
        tipoDocumento,
        estado: 'ACTIVA',
      },
    });
  }

  if (!serieActiva) {
    return null;
  }

  if (tx.$queryRaw) {
    await tx.$queryRaw`SELECT id FROM "series_documento" WHERE id = ${serieActiva.id} FOR UPDATE`;
  }

  const serieActual = tx.serieDocumento.findUnique
    ? (await tx.serieDocumento.findUnique({ where: { id: serieActiva.id } })) || serieActiva
    : serieActiva;

  let numeroBase = serieActual.numeroActual;
  if (serieActual.reiniciaPorAnio && serieActual.anioActual !== anio) {
    numeroBase = Math.max(0, serieActual.numeroDesde - 1);
  }

  let siguiente = Math.max(numeroBase + 1, serieActual.numeroDesde);
  let attempts = 0;
  while (siguiente <= serieActual.numeroHasta && isOccupied && attempts < 200) {
    const candidato = formatDocumentNumberCode({
      prefijo: serieActual.prefijo,
      serie: serieActual.serie,
      plantilla: serieActual.plantilla,
      relleno: serieActual.relleno,
      numero: siguiente,
      anio,
    });
    if (!(await isOccupied(candidato))) {
      break;
    }
    siguiente++;
    attempts++;
  }

  if (siguiente > serieActual.numeroHasta) {
    await tx.serieDocumento.update({
      where: { id: serieActual.id },
      data: { estado: 'AGOTADA' },
    });
    throw new BadRequestException(
      `La serie de numeración para ${tipoDocumento} se ha agotado. Rango permitido: ${serieActual.numeroHasta}.`,
    );
  }

  await tx.serieDocumento.update({
    where: { id: serieActual.id },
    data: {
      numeroActual: siguiente,
      anioActual: serieActual.reiniciaPorAnio ? anio : serieActual.anioActual,
      estado: siguiente === serieActual.numeroHasta ? 'AGOTADA' : serieActual.estado,
    },
  });

  const codigo = formatDocumentNumberCode({
    prefijo: serieActual.prefijo,
    serie: serieActual.serie,
    plantilla: serieActual.plantilla,
    relleno: serieActual.relleno,
    numero: siguiente,
    anio,
  });

  if (tx.serieDocumentoUso?.create) {
    await tx.serieDocumentoUso.create({
      data: {
        serieId: serieActual.id,
        numero: siguiente,
        codigoFormateado: codigo,
        tipoDocumento,
        documentoId: documentoId || null,
        usuarioId: usuarioId || null,
      },
    });
  }

  return codigo;
}

/**
 * COT-0001, por empresa.
 * Usa SerieDocumento activa si está configurada; de lo contrario recurre a secuenciaNumeracion.
 */
export async function nextQuoteNumber(
  tx: SequenceClient,
  empresaId: string,
  sucursalId?: string | null,
  usuarioId?: string | null,
): Promise<string> {
  const fromSerie = await nextFromActiveSerieDocumento(tx, {
    empresaId,
    sucursalId,
    tipoDocumento: 'COTIZACION',
    usuarioId,
    isOccupied: tx.cotizacion?.findFirst
      ? async (candidato) =>
          Boolean(
            await tx.cotizacion.findFirst({
              where: { empresaId, numeroCotizacion: candidato },
              select: { id: true },
            }),
          )
      : undefined,
  });
  if (fromSerie) return fromSerie;

  const n = await nextSequenceValue(tx, empresaId, 'COTIZACION');
  return `COT-${n.toString().padStart(4, '0')}`;
}

/**
 * CTR-2026-0001. Contador global por año.
 * Usa SerieDocumento activa si está configurada; de lo contrario recurre a secuenciaNumeracion.
 */
export async function nextContractCode(
  tx: SequenceClient,
  year: number = new Date().getFullYear(),
  empresaId?: string | null,
  sucursalId?: string | null,
  usuarioId?: string | null,
): Promise<string> {
  const fromSerie = await nextFromActiveSerieDocumento(tx, {
    empresaId,
    sucursalId,
    tipoDocumento: 'CONTRATO',
    anio: year,
    usuarioId,
    isOccupied: tx.contrato?.findUnique
      ? async (candidato) =>
          Boolean(
            await tx.contrato.findUnique({
              where: { codigo: candidato },
              select: { id: true },
            }),
          )
      : undefined,
  });
  if (fromSerie) return fromSerie;

  let prevN = -1;
  let n: number;
  let codigo: string;
  do {
    n = await nextSequenceValue(tx, SECUENCIA_GLOBAL, `CONTRATO:${year}`);
    codigo = `CTR-${year}-${n.toString().padStart(4, '0')}`;
    if (n <= prevN) break;
    prevN = n;
  } while (
    tx.contrato?.findUnique &&
    (await tx.contrato.findUnique({ where: { codigo }, select: { id: true } }))
  );
  return codigo;
}

/**
 * SOL-DESP-0001. Usa SerieDocumento activa si está configurada; de lo contrario
 * garantiza unicidad global en solicitudes_despacho.codigo.
 */
export async function nextDispatchRequestCode(
  tx: SequenceClient,
  empresaId: string,
  initialCount?: number,
  sucursalId?: string | null,
  usuarioId?: string | null,
): Promise<string> {
  const fromSerie = await nextFromActiveSerieDocumento(tx, {
    empresaId,
    sucursalId,
    tipoDocumento: 'SOL_DESPACHO',
    usuarioId,
    isOccupied: tx.solicitudDespacho?.findUnique
      ? async (candidato) => {
          const ex = await tx.solicitudDespacho.findUnique({
            where: { codigo: candidato },
            select: { id: true, codigo: true },
          });
          return Boolean(ex && (!ex.codigo || ex.codigo === candidato));
        }
      : undefined,
  });
  if (fromSerie) return fromSerie;

  const count =
    initialCount !== undefined
      ? initialCount
      : tx.solicitudDespacho?.count
        ? await tx.solicitudDespacho.count({ where: { empresaId } })
        : 0;
  let n = count + 1;
  let attempts = 0;
  while (tx.solicitudDespacho?.findUnique && attempts < 200) {
    const candidato = `SOL-DESP-${n.toString().padStart(4, '0')}`;
    const existente = await tx.solicitudDespacho.findUnique({
      where: { codigo: candidato },
      select: { id: true, codigo: true },
    });
    if (!existente || (existente.codigo && existente.codigo !== candidato)) {
      return candidato;
    }
    n++;
    attempts++;
  }
  return `SOL-DESP-${n.toString().padStart(4, '0')}`;
}

/**
 * SOL-RET-0001. Usa SerieDocumento activa si está configurada; de lo contrario
 * garantiza unicidad global en solicitudes_retorno.codigo.
 */
export async function nextReturnRequestCode(
  tx: SequenceClient,
  empresaId: string,
  initialCount?: number,
  sucursalId?: string | null,
  usuarioId?: string | null,
): Promise<string> {
  const fromSerie = await nextFromActiveSerieDocumento(tx, {
    empresaId,
    sucursalId,
    tipoDocumento: 'SOL_RETORNO',
    usuarioId,
    isOccupied: tx.solicitudRetorno?.findUnique
      ? async (candidato) => {
          const ex = await tx.solicitudRetorno.findUnique({
            where: { codigo: candidato },
            select: { id: true, codigo: true },
          });
          return Boolean(ex && (!ex.codigo || ex.codigo === candidato));
        }
      : undefined,
  });
  if (fromSerie) return fromSerie;

  const count =
    initialCount !== undefined
      ? initialCount
      : tx.solicitudRetorno?.count
        ? await tx.solicitudRetorno.count({ where: { empresaId } })
        : 0;
  let n = count + 1;
  let attempts = 0;
  while (tx.solicitudRetorno?.findUnique && attempts < 200) {
    const candidato = `SOL-RET-${n.toString().padStart(4, '0')}`;
    const existente = await tx.solicitudRetorno.findUnique({
      where: { codigo: candidato },
      select: { id: true, codigo: true },
    });
    if (!existente || (existente.codigo && existente.codigo !== candidato)) {
      return candidato;
    }
    n++;
    attempts++;
  }
  return `SOL-RET-${n.toString().padStart(4, '0')}`;
}
