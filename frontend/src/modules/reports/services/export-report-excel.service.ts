import ExcelJS from 'exceljs';
import type {
  ConsolidatedReportResponse,
  DynamicSummarySpec,
  ExtraReportSheet,
  ReportColumnDef,
  ReportPayload,
  VoidingHistoryResponse,
} from '../types/reports.types';

const BANNER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF0F172A' },
};

const SECTION_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A8A' },
};

const SUBHEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF1F5F9' },
};

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E293B' },
};

const KPI_LABEL_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE2E8F0' },
};

const TOTALS_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE0F2FE' },
};

const ZEBRA_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF8FAFC' },
};

const CELL_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
};

const CURRENCY_FMT = '"C$"#,##0.00';
const NUMBER_FMT = '#,##0.##';
const INT_FMT = '#,##0';
const PERCENT_FMT = '0.0%';

export function colIndexToLetter(colIndex1Based: number): string {
  let n = colIndex1Based;
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result || 'A';
}

function sanitizeSheetName(raw: string, usedNames: Set<string>): string {
  const cleaned = raw
    .replace(/[\\/*?:[\]]/g, '')
    .trim()
    .slice(0, 31) || 'Hoja';
  let candidate = cleaned;
  let idx = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    const suffix = ` ${idx}`;
    candidate = `${cleaned.slice(0, 31 - suffix.length)}${suffix}`;
    idx += 1;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function sanitizeTableName(raw: string, usedTables: Set<string>): string {
  const base =
    raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9_]/g, '_')
      .replace(/^[^A-Za-z_]/, 'T_')
      .slice(0, 40) || 'TablaDatos';
  let candidate = base;
  let idx = 2;
  while (usedTables.has(candidate.toLowerCase())) {
    candidate = `${base.slice(0, 36)}_${idx}`;
    idx += 1;
  }
  usedTables.add(candidate.toLowerCase());
  return candidate;
}

function formatStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function applyBanner(
  ws: ExcelJS.Worksheet,
  colCount: number,
  title: string,
  subtitle: string,
): void {
  const lastCol = colIndexToLetter(Math.max(colCount, 6));
  ws.mergeCells(`A1:${lastCol}1`);
  const titleCell = ws.getCell('A1');
  titleCell.value = title;
  titleCell.font = {
    name: 'Calibri',
    size: 13,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };
  titleCell.fill = BANNER_FILL;
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 28;

  ws.mergeCells(`A2:${lastCol}2`);
  const subCell = ws.getCell('A2');
  subCell.value = subtitle;
  subCell.font = {
    name: 'Calibri',
    size: 9.5,
    italic: true,
    color: { argb: 'FF475569' },
  };
  subCell.fill = SUBHEADER_FILL;
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 20;
}

function autoFitColumns(
  ws: ExcelJS.Worksheet,
  startRow: number,
  minWidth = 12,
  maxWidth = 40,
): void {
  ws.columns.forEach((col, colIdx) => {
    let longest = minWidth;
    ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
      if (rowNum < startRow) return;
      const val = row.getCell(colIdx + 1).value;
      if (val === null || val === undefined) return;
      const text =
        typeof val === 'object' && 'result' in val
          ? String((val as { result?: unknown }).result ?? '')
          : typeof val === 'object' && 'formula' in val
            ? String((val as { formula?: string }).formula ?? '')
            : String(val);
      const len = text.length + 4;
      if (len > longest) longest = len;
    });
    col.width = Math.min(Math.max(longest, minWidth), maxWidth);
  });
}

function formatCellValue(col: ReportColumnDef, raw: unknown): string | number | null {
  if (raw === null || raw === undefined || raw === '') {
    if (col.type === 'currency' || col.type === 'number' || col.type === 'percent') {
      return 0;
    }
    return '-';
  }
  if (col.type === 'currency' || col.type === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  if (col.type === 'percent') {
    const n = Number(raw);
    return Number.isFinite(n) ? n / 100 : 0;
  }
  return String(raw);
}

function styleStructuredTable(
  ws: ExcelJS.Worksheet,
  headerRowIdx: number,
  rowCount: number,
  columnas: ReportColumnDef[],
  hasTotalsRow = true,
): void {
  const headerRow = ws.getRow(headerRowIdx);
  headerRow.height = 25;
  columnas.forEach((_, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.fill = HEADER_FILL;
    cell.font = {
      name: 'Calibri',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = CELL_BORDER;
  });

  const lastDataRow = headerRowIdx + rowCount;
  for (let r = headerRowIdx + 1; r <= lastDataRow; r++) {
    const row = ws.getRow(r);
    row.height = 20;
    const isEven = (r - headerRowIdx) % 2 === 0;
    columnas.forEach((col, idx) => {
      const cell = row.getCell(idx + 1);
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } };
      cell.border = CELL_BORDER;
      if (isEven) cell.fill = ZEBRA_FILL;

      if (col.type === 'currency') {
        cell.numFmt = CURRENCY_FMT;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (col.type === 'number') {
        cell.numFmt = NUMBER_FMT;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (col.type === 'percent') {
        cell.numFmt = PERCENT_FMT;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (col.type === 'date' || col.type === 'badge') {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  }

  if (hasTotalsRow) {
    const totalsRow = ws.getRow(lastDataRow + 1);
    totalsRow.height = 24;
    columnas.forEach((col, idx) => {
      const cell = totalsRow.getCell(idx + 1);
      cell.fill = TOTALS_FILL;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
        bottom: { style: 'double', color: { argb: 'FF1E3A8A' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
      if (col.type === 'currency') {
        cell.numFmt = CURRENCY_FMT;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (col.type === 'number') {
        cell.numFmt = NUMBER_FMT;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (col.type === 'percent') {
        cell.numFmt = PERCENT_FMT;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }
    });
  }
}

function addFilterableDataSheet(
  wb: ExcelJS.Workbook,
  sheetName: string,
  tableName: string,
  title: string,
  subtitle: string,
  columnas: ReportColumnDef[],
  filas: Array<Record<string, unknown>>,
  kpis?: ReportPayload['kpis'],
): {
  sheetName: string;
  headerRowIdx: number;
  dataStartRow: number;
  dataEndRow: number;
} {
  const hasKpis = Boolean(kpis && kpis.length > 0);
  const headerRowIdx = hasKpis ? 7 : 4;

  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: headerRowIdx, showGridLines: true }],
  });

  applyBanner(ws, columnas.length, title, subtitle);

  if (hasKpis && kpis) {
    ws.getRow(4).height = 18;
    ws.getRow(5).height = 24;
    kpis.forEach((kpi, idx) => {
      const colLetter = colIndexToLetter(idx + 1);
      const lbl = ws.getCell(`${colLetter}4`);
      lbl.value = kpi.label.toUpperCase();
      lbl.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF475569' } };
      lbl.fill = KPI_LABEL_FILL;
      lbl.alignment = { vertical: 'middle', horizontal: 'center' };
      lbl.border = CELL_BORDER;

      const val = ws.getCell(`${colLetter}5`);
      val.value = kpi.format === 'percent' ? kpi.value / 100 : kpi.value;
      val.numFmt =
        kpi.format === 'currency'
          ? CURRENCY_FMT
          : kpi.format === 'percent'
            ? PERCENT_FMT
            : INT_FMT;
      val.font = { name: 'Calibri', size: 11.5, bold: true, color: { argb: 'FF0F172A' } };
      val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      val.alignment = { vertical: 'middle', horizontal: 'center' };
      val.border = CELL_BORDER;
    });
  }

  const rows =
    filas.length > 0
      ? filas.map((r) => columnas.map((c) => formatCellValue(c, r[c.key])))
      : [columnas.map((c, idx) => (idx === 0 ? 'Sin registros en el período' : c.type === 'currency' || c.type === 'number' ? 0 : '-'))];

  ws.addTable({
    name: tableName,
    ref: `A${headerRowIdx}`,
    headerRow: true,
    totalsRow: true,
    style: {
      theme: 'TableStyleMedium2',
      showRowStripes: true,
    },
    columns: columnas.map((c, idx) => ({
      name: c.label,
      filterButton: true,
      ...(idx === 0 ? { totalsRowLabel: 'TOTALES (FILTRADOS):' } : {}),
      ...(idx > 0 && c.sumInTotals ? { totalsRowFunction: 'sum' as const } : {}),
    })),
    rows,
  });

  styleStructuredTable(ws, headerRowIdx, rows.length, columnas, true);
  autoFitColumns(ws, headerRowIdx, 13, 38);

  return {
    sheetName,
    headerRowIdx,
    dataStartRow: headerRowIdx + 1,
    dataEndRow: headerRowIdx + rows.length,
  };
}

/**
 * Construye una hoja "Resumen Dinámico (Pivot)" con fórmulas Excel vivas (COUNTIF / SUMIF / SUMIFS)
 * vinculadas a la tabla de datos principal para recálculo dinámico y filtrado inmediato en Excel.
 */
function addDynamicPivotSheet(
  wb: ExcelJS.Workbook,
  sheetName: string,
  report: ReportPayload,
  dataSheetInfo: {
    sheetName: string;
    dataStartRow: number;
    dataEndRow: number;
  },
  stamp: string,
): void {
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 3, showGridLines: true }],
  });

  const maxCols = 8;
  applyBanner(
    ws,
    maxCols,
    `BM CONSTRUCCIONES S.A. — TABLA DINÁMICA Y RESUMEN EJECUTIVO: ${report.titulo.toUpperCase()}`,
    `Generado el ${stamp} · Fórmulas dinámicas (COUNTIF / SUMIF / SUMIFS) vinculadas en vivo a "${dataSheetInfo.sheetName}". Filtra la hoja de datos o inserta segmentadores en Excel.`,
  );

  // KPI strip
  ws.getRow(4).height = 18;
  ws.getRow(5).height = 24;
  report.kpis.forEach((kpi, idx) => {
    const colLetter = colIndexToLetter(idx + 1);
    const lbl = ws.getCell(`${colLetter}4`);
    lbl.value = kpi.label.toUpperCase();
    lbl.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF475569' } };
    lbl.fill = KPI_LABEL_FILL;
    lbl.alignment = { vertical: 'middle', horizontal: 'center' };
    lbl.border = CELL_BORDER;

    const val = ws.getCell(`${colLetter}5`);
    val.value = kpi.format === 'percent' ? kpi.value / 100 : kpi.value;
    val.numFmt =
      kpi.format === 'currency'
        ? CURRENCY_FMT
        : kpi.format === 'percent'
          ? PERCENT_FMT
          : INT_FMT;
    val.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
    val.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    val.alignment = { vertical: 'middle', horizontal: 'center' };
    val.border = CELL_BORDER;
  });

  const safeDataRefSheet = `'${dataSheetInfo.sheetName.replace(/'/g, "''")}'`;
  const colIndexByKey = new Map<string, string>();
  report.columnas.forEach((c, idx) => {
    colIndexByKey.set(c.key, colIndexToLetter(idx + 1));
  });

  let cursorRow = 7;

  const renderSummaryBlock = (summary: DynamicSummarySpec) => {
    const hasSecondary = Boolean(summary.secondaryMetricKey);
    const colCount = hasSecondary ? 5 : 4;
    const endColLetter = colIndexToLetter(colCount);

    ws.mergeCells(`A${cursorRow}:${endColLetter}${cursorRow}`);
    const secCell = ws.getCell(`A${cursorRow}`);
    secCell.value = `▸ ${summary.titulo.toUpperCase()} (Fórmulas Dinámicas SUMIF / COUNTIF)`;
    secCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    secCell.fill = SECTION_FILL;
    secCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(cursorRow).height = 23;
    cursorRow += 1;

    const headerRow = ws.getRow(cursorRow);
    headerRow.height = 22;
    const headers = [
      summary.dimensionLabel,
      'Cant. Registros',
      summary.metricLabel,
      ...(hasSecondary ? [summary.secondaryMetricLabel || 'Métrica 2'] : []),
      '% Participación',
    ];
    headers.forEach((h, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = h;
      cell.fill = HEADER_FILL;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = CELL_BORDER;
    });
    cursorRow += 1;

    const blockDataStart = cursorRow;
    const dimColLetter = colIndexByKey.get(summary.dimensionKey);
    const metricColLetter = colIndexByKey.get(summary.metricKey);
    const secMetricColLetter = summary.secondaryMetricKey
      ? colIndexByKey.get(summary.secondaryMetricKey)
      : undefined;

    const rowsToRender =
      summary.rows.length > 0
        ? summary.rows
        : [{ clave: 'Sin datos', cantidad: 0, metricaPrincipal: 0, metricaSecundaria: 0, participacion: 0 }];

    const totalRowIdx = blockDataStart + rowsToRender.length;

    rowsToRender.forEach((item, idx) => {
      const r = ws.getRow(cursorRow);
      r.height = 20;
      const isEven = idx % 2 === 1;

      const cDim = r.getCell(1);
      cDim.value = item.clave;
      cDim.alignment = { vertical: 'middle', horizontal: 'left' };

      const cCount = r.getCell(2);
      if (dimColLetter && report.filas.length > 0) {
        cCount.value = {
          formula: `COUNTIF(${safeDataRefSheet}!$${dimColLetter}$${dataSheetInfo.dataStartRow}:$${dimColLetter}$${dataSheetInfo.dataEndRow},A${cursorRow})`,
          result: item.cantidad,
        };
      } else {
        cCount.value = item.cantidad;
      }
      cCount.numFmt = INT_FMT;
      cCount.alignment = { vertical: 'middle', horizontal: 'right' };

      const cMetric = r.getCell(3);
      if (dimColLetter && metricColLetter && report.filas.length > 0) {
        cMetric.value = {
          formula: `SUMIF(${safeDataRefSheet}!$${dimColLetter}$${dataSheetInfo.dataStartRow}:$${dimColLetter}$${dataSheetInfo.dataEndRow},A${cursorRow},${safeDataRefSheet}!$${metricColLetter}$${dataSheetInfo.dataStartRow}:$${metricColLetter}$${dataSheetInfo.dataEndRow})`,
          result: item.metricaPrincipal,
        };
      } else {
        cMetric.value = item.metricaPrincipal;
      }
      cMetric.numFmt =
        summary.metricFormat === 'currency' ? CURRENCY_FMT : NUMBER_FMT;
      cMetric.alignment = { vertical: 'middle', horizontal: 'right' };

      let pctColIdx = 4;
      if (hasSecondary) {
        const cSec = r.getCell(4);
        if (dimColLetter && secMetricColLetter && report.filas.length > 0) {
          cSec.value = {
            formula: `SUMIF(${safeDataRefSheet}!$${dimColLetter}$${dataSheetInfo.dataStartRow}:$${dimColLetter}$${dataSheetInfo.dataEndRow},A${cursorRow},${safeDataRefSheet}!$${secMetricColLetter}$${dataSheetInfo.dataStartRow}:$${secMetricColLetter}$${dataSheetInfo.dataEndRow})`,
            result: item.metricaSecundaria ?? 0,
          };
        } else {
          cSec.value = item.metricaSecundaria ?? 0;
        }
        cSec.numFmt =
          summary.secondaryMetricFormat === 'currency' ? CURRENCY_FMT : NUMBER_FMT;
        cSec.alignment = { vertical: 'middle', horizontal: 'right' };
        pctColIdx = 5;
      }

      const cPct = r.getCell(pctColIdx);
      cPct.value = {
        formula: `IF($C$${totalRowIdx}=0,0,C${cursorRow}/$C$${totalRowIdx})`,
        result: (item.participacion || 0) / 100,
      };
      cPct.numFmt = PERCENT_FMT;
      cPct.alignment = { vertical: 'middle', horizontal: 'right' };

      for (let c = 1; c <= colCount; c++) {
        const cell = r.getCell(c);
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } };
        cell.border = CELL_BORDER;
        if (isEven) cell.fill = ZEBRA_FILL;
      }

      cursorRow += 1;
    });

    // Totals row with dynamic SUM formulas
    const tRow = ws.getRow(cursorRow);
    tRow.height = 23;
    tRow.getCell(1).value = 'TOTAL GENERAL';
    tRow.getCell(2).value = {
      formula: `SUM(B${blockDataStart}:B${cursorRow - 1})`,
      result: rowsToRender.reduce((s, r) => s + r.cantidad, 0),
    };
    tRow.getCell(2).numFmt = INT_FMT;
    tRow.getCell(3).value = {
      formula: `SUM(C${blockDataStart}:C${cursorRow - 1})`,
      result: rowsToRender.reduce((s, r) => s + r.metricaPrincipal, 0),
    };
    tRow.getCell(3).numFmt =
      summary.metricFormat === 'currency' ? CURRENCY_FMT : NUMBER_FMT;
    if (hasSecondary) {
      tRow.getCell(4).value = {
        formula: `SUM(D${blockDataStart}:D${cursorRow - 1})`,
        result: rowsToRender.reduce((s, r) => s + (r.metricaSecundaria || 0), 0),
      };
      tRow.getCell(4).numFmt =
        summary.secondaryMetricFormat === 'currency' ? CURRENCY_FMT : NUMBER_FMT;
      tRow.getCell(5).value = 1;
      tRow.getCell(5).numFmt = PERCENT_FMT;
    } else {
      tRow.getCell(4).value = 1;
      tRow.getCell(4).numFmt = PERCENT_FMT;
    }

    for (let c = 1; c <= colCount; c++) {
      const cell = tRow.getCell(c);
      cell.fill = TOTALS_FILL;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
        bottom: { style: 'double', color: { argb: 'FF1E3A8A' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
      if (c > 1) cell.alignment = { vertical: 'middle', horizontal: 'right' };
    }

    cursorRow += 2;

    // Cross-Tab Pivot Matrix (Rows x Columns using live SUMIFS)
    if (
      summary.crossDimensionKey &&
      dimColLetter &&
      metricColLetter &&
      report.filas.length > 0
    ) {
      const crossColLetter = colIndexByKey.get(summary.crossDimensionKey);
      if (crossColLetter) {
        const crossValues = Array.from(
          new Set(
            report.filas.map((f) => {
              const v = f[summary.crossDimensionKey!];
              return v !== null && v !== undefined && String(v).trim()
                ? String(v).trim()
                : 'Sin Clasificar';
            }),
          ),
        )
          .sort()
          .slice(0, 12);

        if (crossValues.length > 0) {
          const matrixCols = crossValues.length + 2;
          const matrixEndLetter = colIndexToLetter(matrixCols);
          ws.mergeCells(`A${cursorRow}:${matrixEndLetter}${cursorRow}`);
          const mTitle = ws.getCell(`A${cursorRow}`);
          mTitle.value = `▸ MATRIZ DINÁMICA CRUZADA: ${summary.dimensionLabel.toUpperCase()} × ${(summary.crossDimensionLabel || summary.crossDimensionKey).toUpperCase()} (${summary.metricLabel} — SUMIFS)`;
          mTitle.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
          mTitle.fill = SECTION_FILL;
          mTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          ws.getRow(cursorRow).height = 23;
          cursorRow += 1;

          const mHeaderRowIdx = cursorRow;
          const mHeader = ws.getRow(mHeaderRowIdx);
          mHeader.height = 22;
          const mHeaders = [summary.dimensionLabel, ...crossValues, 'TOTAL FILA'];
          mHeaders.forEach((h, idx) => {
            const cell = mHeader.getCell(idx + 1);
            cell.value = h;
            cell.fill = HEADER_FILL;
            cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = CELL_BORDER;
          });
          cursorRow += 1;

          const mDataStart = cursorRow;
          rowsToRender.forEach((rowItem, rIdx) => {
            const r = ws.getRow(cursorRow);
            r.height = 20;
            const isEven = rIdx % 2 === 1;
            r.getCell(1).value = rowItem.clave;
            r.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

            let rowSum = 0;
            crossValues.forEach((cv, cIdx) => {
              const targetColLetter = colIndexToLetter(cIdx + 2);
              const cachedSum = report.filas
                .filter(
                  (f) =>
                    String(f[summary.dimensionKey] ?? 'Sin Clasificar').trim() ===
                      rowItem.clave &&
                    String(
                      f[summary.crossDimensionKey!] ?? 'Sin Clasificar',
                    ).trim() === cv,
                )
                .reduce((s, f) => s + Number(f[summary.metricKey] || 0), 0);
              rowSum += cachedSum;

              const cell = r.getCell(cIdx + 2);
              cell.value = {
                formula: `SUMIFS(${safeDataRefSheet}!$${metricColLetter}$${dataSheetInfo.dataStartRow}:$${metricColLetter}$${dataSheetInfo.dataEndRow},${safeDataRefSheet}!$${dimColLetter}$${dataSheetInfo.dataStartRow}:$${dimColLetter}$${dataSheetInfo.dataEndRow},$A${cursorRow},${safeDataRefSheet}!$${crossColLetter}$${dataSheetInfo.dataStartRow}:$${crossColLetter}$${dataSheetInfo.dataEndRow},${targetColLetter}$${mHeaderRowIdx})`,
                result: Math.round(cachedSum * 100) / 100,
              };
              cell.numFmt =
                summary.metricFormat === 'currency' ? CURRENCY_FMT : NUMBER_FMT;
              cell.alignment = { vertical: 'middle', horizontal: 'right' };
            });

            const lastValLetter = colIndexToLetter(crossValues.length + 1);
            const totCell = r.getCell(matrixCols);
            totCell.value = {
              formula: `SUM(B${cursorRow}:${lastValLetter}${cursorRow})`,
              result: Math.round(rowSum * 100) / 100,
            };
            totCell.numFmt =
              summary.metricFormat === 'currency' ? CURRENCY_FMT : NUMBER_FMT;
            totCell.alignment = { vertical: 'middle', horizontal: 'right' };

            for (let c = 1; c <= matrixCols; c++) {
              const cell = r.getCell(c);
              cell.font = {
                name: 'Calibri',
                size: 9.5,
                bold: c === matrixCols,
                color: { argb: 'FF0F172A' },
              };
              cell.border = CELL_BORDER;
              if (isEven) cell.fill = ZEBRA_FILL;
            }
            cursorRow += 1;
          });

          const mTotRow = ws.getRow(cursorRow);
          mTotRow.height = 23;
          mTotRow.getCell(1).value = 'TOTAL COLUMNA';
          for (let c = 2; c <= matrixCols; c++) {
            const colL = colIndexToLetter(c);
            const cell = mTotRow.getCell(c);
            cell.value = {
              formula: `SUM(${colL}${mDataStart}:${colL}${cursorRow - 1})`,
              result: 0,
            };
            cell.numFmt =
              summary.metricFormat === 'currency' ? CURRENCY_FMT : NUMBER_FMT;
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
          }
          for (let c = 1; c <= matrixCols; c++) {
            const cell = mTotRow.getCell(c);
            cell.fill = TOTALS_FILL;
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
            cell.border = {
              top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
              bottom: { style: 'double', color: { argb: 'FF1E3A8A' } },
              left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
              right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
            };
          }
          cursorRow += 2;
        }
      }
    }
  };

  for (const summary of report.resumenesDinamicos) {
    renderSummaryBlock(summary);
  }

  autoFitColumns(ws, 4, 15, 36);
}

