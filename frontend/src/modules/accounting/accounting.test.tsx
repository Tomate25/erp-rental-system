import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CatalogoCuentasTab, traducirTipoQB } from './components/CatalogoCuentasTab';
import { BalanzaComprobacionTab } from './components/BalanzaComprobacionTab';
import { LibroDiarioTab } from './components/LibroDiarioTab';
import { QuickBooksExportTab } from './components/QuickBooksExportTab';
import { SaldosInicialesTab } from './components/SaldosInicialesTab';
import { AsientosContablesTab } from './components/AsientosContablesTab';
import { BancosCuentasTab } from './components/BancosCuentasTab';
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
    expect(typeof accountingApi.getSaldosIniciales).toBe('function');
    expect(typeof accountingApi.guardarSaldosIniciales).toBe('function');
    expect(typeof accountingApi.importarExcelContable).toBe('function');
    expect(typeof accountingApi.restaurarSaldosOficialesBm).toBe('function');
    expect(typeof accountingApi.listarAsientosContables).toBe('function');
    expect(typeof accountingApi.crearAsientoManual).toBe('function');
    expect(typeof accountingApi.anularAsientoManual).toBe('function');
  });

  it('2. renderiza CatalogoCuentasTab con estructura de controles y tabla en español', () => {
    const html = renderToStaticMarkup(<CatalogoCuentasTab />);
    expect(html).toContain('Total Cuentas (Árbol)');
    expect(html).toContain('Nivel 4 (Detalle Mov.)');
    expect(html).toContain('operativas');
    expect(html).toContain('Agrupadoras (N1+N2+N3)');
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

  it('6. renderiza AccountingDashboard con las 10 pestañas incluyendo Comprobantes y Datos Iniciales', () => {
    const html = renderToStaticMarkup(<AccountingDashboard />);
    expect(html).toContain('Módulo Contable &amp; Facturación Fiscal');
    expect(html).toContain('Catálogo BM (119 Cuentas)');
    expect(html).toContain('Datos Iniciales');
    expect(html).toContain('Comprobantes / Asientos');
    expect(html).toContain('Bancos y Caja');
    expect(html).toContain('Balanza de Comprobación');
    expect(html).toContain('Libro Diario');
    expect(html).toContain('QuickBooks Export');
    expect(html).toContain('CxC Clientes');
    expect(html).toContain('CxP Flota');
    expect(html).toContain('P&amp;L');
    expect(html).toContain('Balance');
  });

  it('7. renderiza SaldosInicialesTab con controles de importación Excel y carga manual', () => {
    const html = renderToStaticMarkup(<SaldosInicialesTab />);
    expect(html).toContain('Ingreso e Importación de Datos Iniciales BM');
    expect(html).toContain('Importar Excel (.xlsx)');
    expect(html).toContain('Guardar Datos Iniciales');
    expect(html).toContain('Total Saldo Inicial Deudor');
    expect(html).toContain('Total Saldo Inicial Acreedor');
  });

  it('8. renderiza AsientosContablesTab con las 7 plantillas operativas y captura de partidas', () => {
    const html = renderToStaticMarkup(<AsientosContablesTab />);
    expect(html).toContain('Comprobantes y Asientos Contables BM');
    expect(html).toContain('Pago a Proveedor (CxP)');
    expect(html).toContain('Gasto Operativo / Caja Chica');
    expect(html).toContain('Abono Préstamo e Intereses');
    expect(html).toContain('Depreciación Mensual Flota');
    expect(html).toContain('Contabilizar Asiento');
  });

  it('9. renderiza BancosCuentasTab con disponibilidad en caja, bancos y auxiliar de movimientos', () => {
    const html = renderToStaticMarkup(<BancosCuentasTab />);
    expect(html).toContain('Apartado Bancario y Caja');
    expect(html).toContain('Disponibilidad Total (Caja + Bancos)');
    expect(html).toContain('Total en Bancos (1102)');
    expect(html).toContain('Libro Auxiliar de Movimientos Bancarios y Caja');
  });
});
