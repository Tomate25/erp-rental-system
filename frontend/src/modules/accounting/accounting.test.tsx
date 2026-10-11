import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CatalogoCuentasTab, traducirTipoQB } from './components/CatalogoCuentasTab';
import { BalanzaComprobacionTab } from './components/BalanzaComprobacionTab';
import { LibroDiarioTab } from './components/LibroDiarioTab';
import { QuickBooksExportTab } from './components/QuickBooksExportTab';
import { AccountingDashboard } from './pages/AccountingDashboard';
import * as accountingApi from './services/accounting.api';

describe('Módulo Contable BM Construcciones - Frontend Tests', () => {
  it('1. exporta correctamente las funciones del servicio contable', () => {
    expect(typeof accountingApi.getCatalogoCuentas).toBe('function');
    expect(typeof accountingApi.getBalanzaComprobacion).toBe('function');
    expect(typeof accountingApi.getLibroDiario).toBe('function');
    expect(typeof accountingApi.exportQuickBooks).toBe('function');
    expect(typeof accountingApi.getCuentasPorCobrar).toBe('function');
    expect(typeof accountingApi.getCuentasPorPagar).toBe('function');
    expect(typeof accountingApi.getEstadoResultados).toBe('function');
    expect(typeof accountingApi.getBalanceGeneral).toBe('function');
  });

  it('2. renderiza CatalogoCuentasTab con estructura de controles y tabla en español', () => {
    const html = renderToStaticMarkup(<CatalogoCuentasTab />);
    expect(html).toContain('Total Cuentas');
    expect(html).toContain('Buscar por código');
    expect(html).toContain('Nivel:');
    expect(html).toContain('Naturaleza:');
    expect(html).toContain('Tipo QuickBooks');
    expect(html).toContain('Banco / Caja');
  });

  it('2.1 traduce los tipos contables de QuickBooks al español', () => {
    expect(traducirTipoQB('Bank')).toBe('Banco / Caja');
    expect(traducirTipoQB('Fixed Asset')).toBe('Activo Fijo');
    expect(traducirTipoQB('Accounts Receivable')).toBe('Cuentas por Cobrar');
    expect(traducirTipoQB('Accounts Payable')).toBe('Cuentas por Pagar');
    expect(traducirTipoQB('Other Current Liability')).toBe('Otro Pasivo Corriente');
    expect(traducirTipoQB('Cost of Goods Sold')).toBe('Costo de Ventas');
    expect(traducirTipoQB('Expense')).toBe('Gastos Operativos');
    expect(traducirTipoQB('Income')).toBe('Ingresos Operativos');
  });

  it('3. renderiza BalanzaComprobacionTab con verificador de saldos y ecuación contable', () => {
    const html = renderToStaticMarkup(<BalanzaComprobacionTab />);
    expect(html).toContain('Balanza de Comprobación Dinámica');
    expect(html).toContain('Total Movimiento Debe');
    expect(html).toContain('Total Movimiento Haber');
    expect(html).toContain('Diferencia de Cuadre');
  });

  it('4. renderiza LibroDiarioTab con pólizas de ventas y partida doble', () => {
    const html = renderToStaticMarkup(<LibroDiarioTab />);
    expect(html).toContain('Libro Diario General');
    expect(html).toContain('Pólizas Automáticas');
    expect(html).toContain('Volumen Contable Procesado');
  });

  it('5. renderiza QuickBooksExportTab con selector Desktop (.IIF) y Online (.CSV)', () => {
    const html = renderToStaticMarkup(<QuickBooksExportTab />);
    expect(html).toContain('QuickBooks Desktop (.IIF)');
    expect(html).toContain('QuickBooks Online (.CSV)');
    expect(html).toContain('Generar Exportación');
  });

  it('6. renderiza AccountingDashboard con las 8 pestañas requeridas', () => {
    const html = renderToStaticMarkup(<AccountingDashboard />);
    expect(html).toContain('Módulo Contable &amp; Facturación Fiscal');
    expect(html).toContain('Catálogo (207 Cuentas)');
    expect(html).toContain('Balanza de Comprobación');
    expect(html).toContain('Libro Diario');
    expect(html).toContain('QuickBooks Export');
    expect(html).toContain('CxC Clientes');
    expect(html).toContain('CxP Flota');
    expect(html).toContain('P&amp;L');
    expect(html).toContain('Balance');
  });
});