/**
 * Construye un libro Excel (.xlsx) para un reporte individual con:
 * - Hoja 1: Resumen Dinámico (Tablas Dinámicas con fórmulas vivas COUNTIF / SUMIF / SUMIFS)
 * - Hoja 2: Datos Detallados (Tabla nativa Excel filtrable con AutoFilter y fila de totales SUBTOTAL)
 * - Hojas 3+: Hojas adicionales del módulo (también tablas filtrables nativas)
 */
export async function buildReportWorkbook(
  report: ReportPayload,
  generatedAt = new Date(),
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BM Construcciones ERP — Centro de Reportes';
  wb.created = generatedAt;
  wb.calcProperties.fullCalcOnLoad = true;

  const stamp = formatStamp(generatedAt);
  const usedSheets = new Set<string>();
  const usedTables = new Set<string>();

  const pivotSheetName = sanitizeSheetName('Resumen Dinámico', usedSheets);
  const dataSheetName = sanitizeSheetName('Datos Detallados', usedSheets);
  const dataTableName = sanitizeTableName(`Tabla_${report.tipo}`, usedTables);

  // Creamos primero la hoja de Resumen Dinámico como pestaña 1 (reservando orden),
  // pero primero calculamos el rango de Datos Detallados:
  // En ExcelJS el orden de pestañas sigue el orden de addWorksheet, así que creamos
  // Resumen Dinámico usando el rango determinista de Datos Detallados!
  const hasKpis = report.kpis.length > 0;
  const dataHeaderRow = hasKpis ? 7 : 4;
  const dataRowsCount = Math.max(1, report.filas.length);
  const dataSheetMeta = {
    sheetName: dataSheetName,
    dataStartRow: dataHeaderRow + 1,
    dataEndRow: dataHeaderRow + dataRowsCount,
  };

  addDynamicPivotSheet(wb, pivotSheetName, report, dataSheetMeta, stamp);

  addFilterableDataSheet(
    wb,
    dataSheetName,
    dataTableName,
    `BM CONSTRUCCIONES S.A. — ${report.titulo.toUpperCase()}`,
    `Generado el ${stamp} · Usa los filtros nativos de cada columna para filtrar y analizar los totales dinámicos.`,
    report.columnas,
    report.filas,
    report.kpis,
  );

  for (const extra of report.hojasAdicionales || []) {
    const extraSheetName = sanitizeSheetName(extra.nombreHoja, usedSheets);
    const extraTableName = sanitizeTableName(`Tabla_${extra.id}`, usedTables);
    addFilterableDataSheet(
      wb,
      extraSheetName,
      extraTableName,
      `BM CONSTRUCCIONES S.A. — ${extra.titulo.toUpperCase()}`,
      `Generado el ${stamp} · ${extra.subtitulo}`,
      extra.columnas,
      extra.filas,
    );
  }

  return wb;
}

