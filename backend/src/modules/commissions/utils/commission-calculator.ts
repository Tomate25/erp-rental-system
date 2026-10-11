import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface TramoConfig {
  orden: number;
  desdeExcl: number;
  hastaIncl: number | null;
  porcentaje: number; // Ej: 3.0 para 3%
}

export interface ResultadoTramo {
  orden: number;
  desdeExcl: number;
  hastaIncl: number | null;
  porcentaje: number;
  montoEnTramo: number;
  comisionTramo: number;
}

export interface ResultadoCalculoComision {
  comisionCalculada: number;
  tramos: ResultadoTramo[];
}

export function roundHalfUp2(val: number | Prisma.Decimal): number {
  const d = new Prisma.Decimal(typeof val === 'number' ? val : val.toString());
  return d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Valida que una lista de tramos cumpla las reglas V1-V4:
 * - Al menos 1 tramo
 * - Tramos ordenados, contiguos sin huecos ni traslapes
 * - Tramo 1 empieza en 0
 * - El último tramo es abierto (hastaIncl == null)
 * - Porcentajes válidos entre 0 y 100
 */
export function validateTramos(tramos: TramoConfig[]): void {
  if (!tramos || tramos.length === 0) {
    throw new BadRequestException('El plan debe tener al menos un tramo configurado.');
  }

  const sorted = [...tramos].sort((a, b) => a.orden - b.orden);

  if (sorted[0].desdeExcl !== 0) {
    throw new BadRequestException('El primer tramo debe iniciar en 0.00 (desdeExcl = 0).');
  }

  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];

    if (t.porcentaje < 0 || t.porcentaje > 100) {
      throw new BadRequestException(
        `El porcentaje del tramo ${t.orden} debe estar entre 0% y 100% (recibido ${t.porcentaje}%).`,
      );
    }

    if (i < sorted.length - 1) {
      if (t.hastaIncl === null || t.hastaIncl === undefined) {
        throw new BadRequestException(
          `Solo el último tramo puede tener límite superior abierto (tramo ${t.orden}).`,
        );
      }
      if (t.hastaIncl <= t.desdeExcl) {
        throw new BadRequestException(
          `El límite superior (hastaIncl = ${t.hastaIncl}) debe ser mayor que el inferior (desdeExcl = ${t.desdeExcl}) en tramo ${t.orden}.`,
        );
      }
      const next = sorted[i + 1];
      if (t.hastaIncl !== next.desdeExcl) {
        throw new BadRequestException(
          `Existe un hueco o traslape entre el tramo ${t.orden} (hasta ${t.hastaIncl}) y el tramo ${next.orden} (desde ${next.desdeExcl}).`,
        );
      }
    } else {
      if (t.hastaIncl !== null && t.hastaIncl !== undefined) {
        throw new BadRequestException(
          `El último tramo (tramo ${t.orden}) debe ser abierto (hastaIncl = null).`,
        );
      }
    }
  }
}

/**
 * Calcula la comisión mensual sobre una base neta sin IVA según el método especificado.
 */
export function calcularComision(
  baseInput: number | Prisma.Decimal | string,
  tramos: TramoConfig[],
  metodo: 'TRAMO_UNICO' | 'ESCALONADO',
): ResultadoCalculoComision {
  const baseNum = typeof baseInput === 'number'
    ? baseInput
    : Number(baseInput?.toString() || 0);

  if (!Number.isFinite(baseNum) || baseNum <= 0) {
    return {
      comisionCalculada: 0,
      tramos: [],
    };
  }

  validateTramos(tramos);
  const sorted = [...tramos].sort((a, b) => a.orden - b.orden);

  if (metodo === 'TRAMO_UNICO') {
    const t = sorted.find(
      (tramo) =>
        baseNum > tramo.desdeExcl &&
        (tramo.hastaIncl === null || baseNum <= tramo.hastaIncl),
    );

    if (!t) {
      return {
        comisionCalculada: 0,
        tramos: [],
      };
    }

    const comision = roundHalfUp2((baseNum * t.porcentaje) / 100);
    return {
      comisionCalculada: comision,
      tramos: [
        {
          orden: t.orden,
          desdeExcl: t.desdeExcl,
          hastaIncl: t.hastaIncl,
          porcentaje: t.porcentaje,
          montoEnTramo: roundHalfUp2(baseNum),
          comisionTramo: comision,
        },
      ],
    };
  }

  // ESCALONADO (Marginal)
  let totalComision = 0;
  const lineas: ResultadoTramo[] = [];

  for (const t of sorted) {
    if (baseNum <= t.desdeExcl) {
      break;
    }

    const tope = t.hastaIncl === null ? baseNum : Math.min(baseNum, t.hastaIncl);
    const porcion = Math.max(0, tope - t.desdeExcl);
    const comisionTramo = roundHalfUp2((porcion * t.porcentaje) / 100);

    lineas.push({
      orden: t.orden,
      desdeExcl: t.desdeExcl,
      hastaIncl: t.hastaIncl,
      porcentaje: t.porcentaje,
      montoEnTramo: roundHalfUp2(porcion),
      comisionTramo,
    });

    totalComision += comisionTramo;
  }

  return {
    comisionCalculada: roundHalfUp2(totalComision),
    tramos: lineas,
  };
}
