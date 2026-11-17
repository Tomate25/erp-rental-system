import ExcelJS from 'exceljs';
import type {
  GroupedProduct,
  InventorySummary,
  ProductUnitsResponse,
} from '../types/grouped-inventory.types';

export interface ExportInventoryWorkbookParams {
  products: GroupedProduct[];
  summary?: InventorySummary | null;
  unitsMap?: Record<string, ProductUnitsResponse>;
  generatedAt?: Date;
}

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF0F172A' },
};

const BANNER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A8A' },
};

const SUBHEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF1F5F9' },
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

const CURRENCY_FORMAT = '"C$"#,##0.00';
const INT_FORMAT = '#,##0';
const PERCENT_FORMAT = '0.0%';

function formatOriginLabel(product: GroupedProduct): string {
  if (product.incluyeProveedor && product.incluyePropio) return 'Propio y Proveedor';
  if (product.incluyeProveedor) return 'De Proveedor';
  return 'Propio';
}

function getBaseRate(product: GroupedProduct): number {
  if (product.tarifa === 'HORA') {
    return Number(product.precioHoraA ?? product.precioDiaA ?? 0);
  }
  return Number(product.precioDiaA ?? product.precioHoraA ?? 0);
}

function toNullableCurrency(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return null;
  }
  return Number(value);
}

function formatDateStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function applyBanner(
  ws: ExcelJS.Worksheet,
  lastColLetter: string,
  title: string,
  subtitle: string,
): void {
  ws.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = ws.getCell('A1');
  titleCell.value = title;
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = BANNER_FILL;
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 30;

  ws.mergeCells(`A2:${lastColLetter}2`);
  const subCell = ws.getCell('A2');
  subCell.value = subtitle;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
  subCell.fill = SUBHEADER_FILL;
  subCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 20;
}

function autoFitColumns(
  ws: ExcelJS.Worksheet,
  headerRowIndex: number,
  minWidth = 12,
  maxWidth = 42,
): void {
  ws.columns.forEach((col, colIdx) => {
    let longest = minWidth;
    ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
      if (rowNum < headerRowIndex) return;
      const val = row.getCell(colIdx + 1).value;
      if (val === null || val === undefined) return;
      const text =
        typeof val === 'object' && 'result' in val
          ? String(val.result ?? '')
          : String(val);
      const len = text.length + 4;
      if (len > longest) longest = len;
    });
    col.width = Math.min(Math.max(longest, minWidth), maxWidth);
  });
}