/**
 * Construye el Libro Excel Consolidado Gerencial con Portada KPI + 1 hoja filtrable por cada módulo.
 */
export async function buildConsolidatedWorkbook(
  consolidated: ConsolidatedReportResponse,
  generatedAt = new Date(),
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BM Construcciones ERP — Reporte Gerencial Consolidado';
  wb.created = generatedAt;
  wb.calcProperties.fullCalcOnLoad = true;

  const stamp = formatStamp(generatedAt);
  const usedSheets = new Set<string>();
  const usedTables = new Set<string>();

  const coverName = sanitizeSheetName('Portada Ejecutiva', usedSheets);
  const wsCover = wb.addWorksheet(coverName, {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: true }],
  });

  applyBanner(
    wsCover,
    6,
    'BM CONSTRUCCIONES S.A. — REPORTE CONSOLIDADO GERENCIAL (TODOS LOS MÓDULOS ERP)',
    `Generado el ${stamp} · Incluye ${consolidated.reportes.length} módulos con tablas filtrables nativas y totales dinámicos SUBTOTAL.`,
  );

  const summaryRows = consolidated.reportes.map((rep) => [
    rep.modulo,
    rep.titulo,
    rep.filas.length,
    rep.kpis[0] ? `${rep.kpis[0].label}: ${rep.kpis[0].value}` : '-',
    rep.kpis[1] ? `${rep.kpis[1].label}: ${rep.kpis[1].value}` : '-',
    rep.hojasAdicionales.length,
  ]);

  wsCover.addTable({
    name: sanitizeTableName('TablaIndiceModulos', usedTables),
    ref: 'A4',
    headerRow: true,
    totalsRow: true,
    style: { theme: 'TableStyleMedium2', showRowStripes: true },
    columns: [
      { name: 'Módulo ERP', totalsRowLabel: 'TOTAL REGISTROS:', filterButton: true },
      { name: 'Informe Incluido', filterButton: true },
      { name: 'Registros', totalsRowFunction: 'sum', filterButton: true },
      { name: 'Indicador 1', filterButton: true },
      { name: 'Indicador 2', filterButton: true },
      { name: 'Hojas Anexas', totalsRowFunction: 'sum', filterButton: true },
    ],
    rows: summaryRows,
  });

  styleStructuredTable(
    wsCover,
    4,
    summaryRows.length,
    [
      { key: 'a', label: 'Módulo ERP', type: 'text' },
      { key: 'b', label: 'Informe', type: 'text' },
      { key: 'c', label: 'Registros', type: 'number', sumInTotals: true },
      { key: 'd', label: 'Ind1', type: 'text' },
      { key: 'e', label: 'Ind2', type: 'text' },
      { key: 'f', label: 'Anexas', type: 'number', sumInTotals: true },
    ],
    true,
  );
  autoFitColumns(wsCover, 4, 15, 42);

  for (const rep of consolidated.reportes) {
    const sName = sanitizeSheetName(rep.modulo, usedSheets);
    const tName = sanitizeTableName(`Tabla_${rep.tipo}`, usedTables);
    addFilterableDataSheet(
      wb,
      sName,
      tName,
      `BM CONSTRUCCIONES S.A. — ${rep.titulo.toUpperCase()}`,
      `Generado el ${stamp} · Filtros nativos por columna y totales dinámicos.`,
      rep.columnas,
      rep.filas,
      rep.kpis,
    );
  }

  return wb;
}

