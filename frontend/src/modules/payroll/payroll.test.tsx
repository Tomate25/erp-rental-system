import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { PayrollPage } from './pages/PayrollPage';
import { payrollApi } from './services/payroll.api';

describe('Módulo de Nómina (Planilla) Nicaragua - Frontend Tests', () => {
  it('1. exporta correctamente los endpoints del cliente API de nómina', () => {
    expect(typeof payrollApi.seedDefaults).toBe('function');
    expect(typeof payrollApi.getEmployees).toBe('function');
    expect(typeof payrollApi.createEmployee).toBe('function');
    expect(typeof payrollApi.getPeriods).toBe('function');
    expect(typeof payrollApi.createPeriod).toBe('function');
    expect(typeof payrollApi.calculatePayroll).toBe('function');
    expect(typeof payrollApi.reviewPayroll).toBe('function');
    expect(typeof payrollApi.approvePayroll).toBe('function');
    expect(typeof payrollApi.markPaid).toBe('function');
    expect(typeof payrollApi.calculateSettlement).toBe('function');
    expect(typeof payrollApi.getPayslip).toBe('function');
  });

  it('2. renderiza PayrollPage con membrete oficial y pestañas de navegación', () => {
    const html = renderToStaticMarkup(<PayrollPage />);
    expect(html).toContain('Nómina y Recursos Humanos');
    expect(html).toContain('Código del Trabajo Ley 185');
    expect(html).toContain('Ley 822');
    expect(html).toContain('Planilla Quincenal');
    expect(html).toContain('Expediente de Personal');
    expect(html).toContain('Finiquito &amp; Liquidación (Art. 45)');
    expect(html).toContain('Tarifas Legales (INSS/IR/INATEC)');
  });

  it('3. incluye controles de cálculo y sembrado de parámetros de ley', () => {
    const html = renderToStaticMarkup(<PayrollPage />);
    expect(html).toContain('Sembrar Parámetros de Ley');
    expect(html).toContain('Nuevo Colaborador');
    expect(html).toContain('Calcular / Recalcular');
    expect(html).toContain('Período de Nómina:');
  });

  it('4. contiene la estructura de tabla de colaboradores con desglose de ley', () => {
    const html = renderToStaticMarkup(<PayrollPage />);
    expect(html).toContain('Nómina de Colaboradores');
    expect(html).toContain('Salario Mensual');
    expect(html).toContain('INSS Lab. (7%)');
    expect(html).toContain('IR Art. 23');
    expect(html).toContain('Neto a Pagar');
  });
});