function styleTableRows(
  ws: ExcelJS.Worksheet,
  headerRowIndex: number,
  dataLength: number,
  colCount: number,
  currencyCols: number[],
  intCols: number[],
  percentCols: number[],
  hasTotalsRow = true,
): void {
  const headerRow = ws.getRow(headerRowIndex);
  headerRow.height = 26;
  for (let c = 1; c <= colCount; c++) {
    const cell = headerRow.getCell(c);
    cell.fill = HEADER_FILL;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = CELL_BORDER;
  }

  const lastDataRow = headerRowIndex + dataLength;
  for (let r = headerRowIndex + 1; r <= lastDataRow; r++) {
    const row = ws.getRow(r);
    row.height = 21;
    const isEven = (r - headerRowIndex) % 2 === 0;
    for (let c = 1; c <= colCount; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } };
      cell.border = CELL_BORDER;
      if (isEven) cell.fill = ZEBRA_FILL;

      if (currencyCols.includes(c)) {
        cell.numFmt = CURRENCY_FORMAT;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (intCols.includes(c)) {
        cell.numFmt = INT_FORMAT;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (percentCols.includes(c)) {
        cell.numFmt = PERCENT_FORMAT;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    }
  }

  if (hasTotalsRow) {
    const totalsRow = ws.getRow(lastDataRow + 1);
    totalsRow.height = 24;
    for (let c = 1; c <= colCount; c++) {
      const cell = totalsRow.getCell(c);
      cell.fill = TOTALS_FILL;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
        bottom: { style: 'double', color: { argb: 'FF1E3A8A' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
      if (currencyCols.includes(c)) {
        cell.numFmt = CURRENCY_FORMAT;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (intCols.includes(c)) {
        cell.numFmt = INT_FORMAT;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else if (percentCols.includes(c)) {
        cell.numFmt = PERCENT_FORMAT;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }
    }
  }
}

function computeTotalsFromProducts(products: GroupedProduct[]): InventorySummary {
  let totalUnidades = 0;
  let unidadesDisponibles = 0;
  let unidadesAlquiladas = 0;
  let unidadesReservadas = 0;
  let unidadesEnReparacion = 0;
  let unidadesBaja = 0;

  for (const p of products) {
    totalUnidades += p.total;
    unidadesDisponibles += p.porEstado.DISPONIBLE;
    unidadesAlquiladas += p.porEstado.ALQUILADO;
    unidadesReservadas += p.porEstado.RESERVADO;
    unidadesEnReparacion += p.porEstado.EN_REPARACION;
    unidadesBaja += p.porEstado.BAJA;
  }

  const activas = Math.max(0, totalUnidades - unidadesBaja);
  const ocupadas = unidadesAlquiladas + unidadesReservadas;
  const porcentajeOcupacion =
    activas > 0 ? Math.round((ocupadas / activas) * 1000) / 10 : 0;

  return {
    totalUnidades,
    porcentajeOcupacion,
    unidadesDisponibles,
    unidadesAlquiladas,
    unidadesReservadas,
    unidadesEnReparacion,
    unidadesBaja,
  };
}

/**
 * Construye un libro Excel (.xlsx) estilizado con tablas nativas y filtros automáticos por columna.
 */
export async function buildInventoryWorkbook({
  products,
  summary,
  unitsMap = {},
  generatedAt = new Date(),
}: ExportInventoryWorkbookParams): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'BM Construcciones ERP';
  wb.created = generatedAt;

  const sortedProducts = [...products].sort((a, b) => {
    const famCmp = a.familia.localeCompare(b.familia, 'es');
    if (famCmp !== 0) return famCmp;
    return a.nombre.localeCompare(b.nombre, 'es');
  });

  const kpi = summary ?? computeTotalsFromProducts(sortedProducts);
  const stamp = formatDateStamp(generatedAt);

  // =========================================================================
  // HOJA 1: INVENTARIO COMPLETO (PRODUCTOS + TARIFAS + CATEGORÍAS + TOTALES)
  // =========================================================================
  const wsProducts = wb.addWorksheet('Inventario Completo', {
    views: [{ state: 'frozen', ySplit: 7, showGridLines: true }],
  });

  applyBanner(
    wsProducts,
    'U',
    'BM CONSTRUCCIONES S.A. — INVENTARIO GENERAL, TARIFAS Y EXISTENCIAS',
    `Generado el ${stamp} · Usa los botones de filtro en los encabezados para filtrar por Producto, Familia/Categoría, Tarifa, Marca u Origen.`,
  );

  // Tarjetas KPI en filas 4-5
  const kpiCards: Array<{ col: string; label: string; value: number; fmt: string }> = [
    { col: 'A', label: 'TOTAL PRODUCTOS (MODELOS)', value: sortedProducts.length, fmt: INT_FORMAT },
    { col: 'B', label: 'TOTAL UNIDADES EN INVENTARIO', value: kpi.totalUnidades, fmt: INT_FORMAT },
    { col: 'C', label: 'DISPONIBLES', value: kpi.unidadesDisponibles, fmt: INT_FORMAT },
    { col: 'D', label: 'ALQUILADAS', value: kpi.unidadesAlquiladas, fmt: INT_FORMAT },
    { col: 'E', label: 'RESERVADAS', value: kpi.unidadesReservadas, fmt: INT_FORMAT },
    { col: 'F', label: 'EN REPARACIÓN', value: kpi.unidadesEnReparacion, fmt: INT_FORMAT },
    { col: 'G', label: 'BAJA', value: kpi.unidadesBaja, fmt: INT_FORMAT },
    {
      col: 'H',
      label: '% OCUPACIÓN',
      value: Number(kpi.porcentajeOcupacion || 0) / 100,
      fmt: PERCENT_FORMAT,
    },
  ];

  wsProducts.getRow(4).height = 18;
  wsProducts.getRow(5).height = 24;
  for (const card of kpiCards) {
    const lblCell = wsProducts.getCell(`${card.col}4`);
    lblCell.value = card.label;
    lblCell.font = { name: 'Calibri', size: 8, bold: true, color: { argb: 'FF475569' } };
    lblCell.fill = KPI_LABEL_FILL;
    lblCell.alignment = { vertical: 'middle', horizontal: 'center' };
    lblCell.border = CELL_BORDER;

    const valCell = wsProducts.getCell(`${card.col}5`);
    valCell.value = card.value;
    valCell.numFmt = card.fmt;
    valCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    valCell.alignment = { vertical: 'middle', horizontal: 'center' };
    valCell.border = CELL_BORDER;
  }

  const productRows = sortedProducts.map((p) => [
    p.nombre,
    p.familia,
    p.marca || 'N/D',
    p.tarifa === 'HORA' ? 'Por Hora' : 'Por Día',
    p.tipoControl === 'SERIALIZADO' ? 'Serializado' : 'Por Cantidad',
    getBaseRate(p),
    toNullableCurrency(p.precioDiaA),
    toNullableCurrency(p.precioDiaB),
    toNullableCurrency(p.precioDiaC),
    toNullableCurrency(p.precioHoraA),
    toNullableCurrency(p.precioHoraB),
    toNullableCurrency(p.precioHoraC),
    p.total,
    p.porEstado.DISPONIBLE,
    p.porEstado.ALQUILADO,
    p.porEstado.RESERVADO,
    p.porEstado.EN_REPARACION,
    p.porEstado.BAJA,
    (p.porcentajeOcupacion || 0) / 100,
    formatOriginLabel(p),
    p.tieneNoPromovible ? 'Restringido / Mixto' : 'Sí',
  ]);

  const productRowsForTable =
    productRows.length > 0
      ? productRows
      : [['Sin registros de inventario', '-', '-', '-', '-', 0, null, null, null, null, null, null, 0, 0, 0, 0, 0, 0, 0, '-', '-']];

  wsProducts.addTable({
    name: 'TablaInventarioProductos',
    ref: 'A7',
    headerRow: true,
    totalsRow: true,
    style: {
      theme: 'TableStyleMedium2',
      showRowStripes: true,
    },
    columns: [
      { name: 'Producto', totalsRowLabel: 'TOTALES (FILTRADOS):', filterButton: true },
      { name: 'Familia / Categoría', filterButton: true },
      { name: 'Marca', filterButton: true },
      { name: 'Tarifa', filterButton: true },
      { name: 'Control', filterButton: true },
      { name: 'Tarifa Base (C$)', filterButton: true },
      { name: 'Tarifa Día A (C$)', filterButton: true },
      { name: 'Tarifa Día B (C$)', filterButton: true },
      { name: 'Tarifa Día C (C$)', filterButton: true },
      { name: 'Tarifa Hora A (C$)', filterButton: true },
      { name: 'Tarifa Hora B (C$)', filterButton: true },
      { name: 'Tarifa Hora C (C$)', filterButton: true },
      { name: 'Total Productos', totalsRowFunction: 'sum', filterButton: true },
      { name: 'Disponibles', totalsRowFunction: 'sum', filterButton: true },
      { name: 'Alquilados', totalsRowFunction: 'sum', filterButton: true },
      { name: 'Reservados', totalsRowFunction: 'sum', filterButton: true },
      { name: 'En Reparación', totalsRowFunction: 'sum', filterButton: true },
      { name: 'Baja', totalsRowFunction: 'sum', filterButton: true },
      { name: '% Ocupación', filterButton: true },
      { name: 'Origen', filterButton: true },
      { name: 'Renta Habilitada', filterButton: true },
    ],
    rows: productRowsForTable,
  });

  styleTableRows(
    wsProducts,
    7,
    productRowsForTable.length,
    21,
    [6, 7, 8, 9, 10, 11, 12],
    [13, 14, 15, 16, 17, 18],
    [19],
    true,
  );
  autoFitColumns(wsProducts, 7, 13, 44);

  // =========================================================================
  // HOJA 2: RESUMEN POR FAMILIA / CATEGORÍA
  // =========================================================================
  const wsFamilies = wb.addWorksheet('Resumen por Familia', {
    views: [{ state: 'frozen', ySplit: 4, showGridLines: true }],
  });

  applyBanner(
    wsFamilies,
    'I',
    'BM CONSTRUCCIONES S.A. — RESUMEN POR FAMILIA / CATEGORÍA',
    `Generado el ${stamp} · Consolidado de modelos y cantidades por familia con filtros de Excel.`,
  );

  const familyMap = new Map<
    string,
    {
      familia: string;
      modelos: number;
      total: number;
      disponibles: number;
      alquilados: number;
      reservados: number;
      enReparacion: number;
      baja: number;
    }
  >();

  for (const p of sortedProducts) {
    const key = p.familia || 'General';
    const current = familyMap.get(key) || {
      familia: key,
      modelos: 0,
      total: 0,
      disponibles: 0,
      alquilados: 0,
      reservados: 0,
      enReparacion: 0,
      baja: 0,
    };
    current.modelos += 1;
    current.total += p.total;
    current.disponibles += p.porEstado.DISPONIBLE;
    current.alquilados += p.porEstado.ALQUILADO;
    current.reservados += p.porEstado.RESERVADO;
    current.enReparacion += p.porEstado.EN_REPARACION;
    current.baja += p.porEstado.BAJA;
    familyMap.set(key, current);
  }

  const familyRows = Array.from(familyMap.values())
    .sort((a, b) => b.total - a.total)
    .map((f) => {
      const activas = Math.max(0, f.total - f.baja);
      const occ = activas > 0 ? (f.alquilados + f.reservados) / activas : 0;
      return [
        f.familia,
        f.modelos,
        f.total,
        f.disponibles,
        f.alquilados,
        f.reservados,
        f.enReparacion,
        f.baja,
        occ,
      ];
    });

  const familyRowsForTable =
    familyRows.length > 0 ? familyRows : [['Sin familias', 0, 0, 0, 0, 0, 0, 0, 0]];

  wsFamilies.addTable({
    name: 'TablaResumenFamilias',
    ref: 'A4',
    headerRow: true,
    totalsRow: true,
    style: {
      theme: 'TableStyleMedium2',
      showRowStripes: true,
    },
    columns: [
      { name: 'Familia / Categoría', totalsRowLabel: 'TOTAL GENERAL:', filterButton: true },
      { name: 'Cant. Productos', totalsRowFunction: 'sum', filterButton: true },
      { name: 'Total Unidades', totalsRowFunction: 'sum', filterButton: true },
      { name: 'Disponibles', totalsRowFunction: 'sum', filterButton: true },
      { name: 'Alquilados', totalsRowFunction: 'sum', filterButton: true },
      { name: 'Reservados', totalsRowFunction: 'sum', filterButton: true },
      { name: 'En Reparación', totalsRowFunction: 'sum', filterButton: true },
      { name: 'Baja', totalsRowFunction: 'sum', filterButton: true },
      { name: '% Ocupación', filterButton: true },
    ],
    rows: familyRowsForTable,
  });

  styleTableRows(
    wsFamilies,
    4,
    familyRowsForTable.length,
    9,
    [],
    [2, 3, 4, 5, 6, 7, 8],
    [9],
    true,
  );
  autoFitColumns(wsFamilies, 4, 14, 38);

  // =========================================================================
  // HOJA 3: DETALLE POR UNIDAD / LOTE
  // =========================================================================
  const unitRows: Array<Array<string | number | null>> = [];
  for (const p of sortedProducts) {
    const unitEntry = unitsMap[p.productoId];
    if (!unitEntry) continue;

    if (unitEntry.tipoControl === 'SERIALIZADO') {
      for (const u of unitEntry.unidades) {
        unitRows.push([
          p.nombre,
          p.familia,
          p.tarifa === 'HORA' ? 'Por Hora' : 'Por Día',
          'Serializado',
          u.codigo || 'S/C',
          u.serie || 'S/N',
          u.marca || p.marca || 'N/D',
          u.modelo || p.nombre,
          u.estado,
          1,
          getBaseRate(p),
          u.origenEquipo === 'PROVEEDOR' ? 'PROVEEDOR' : 'PROPIO',
          u.proveedorNombre || '-',
          toNullableCurrency(u.precioProveedor),
          u.clienteAsignado || '-',
          u.contratoNumero || '-',
          u.fechaDevolucion || '-',
          u.horometro !== null && u.horometro !== undefined ? Number(u.horometro) : null,
          u.disponibleParaRenta === false ? 'No' : 'Sí',
        ]);
      }
    } else {
      const lotes = unitEntry.desglose?.lotes || [];
      if (lotes.length > 0) {
        lotes.forEach((lote, idx) => {
          unitRows.push([
            p.nombre,
            p.familia,
            p.tarifa === 'HORA' ? 'Por Hora' : 'Por Día',
            'Por Cantidad',
            lote.codigo || 'S/C',
            `Lote ${idx + 1}`,
            p.marca || 'N/D',
            p.nombre,
            p.porEstado.DISPONIBLE > 0 ? 'DISPONIBLE' : 'OCUPADO',
            idx === 0 ? p.total : 0,
            getBaseRate(p),
            lote.origenEquipo === 'PROVEEDOR' ? 'PROVEEDOR' : 'PROPIO',
            lote.proveedorNombre || '-',
            toNullableCurrency(lote.precioProveedor),
            '-',
            '-',
            '-',
            null,
            lote.disponibleParaRenta === false ? 'No' : 'Sí',
          ]);
        });
      }
    }
  }

  if (unitRows.length > 0) {
    const wsUnits = wb.addWorksheet('Detalle Unidades y Lotes', {
      views: [{ state: 'frozen', ySplit: 4, showGridLines: true }],
    });

    applyBanner(
      wsUnits,
      'S',
      'BM CONSTRUCCIONES S.A. — DETALLE INDIVIDUAL DE UNIDADES Y LOTES',
      `Generado el ${stamp} · Filtra por código, serie, estado, proveedor o cliente asignado.`,
    );

    wsUnits.addTable({
      name: 'TablaDetalleUnidades',
      ref: 'A4',
      headerRow: true,
      totalsRow: true,
      style: {
        theme: 'TableStyleMedium2',
        showRowStripes: true,
      },
      columns: [
        { name: 'Producto', totalsRowLabel: 'TOTAL UNIDADES:', filterButton: true },
        { name: 'Familia / Categoría', filterButton: true },
        { name: 'Tarifa', filterButton: true },
        { name: 'Control', filterButton: true },
        { name: 'Código', filterButton: true },
        { name: 'Serie / Lote', filterButton: true },
        { name: 'Marca', filterButton: true },
        { name: 'Modelo', filterButton: true },
        { name: 'Estado', filterButton: true },
        { name: 'Cantidad', totalsRowFunction: 'sum', filterButton: true },
        { name: 'Tarifa Base (C$)', filterButton: true },
        { name: 'Origen', filterButton: true },
        { name: 'Proveedor', filterButton: true },
        { name: 'Costo Proveedor (C$)', filterButton: true },
        { name: 'Cliente Asignado', filterButton: true },
        { name: 'Contrato', filterButton: true },
        { name: 'Fecha Devolución', filterButton: true },
        { name: 'Horómetro', filterButton: true },
        { name: 'Renta Habilitada', filterButton: true },
      ],
      rows: unitRows,
    });

    styleTableRows(
      wsUnits,
      4,
      unitRows.length,
      19,
      [11, 14],
      [10],
      [],
      true,
    );
    autoFitColumns(wsUnits, 4, 12, 38);
  }

  return wb;
}

/**
 * Genera y descarga el reporte completo de inventario en formato Excel (.xlsx) con tablas filtrables.
 */
export async function exportInventoryToExcel(
  params: ExportInventoryWorkbookParams,
  customFileName?: string,
): Promise<string> {
  const wb = await buildInventoryWorkbook(params);
  const buffer = await wb.xlsx.writeBuffer();
  const datePart = (params.generatedAt ?? new Date()).toISOString().slice(0, 10);
  const fileName = customFileName || `inventario_bm_construcciones_${datePart}.xlsx`;

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

  return fileName;
}