export async function buildVoidingHistoryWorkbook(
  history: VoidingHistoryResponse,
  generatedAt = new Date(),
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BM Construcciones ERP — Historial de Anulaciones';
  wb.created = generatedAt;
  wb.calcProperties.fullCalcOnLoad = true;

  const stamp = formatStamp(generatedAt);
  const usedSheets = new Set<string>();
  const usedTables = new Set<string>();

  const docsSheet: ExtraReportSheet = {
    id: 'documentos_anulados',
    nombreHoja: 'Documentos Anulados',
    titulo: 'Registro de Documentos Anulados / Cancelados',
    subtitulo: 'Todos los documentos anulados con indicador de impacto en inventario y contabilidad.',
    columnas: [
      { key: 'tipoDocumento', label: 'Tipo Documento', type: 'badge' },
      { key: 'codigo', label: 'Código / Folio', type: 'text' },
      { key: 'fecha', label: 'Fecha', type: 'date' },
      { key: 'tercero', label: 'Cliente / Proveedor', type: 'text' },
      { key: 'descripcion', label: 'Descripción', type: 'text' },
      { key: 'monto', label: 'Monto (C$)', type: 'currency', sumInTotals: true },
      { key: 'estado', label: 'Estado', type: 'badge' },
      { key: 'afectaInventario', label: 'Impacto Inventario', type: 'text' },
      { key: 'afectaContabilidad', label: 'Impacto Contable', type: 'text' },
    ],
    filas: history.documentosAnulados.map((d) => ({
      ...d,
      afectaInventario: d.afectaInventario ? 'SÍ' : 'NO',
      afectaContabilidad: d.afectaContabilidad ? 'SÍ' : 'NO',
    })),
  };

  addFilterableDataSheet(
    wb,
    sanitizeSheetName(docsSheet.nombreHoja, usedSheets),
    sanitizeTableName('TablaDocsAnulados', usedTables),
    `BM CONSTRUCCIONES S.A. — ${docsSheet.titulo.toUpperCase()}`,
    `Generado el ${stamp} · ${docsSheet.subtitulo}`,
    docsSheet.columnas,
    docsSheet.filas,
  );

  addFilterableDataSheet(
    wb,
    sanitizeSheetName('Bitácora Forense', usedSheets),
    sanitizeTableName('TablaBitacoraAnulaciones', usedTables),
    'BM CONSTRUCCIONES S.A. — BITÁCORA DE AUDITORÍA DE ANULACIONES',
    `Generado el ${stamp} · Trazabilidad de usuario, fecha, entidad y motivo.`,
    [
      { key: 'fecha', label: 'Fecha / Hora', type: 'date' },
      { key: 'accion', label: 'Acción', type: 'badge' },
      { key: 'entidadTipo', label: 'Entidad', type: 'text' },
      { key: 'usuario', label: 'Usuario', type: 'text' },
      { key: 'detalles', label: 'Detalle / Motivo', type: 'text' },
    ],
    history.bitacoraAnulaciones.map((b) => ({
      ...b,
      fecha: b.fecha.slice(0, 19).replace('T', ' '),
    })),
  );

  return wb;
}

