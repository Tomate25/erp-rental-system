export interface CuentaBancariaBmOption {
  codigo: string;
  nombre: string;
  value: string;
  grupo: 'CAJA' | 'BANCO';
  moneda: 'NIO' | 'USD';
}

export const CUENTAS_BANCARIAS_BM: readonly CuentaBancariaBmOption[] = [
  {
    codigo: '110201',
    nombre: 'LA FISE 750-100-489',
    value: '110201 - LA FISE 750-100-489',
    grupo: 'BANCO',
    moneda: 'NIO',
  },
  {
    codigo: '110202',
    nombre: 'LA FISE 133-023-603',
    value: '110202 - LA FISE 133-023-603',
    grupo: 'BANCO',
    moneda: 'NIO',
  },
  {
    codigo: '110203',
    nombre: 'BANPRO 701-279-700',
    value: '110203 - BANPRO 701-279-700',
    grupo: 'BANCO',
    moneda: 'NIO',
  },
  {
    codigo: '110204',
    nombre: 'LA FISE US 751-100-361',
    value: '110204 - LA FISE US 751-100-361',
    grupo: 'BANCO',
    moneda: 'USD',
  },
  {
    codigo: '110205',
    nombre: 'BANPRO US 711-279-691',
    value: '110205 - BANPRO US 711-279-691',
    grupo: 'BANCO',
    moneda: 'USD',
  },
  {
    codigo: '110207',
    nombre: 'LA FISE 541-501-104',
    value: '110207 - LA FISE 541-501-104',
    grupo: 'BANCO',
    moneda: 'NIO',
  },
  {
    codigo: '110206',
    nombre: 'CERTIFICADOS',
    value: '110206 - CERTIFICADOS',
    grupo: 'BANCO',
    moneda: 'NIO',
  },
  {
    codigo: '110101',
    nombre: 'CAJA GENERAL',
    value: '110101 - CAJA GENERAL',
    grupo: 'CAJA',
    moneda: 'NIO',
  },
  {
    codigo: '110102',
    nombre: 'CAJA CHICA',
    value: '110102 - CAJA CHICA',
    grupo: 'CAJA',
    moneda: 'NIO',
  },
];

export const BANCOS_BM_OPTIONS = CUENTAS_BANCARIAS_BM.filter((c) => c.grupo === 'BANCO');
export const CAJAS_BM_OPTIONS = CUENTAS_BANCARIAS_BM.filter((c) => c.grupo === 'CAJA');

export function resolveCuentaDestinoLabel(
  banco?: string | null,
  metodo?: string | null,
): { codigo: string; nombre: string } {
  const txt = String(banco || '').trim().toUpperCase();
  if (txt) {
    const byCode = CUENTAS_BANCARIAS_BM.find((c) => txt.includes(c.codigo));
    if (byCode) return { codigo: byCode.codigo, nombre: byCode.nombre };
    if (txt.includes('BANPRO') && (txt.includes('US') || txt.includes('711'))) {
      return { codigo: '110205', nombre: 'BANPRO US 711-279-691' };
    }
    if (txt.includes('BANPRO')) return { codigo: '110203', nombre: 'BANPRO 701-279-700' };
    if (txt.includes('133-023-603')) return { codigo: '110202', nombre: 'LA FISE 133-023-603' };
    if (txt.includes('541-501-104')) return { codigo: '110207', nombre: 'LA FISE 541-501-104' };
    if (txt.includes('751-100-361')) return { codigo: '110204', nombre: 'LA FISE US 751-100-361' };
    if (txt.includes('CAJA CHICA')) return { codigo: '110102', nombre: 'CAJA CHICA' };
    if (txt.includes('LA FISE') || txt.includes('LAFISE')) {
      return { codigo: '110201', nombre: 'LA FISE 750-100-489' };
    }
    return { codigo: '110201', nombre: banco!.trim() };
  }
  if (String(metodo || '').toUpperCase() === 'EFECTIVO') {
    return { codigo: '110101', nombre: 'CAJA GENERAL' };
  }
  return { codigo: '110201', nombre: 'LA FISE 750-100-489' };
}
