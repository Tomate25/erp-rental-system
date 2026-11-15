import { describe, it, expect } from 'vitest';
import { readModuleFromUrl, readTabFromUrl } from './module-navigation';

describe('module-navigation helpers', () => {
  it('lee el módulo activo válido desde query string', () => {
    expect(readModuleFromUrl('?modulo=billing')).toBe('billing');
    expect(readModuleFromUrl('?modulo=accounting&tab=BALANCE')).toBe('accounting');
    expect(readModuleFromUrl('?modulo=operations&vista=despachos')).toBe('operations');
  });

  it('devuelve null si no hay módulo o es inválido', () => {
    expect(readModuleFromUrl('')).toBeNull();
    expect(readModuleFromUrl('?modulo=desconocido')).toBeNull();
  });

  it('lee sub-pestañas válidas y cae al valor por defecto si es inválida', () => {
    const billingTabs = ['ORDERS', 'INVOICES', 'DAMAGES'] as const;
    expect(readTabFromUrl(billingTabs, 'ORDERS', 'tab', '?modulo=billing&tab=INVOICES')).toBe('INVOICES');
    expect(readTabFromUrl(billingTabs, 'ORDERS', 'tab', '?modulo=billing&tab=OTRA')).toBe('ORDERS');
    expect(readTabFromUrl(billingTabs, 'ORDERS', 'tab', '')).toBe('ORDERS');
  });
});