function triggerWorkbookDownload(buffer: ArrayBuffer, fileName: string): void {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export async function exportReportToExcel(
  report: ReportPayload,
  generatedAt = new Date(),
): Promise<string> {
  const wb = await buildReportWorkbook(report, generatedAt);
  const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  const datePart = generatedAt.toISOString().slice(0, 10);
  const fileName = `reporte_${report.tipo}_bm_${datePart}.xlsx`;
  triggerWorkbookDownload(buffer, fileName);
  return fileName;
}

export async function exportConsolidatedReportToExcel(
  consolidated: ConsolidatedReportResponse,
  generatedAt = new Date(),
): Promise<string> {
  const wb = await buildConsolidatedWorkbook(consolidated, generatedAt);
  const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  const datePart = generatedAt.toISOString().slice(0, 10);
  const fileName = `reporte_consolidado_erp_bm_${datePart}.xlsx`;
  triggerWorkbookDownload(buffer, fileName);
  return fileName;
}

export async function exportVoidingHistoryToExcel(
  history: VoidingHistoryResponse,
  generatedAt = new Date(),
): Promise<string> {
  const wb = await buildVoidingHistoryWorkbook(history, generatedAt);
  const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  const datePart = generatedAt.toISOString().slice(0, 10);
  const fileName = `historial_anulaciones_bm_${datePart}.xlsx`;
  triggerWorkbookDownload(buffer, fileName);
  return fileName;
}
