export function isContractContado(contrato?: {
  condiciones?: string | null;
  cotizacion?: { condiciones?: string | null } | null;
  cliente?: { condicionPago?: string | null } | null;
} | null): boolean {
  if (!contrato) return false;

  // 1. La cotización oficial tiene máxima prioridad si define la condición
  const condCoti = (contrato.cotizacion?.condiciones || '').toUpperCase();
  if (condCoti.includes('CONTADO')) return true;
  if (condCoti.includes('CREDITO') || condCoti.includes('CRÉDITO')) return false;

  // 2. Si no hay cotización, se evalúan las cláusulas del contrato
  const condContrato = (contrato.condiciones || '').toUpperCase();
  if (condContrato.includes('CONTADO')) return true;
  if (condContrato.includes('CREDITO') || condContrato.includes('CRÉDITO')) return false;

  // 3. Condición registrada en el perfil del cliente
  const condCliente = (contrato.cliente?.condicionPago || '').toUpperCase();
  if (
    condCliente.includes('CREDITO') ||
    condCliente.includes('CRÉDITO') ||
    condCliente.includes('DIAS') ||
    condCliente.includes('DÍAS')
  ) {
    return false;
  }
  if (condCliente.includes('CONTADO')) return true;

  return false;
}
