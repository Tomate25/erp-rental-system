import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import {
  buildConsolidatedWorkbook,
  buildReportWorkbook,
  buildVoidingHistoryWorkbook,
} from './export-report-excel.service';
import type { ReportPayload } from '../types/reports.types';

const sampleReport: ReportPayload = {
  tipo: 'cotizaciones',
  titulo: 'Reporte de Cotizaciones Comerciales',
  subtitulo: 'Prueba de exportación dinámica',
  modulo: 'Cotizaciones',
  generadoEn: '2026-11-27T18:00:00.000Z',
  filtros: {},
  kpis: [
    { label: 'Total Cotizaciones', value: 2, format: 'number', tone: 'blue' },
    { label: 'Monto Total', value: 2500, format: 'currency', tone: 'indigo' },
  ],
  columnas: [
    { key: 'numero', label: 'No. Cotización', type: 'text' },
    { key: 'mes', label: 'Mes', type: 'text', pivotDimension: true },
    { key: 'estado', label: 'Estado', type: 'badge', pivotDimension: true },
    { key: 'total', label: 'Total (C$)', type: 'currency', sumInTotals: true, pivotMetric: true },
  ],
  filas: [
    { numero: 'COT-0001', mes: '2026-11', estado: 'ACEPTADA', total: 1500 },
    { numero: 'COT-0002', mes: '2026-11', estado: 'PENDIENTE', total: 1000 },
  ],
  resumenesDinamicos: [
    {
      id: 'por_estado',
      titulo: 'Resumen Dinámico por Estado',
      dimensionKey: 'estado',
      dimensionLabel: 'Estado',
      metricKey: 'total',
      metricLabel: 'Monto Total (C$)',
      metricFormat: 'currency',
      crossDimensionKey: 'mes',
      crossDimensionLabel: 'Mes',
      rows: [
        { clave: 'ACEPTADA', cantidad: 1, metricaPrincipal: 1500, participacion: 60 },
        { clave: 'PENDIENTE', cantidad: 1, metricaPrincipal: 1000, participacion: 40 },
      ],
    },
  ],
  hojasAdicionales: [
    {
      id: 'anexo_test',
      nombreHoja: 'Anexo Detalle',
      titulo: 'Hoja Anexa Filtrable',
      subtitulo: 'Datos adicionales',
      columnas: [
        { key: 'codigo', label: 'Código', type: 'text' },
        { key: 'monto', label: 'Monto (C$)', type: 'currency', sumInTotals: true },
      ],
      filas: [{ codigo: 'A-1', monto: 500 }],
    },
  ],
  estadosDisponibles: ['ACEPTADA', 'PENDIENTE'],
};

describe('export-report-excel.service', () => {
  it('genera un libro Excel (.xlsx) válido con Resumen Dinámico (COUNTIF/SUMIF/SUMIFS), Tabla Filtrable y hojas anexas', async () => {
    const wb = await buildReportWorkbook(sampleReport, new Date('2026-11-27T18:00:00Z'));
    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'Resumen Dinámico',
      'Datos Detallados',
      'Anexo Detalle',
    ]);

    const buffer = await wb.xlsx.writeBuffer();
    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(buffer);

    const wsPivot = reloaded.getWorksheet('Resumen Dinámico');
    expect(wsPivot).toBeDefined();

    // Verificar fórmulas dinámicas COUNTIF, SUMIF y SUMIFS en la hoja de Resumen Dinámico
    const formulas: string[] = [];
    wsPivot!.eachRow((row) => {
      row.eachCell((cell) => {
        const val = cell.value as any;
        if (val && typeof val === 'object' && typeof val.formula === 'string') {
          formulas.push(val.formula);
        }
      });
    });

    expect(formulas.some((f) => f.includes('COUNTIF('))).toBe(true);
    expect(formulas.some((f) => f.includes('SUMIF('))).toBe(true);
    expect(formulas.some((f) => f.includes('SUMIFS('))).toBe(true);

    // Verificar tabla nativa filtrable en Datos Detallados
    const wsData = reloaded.getWorksheet('Datos Detallados');
    expect(wsData).toBeDefined();
    expect(wsData!.getCell('A8').value).toBe('COT-0001');
  });

  it('genera el libro consolidado gerencial con Portada Ejecutiva y pestañas por módulo', async () => {
    const wb = await buildConsolidatedWorkbook(
      {
        generadoEn: '2026-11-27T18:00:00Z',
        filtros: {},
        totalReportes: 1,
        reportes: [sampleReport],
      },
      new Date('2026-11-27T18:00:00Z'),
    );

    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'Portada Ejecutiva',
      'Cotizaciones',
    ]);
  });

  it('genera el libro de historial de anulaciones con dos hojas filtrables', async () => {
    const wb = await buildVoidingHistoryWorkbook({
      totalDocumentosAnulados: 1,
      documentosAnulados: [
        {
          tipoDocumento: 'FACTURA',
          documentoId: 'f1',
          codigo: 'FAC-0001',
          fecha: '2026-11-20',
          tercero: 'Constructora Norte',
          descripcion: 'ESTANDAR · CREDITO',
          monto: 1150,
          estado: 'CANCELADA',
          estaAnulado: true,
          afectaInventario: false,
          afectaContabilidad: true,
        },
      ],
      bitacoraAnulaciones: [
        {
          id: 'a1',
          fecha: '2026-11-27T12:00:00Z',
          accion: 'FACTURA_ANULADA',
          entidadTipo: 'FACTURA',
          entidadId: 'f1',
          usuario: 'Admin',
          detalles: 'Error de monto',
        },
      ],
    });

    expect(wb.worksheets.map((w) => w.name)).toEqual([
      'Documentos Anulados',
      'Bitácora Forense',
    ]);
  });
});
