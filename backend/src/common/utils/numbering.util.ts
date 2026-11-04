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
  if (tx.serieDocumento?.findFirst) {
    const serieActiva = await tx.serieDocumento.findFirst({
      where: {
        empresaId,
        sucursalId: sucursalId || null,
        tipoDocumento: 'COTIZACION',
        estado: 'ACTIVA',
      },
    });

    if (serieActiva) {
      if (tx.$queryRaw) {
        await tx.$queryRaw`SELECT id FROM "series_documento" WHERE id = ${serieActiva.id} FOR UPDATE`;
      }
      const serieActual = tx.serieDocumento.findUnique
        ? await tx.serieDocumento.findUnique({ where: { id: serieActiva.id } })
        : serieActiva;
      const anioActual = new Date().getFullYear();
      let numeroBase = serieActual.numeroActual;
      if (serieActual.reiniciaPorAnio && serieActual.anioActual !== anioActual) {
        numeroBase = Math.max(0, serieActual.numeroDesde - 1);
      }
      const siguiente = Math.max(numeroBase + 1, serieActual.numeroDesde);
      if (siguiente > serieActual.numeroHasta) {
        await tx.serieDocumento.update({
          where: { id: serieActiva.id },
          data: { estado: 'AGOTADA' },
        });
        throw new BadRequestException(
          `La serie de numeración para COTIZACION se ha agotado. Rango permitido: ${serieActiva.numeroHasta}.`,
        );
      }

      await tx.serieDocumento.update({
        where: { id: serieActiva.id },
        data: {
          numeroActual: siguiente,
          anioActual: serieActiva.reiniciaPorAnio ? anioActual : serieActiva.anioActual,
          estado: siguiente === serieActiva.numeroHasta ? 'AGOTADA' : serieActiva.estado,
        },
      });

      const codigo = formatDocumentNumberCode({
        prefijo: serieActiva.prefijo,
        serie: serieActiva.serie,
        plantilla: serieActiva.plantilla,
        relleno: serieActiva.relleno,
        numero: siguiente,
        anio: anioActual,
      });

      if (tx.serieDocumentoUso?.create) {
        await tx.serieDocumentoUso.create({
          data: {
            serieId: serieActiva.id,
            numero: siguiente,
            codigoFormateado: codigo,
            tipoDocumento: 'COTIZACION',
            usuarioId: usuarioId || null,
          },
        });
      }
      return codigo;
    }
  }

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
  if (tx.serieDocumento?.findFirst) {
    const serieActiva = await tx.serieDocumento.findFirst({
      where: {
        ...(empresaId ? { empresaId } : {}),
        tipoDocumento: 'CONTRATO',
        estado: 'ACTIVA',
      },
    });

    if (serieActiva) {
      if (tx.$queryRaw) {
        await tx.$queryRaw`SELECT id FROM "series_documento" WHERE id = ${serieActiva.id} FOR UPDATE`;
      }
      const serieActual = tx.serieDocumento.findUnique
        ? await tx.serieDocumento.findUnique({ where: { id: serieActiva.id } })
        : serieActiva;
      const anioActual = year;
      let numeroBase = serieActual.numeroActual;
      if (serieActual.reiniciaPorAnio && serieActual.anioActual !== anioActual) {
        numeroBase = Math.max(0, serieActual.numeroDesde - 1);
      }
      let siguiente = Math.max(numeroBase + 1, serieActual.numeroDesde);
      while (siguiente <= serieActual.numeroHasta && tx.contrato?.findUnique) {
        const candidato = formatDocumentNumberCode({
          prefijo: serieActiva.prefijo,
          serie: serieActiva.serie,
          plantilla: serieActiva.plantilla,
          relleno: serieActiva.relleno,
          numero: siguiente,
          anio: anioActual,
        });
        const existente = await tx.contrato.findUnique({
          where: { codigo: candidato }, select: { id: true },
        });
        if (!existente) break;
        siguiente++;
      }
      if (siguiente > serieActual.numeroHasta) {
        await tx.serieDocumento.update({
          where: { id: serieActiva.id },
          data: { estado: 'AGOTADA' },
        });
        throw new BadRequestException(
          `La serie de numeración para CONTRATO se ha agotado. Rango permitido: ${serieActiva.numeroHasta}.`,
        );
      }

      await tx.serieDocumento.update({
        where: { id: serieActiva.id },
        data: {
          numeroActual: siguiente,
          anioActual: serieActiva.reiniciaPorAnio ? anioActual : serieActiva.anioActual,
          estado: siguiente === serieActiva.numeroHasta ? 'AGOTADA' : serieActiva.estado,
        },
      });

      const codigo = formatDocumentNumberCode({
        prefijo: serieActiva.prefijo,
        serie: serieActiva.serie,
        plantilla: serieActiva.plantilla,
        relleno: serieActiva.relleno,
        numero: siguiente,
        anio: anioActual,
      });

      if (tx.serieDocumentoUso?.create) {
        await tx.serieDocumentoUso.create({
          data: {
            serieId: serieActiva.id,
            numero: siguiente,
            codigoFormateado: codigo,
            tipoDocumento: 'CONTRATO',
            usuarioId: usuarioId || null,
          },
        });
      }
      return codigo;
    }
  }

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
 * SOL-DESP-0001. Garantiza unicidad global en solicitudes_despacho.codigo,
 * saltando cualquier folio ocupado tras eliminaciones, concurrencia o multi-tenant.
 */
export async function nextDispatchRequestCode(
  tx: SequenceClient,
  empresaId: string,
  initialCount?: number,
): Promise<string> {
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
 * SOL-RET-0001. Garantiza unicidad global en solicitudes_retorno.codigo.
 */
export async function nextReturnRequestCode(
  tx: SequenceClient,
  empresaId: string,
  initialCount?: number,
): Promise<string> {
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
