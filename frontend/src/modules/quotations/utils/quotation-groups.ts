import { EstadoCotizacionValues, type Cotizacion } from '../types/quotation.types';

export interface QuotationGroup {
  key: string;
  latest: Cotizacion;
  versions: Cotizacion[];
  archivedVersions: Cotizacion[];
}

/**
 * Agrupa las cotizaciones por `numeroCotizacion` para que las versiones anteriores
 * (generalmente marcadas como CANCELADA al crearse v2, v3...) no aparezcan como
 * filas duplicadas en el listado principal, sino dentro del historial tipo carpeta
 * de su versión vigente.
 */
export function groupQuotationsByNumber(quotations: Cotizacion[]): QuotationGroup[] {
  const byNumber = new Map<string, Cotizacion[]>();

  for (const q of quotations) {
    const key = q.numeroCotizacion?.trim() || q.id;
    const list = byNumber.get(key) || [];
    list.push(q);
    byNumber.set(key, list);
  }

  const groups: QuotationGroup[] = [];
  for (const [key, list] of byNumber.entries()) {
    const sorted = [...list].sort((a, b) => {
      const versionDiff = (b.version || 1) - (a.version || 1);
      if (versionDiff !== 0) return versionDiff;
      const aCanceled = a.estado === EstadoCotizacionValues.CANCELADA ? 1 : 0;
      const bCanceled = b.estado === EstadoCotizacionValues.CANCELADA ? 1 : 0;
      if (aCanceled !== bCanceled) return aCanceled - bCanceled;
      return new Date(b.createdAt || b.fechaEmision).getTime() - new Date(a.createdAt || a.fechaEmision).getTime();
    });

    const [latest, ...archivedVersions] = sorted;
    groups.push({
      key,
      latest,
      versions: sorted,
      archivedVersions,
    });
  }

  return groups.sort(
    (a, b) =>
      new Date(b.latest.createdAt || b.latest.fechaEmision).getTime() -
      new Date(a.latest.createdAt || a.latest.fechaEmision).getTime(),
  );
}
