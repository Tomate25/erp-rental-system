import type { CondicionPagoFactura } from '../types/billing.types';

export interface ContratoCondicionSource {
  condiciones?: string | null;
  cotizacion?: { condiciones?: string | null } | null;
  cliente?: {
    condicionPago?: string | null;
    diasCreditoPactados?: number | null;
  } | null;
}

export interface CondicionPagoResuelta {
  condicionPago: CondicionPagoFactura;
  plazoCreditoDias?: number;
}

/**
 * Extrae el número de días de crédito desde textos como
 * "Condición de pago: CRÉDITO (15 días)" o "CREDITO_30_DIAS".
 */
export function extraerDiasCredito(texto?: string | null): number | undefined {
  if (!texto) return undefined;
  const match =
    texto.match(/(\d+)\s*d[ií]as/i) ||
    texto.match(/CREDITO[_\s-]*(\d+)/i) ||
    texto.match(/CR[ÉE]DITO\s*\(?\s*(\d+)/i);
  if (!match) return undefined;
  const dias = Number(match[1]);
  return Number.isFinite(dias) && dias > 0 ? dias : undefined;
}

function textoTieneContado(texto?: string | null): boolean {
  return (texto || '').toUpperCase().includes('CONTADO');
}

function textoTieneCredito(texto?: string | null): boolean {
  const upper = (texto || '').toUpperCase();
  return upper.includes('CREDITO') || upper.includes('CRÉDITO');
}

/**
 * Determina la condición de pago real de un contrato/pedido sin asignar
 * erróneamente "CREDITO (30 días)" cuando es CONTADO o cuando tiene otro plazo.
 */
export function resolveContratoCondicion(
  contrato?: ContratoCondicionSource | null,
): CondicionPagoResuelta {
  if (!contrato) {
    return { condicionPago: 'CONTADO', plazoCreditoDias: undefined };
  }

  const diasCliente =
    contrato.cliente?.diasCreditoPactados && contrato.cliente.diasCreditoPactados > 0
      ? contrato.cliente.diasCreditoPactados
      : extraerDiasCredito(contrato.cliente?.condicionPago);

  // 1. Cláusula explícita en el propio contrato tiene prioridad máxima
  if (textoTieneContado(contrato.condiciones)) {
    return { condicionPago: 'CONTADO', plazoCreditoDias: undefined };
  }
  if (textoTieneCredito(contrato.condiciones)) {
    return {
      condicionPago: 'CREDITO',
      plazoCreditoDias:
        extraerDiasCredito(contrato.condiciones) ??
        extraerDiasCredito(contrato.cotizacion?.condiciones) ??
        diasCliente ??
        30,
    };
  }

  // 2. Condición definida en la cotización origen
  if (textoTieneContado(contrato.cotizacion?.condiciones)) {
    return { condicionPago: 'CONTADO', plazoCreditoDias: undefined };
  }
  if (textoTieneCredito(contrato.cotizacion?.condiciones)) {
    return {
      condicionPago: 'CREDITO',
      plazoCreditoDias:
        extraerDiasCredito(contrato.cotizacion?.condiciones) ?? diasCliente ?? 30,
    };
  }

  // 3. Condición por defecto en el perfil del cliente
  const condClienteUpper = (contrato.cliente?.condicionPago || '').toUpperCase();
  if (
    condClienteUpper.includes('CREDITO') ||
    condClienteUpper.includes('CRÉDITO') ||
    condClienteUpper.includes('DIAS') ||
    condClienteUpper.includes('DÍAS')
  ) {
    return {
      condicionPago: 'CREDITO',
      plazoCreditoDias: diasCliente ?? 30,
    };
  }
  if (condClienteUpper.includes('CONTADO')) {
    return { condicionPago: 'CONTADO', plazoCreditoDias: undefined };
  }

  return { condicionPago: 'CONTADO', plazoCreditoDias: undefined };
}

/**
 * Resuelve la condición y plazo real de una factura emitida (evita mostrar días en CONTADO).
 */
export function resolveInvoiceCondicion(inv?: {
  condicionPago?: string | null;
  plazoCreditoDias?: number | null;
}): CondicionPagoResuelta {
  if ((inv?.condicionPago || '').toUpperCase() === 'CONTADO') {
    return { condicionPago: 'CONTADO', plazoCreditoDias: undefined };
  }
  return {
    condicionPago: 'CREDITO',
    plazoCreditoDias:
      inv?.plazoCreditoDias && inv.plazoCreditoDias > 0 ? inv.plazoCreditoDias : 30,
  };
}

/**
 * Formatea la etiqueta superior de condición de pago para pedidos y facturas.
 */
export function formatCondicionPagoLabel(
  condicionPago: CondicionPagoFactura,
  plazoCreditoDias?: number,
): string {
  if (condicionPago === 'CONTADO') {
    return 'CONTADO';
  }
  return plazoCreditoDias && plazoCreditoDias > 0
    ? `CRÉDITO (${plazoCreditoDias} días)`
    : 'CRÉDITO';
}
