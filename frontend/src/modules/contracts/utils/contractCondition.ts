export interface ContractConditionSource {
  condiciones?: string | null;
  cliente?: {
    nombre?: string;
    condicionPago?: string | null;
    [key: string]: any;
  } | null;
  cotizacion?: {
    condiciones?: string | null;
    [key: string]: any;
  } | null;
  [key: string]: any;
}


/**
 * Determina si un contrato o venta corresponde a la modalidad CONTADO.
 *
 * Reglas de negocio:
 * 1. Si las cláusulas/condiciones del contrato indican explícitamente "CONTADO", es Contado.
 * 2. Si indican "CREDITO" o "CRÉDITO", es Crédito.
 * 3. Si la cotización de origen indica "CONTADO", es Contado.
 * 4. Si la cotización indica "CREDITO" / "CRÉDITO", es Crédito.
 * 5. Si la condición registrada del cliente indica días o crédito (ej. "30 Días", "Crédito"), es Crédito.
 * 6. Por defecto en BM Construcciones, toda operación de renta es CONTADO a menos que se pacte crédito.
 */
export const isContractContado = (source?: ContractConditionSource | null): boolean => {
  if (!source) return true;

  const condContrato = (source.condiciones || '').toUpperCase();
  if (condContrato.includes('CONTADO')) return true;
  if (condContrato.includes('CREDITO') || condContrato.includes('CRÉDITO')) return false;

  const condCoti = (source.cotizacion?.condiciones || '').toUpperCase();
  if (condCoti.includes('CONTADO')) return true;
  if (condCoti.includes('CREDITO') || condCoti.includes('CRÉDITO')) return false;

  const condCliente = (source.cliente?.condicionPago || '').toUpperCase();
  if (
    condCliente.includes('CREDITO') ||
    condCliente.includes('CRÉDITO') ||
    condCliente.includes('DIAS') ||
    condCliente.includes('DÍAS')
  ) {
    return false;
  }
  if (condCliente.includes('CONTADO')) return true;

  return true;
};
