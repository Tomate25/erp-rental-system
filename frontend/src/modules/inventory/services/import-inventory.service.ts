import * as XLSX from 'xlsx';
import type {
  RawImportRow,
  ValidatedImportRow,
  ImportSummary,
  ImportTarifa,
} from '../types/import-inventory.types';
import type { GroupedProduct } from '../types/grouped-inventory.types';
import {
  findSimilarProducts,
  normalizeText,
} from '../utils/inventory-similarity';

/**
 * Normaliza claves de encabezados que puedan venir con acentos, espacios o mayúsculas
 */
function normalizeHeaderKey(key: string): string {
  const k = normalizeText(key).replace(/\s+/g, '');
  if (k.includes('cod') || k === 'codigo') return 'codigo';
  if (k.includes('desc') || k.includes('nombre') || k.includes('producto')) return 'descripcion';
  if (k.includes('cant') || k.includes('stock')) return 'cantidad';
  if (k.includes('tarifa') || k.includes('precio') || k.includes('modalidad')) return 'tarifa';
  if (k.includes('tipo') || k.includes('familia') || k.includes('categoria')) return 'tipo';
  if (k.includes('marca')) return 'marca';
  if (k.includes('modelo')) return 'modelo';
  if (k.includes('serie') || k.includes('noserie') || k.includes('sn')) return 'serie';
  return k;
}

/**
 * Normaliza la tarifa a 'POR HORA' o 'POR DIA'
 */
function parseTarifa(tarifaRaw: unknown): ImportTarifa | null {
  if (!tarifaRaw) return null;
  const str = String(tarifaRaw).trim().toUpperCase();
  if (str.includes('HORA') || str === 'POR HORA' || str === 'H') return 'POR HORA';
  if (str.includes('DIA') || str === 'POR DIA' || str === 'D') return 'POR DIA';
  return null;
}

/**
 * Genera y descarga la plantilla oficial de inventario en Excel (.xlsx)
 */
export function downloadInventoryTemplate(): void {
  const headers = [
    'Código',
    'Descripción',
    'Cantidad',
    'Tarifa',
    'Tipo',
    'Marca',
    'Modelo',
    'Serie',
  ];

  const exampleRows = [
    [
      '08-01',
      'Bobcat Caterpillar 236D3',
      1,
      'POR HORA',
      'Línea Amarilla',
      'Caterpillar',
      '236D3',
      'CAT236D3001',
    ],
    [
      '01-01',
      'Compactadora Masalta MS60',
      1,
      'POR DIA',
      'Compactación',
      'Masalta',
      'MS60',
      'MS60-0192',
    ],
    [
      '12-01',
      'Cuñas para encofrado metálico',
      1000,
      'POR DIA',
      'Encofrados',
      'BM',
      'Estándar',
      'S/N',
    ],
    [
      '05-01',
      'Andamios metálicos 1.5x2.0m',
      500,
      'POR DIA',
      'Andamios',
      'BM',
      'Universal',
      'S/N',
    ],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);

  // Anchos de columna visualmente agradables
  ws['!cols'] = [
    { wch: 12 }, // Código
    { wch: 38 }, // Descripción
    { wch: 12 }, // Cantidad
    { wch: 16 }, // Tarifa
    { wch: 22 }, // Tipo
    { wch: 18 }, // Marca
    { wch: 18 }, // Modelo
    { wch: 20 }, // Serie
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Inventario');
  XLSX.writeFile(wb, 'plantilla_inventario_bismark.xlsx');
}

/**
 * Lee un archivo .xlsx o .csv en memoria y lo transforma a RawImportRow[]
 */
export async function parseExcelOrCsv(file: File): Promise<RawImportRow[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('El archivo Excel no contiene ninguna hoja de datos.');
  }

  const ws = wb.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

  const rawRows: RawImportRow[] = [];

  for (const row of jsonData) {
    const raw: RawImportRow = {};
    for (const [key, val] of Object.entries(row)) {
      const normalizedKey = normalizeHeaderKey(key);
      if (normalizedKey === 'codigo') raw.codigo = String(val ?? '').trim();
      else if (normalizedKey === 'descripcion') raw.descripcion = String(val ?? '').trim();
      else if (normalizedKey === 'cantidad') {
        const num = Number(val);
        raw.cantidad = isNaN(num) ? String(val).trim() : num;
      } else if (normalizedKey === 'tarifa') raw.tarifa = String(val ?? '').trim();
      else if (normalizedKey === 'tipo') raw.tipo = String(val ?? '').trim();
      else if (normalizedKey === 'marca') raw.marca = String(val ?? '').trim();
      else if (normalizedKey === 'modelo') raw.modelo = String(val ?? '').trim();
      else if (normalizedKey === 'serie') raw.serie = String(val ?? '').trim();
    }

    // Omitir filas totalmente vacías
    if (raw.codigo || raw.descripcion || raw.serie) {
      rawRows.push(raw);
    }
  }

  return rawRows;
}

/**
 * Valida y clasifica todas las filas importadas contra los productos y equipos existentes
 */
export function validateImportRows(
  rawRows: RawImportRow[],
  existingProducts: GroupedProduct[],
  existingEquipments: Array<{ codigo?: string | null; numeroSerie?: string | null }>
): { summary: ImportSummary; rows: ValidatedImportRow[] } {
  // Mapas para verificar duplicados dentro del archivo
  const fileSerialsCount = new Map<string, number>();
  const fileCodesCount = new Map<string, number>();

  for (const r of rawRows) {
    const s = r.serie ? String(r.serie).trim().toUpperCase() : '';
    if (s && s !== 'S/N' && s !== 'N/A' && s !== 'SN' && s !== 'SIN SERIE') {
      fileSerialsCount.set(s, (fileSerialsCount.get(s) || 0) + 1);
    }
    const c = r.codigo ? String(r.codigo).trim().toUpperCase() : '';
    if (c) {
      fileCodesCount.set(c, (fileCodesCount.get(c) || 0) + 1);
    }
  }

  const existingSerialSet = new Set(
    existingEquipments
      .map((e) => (e.numeroSerie ? e.numeroSerie.trim().toUpperCase() : ''))
      .filter((s) => s && s !== 'S/N' && s !== 'N/A')
  );

  const existingCodeSet = new Set(
    existingEquipments
      .map((e) => (e.codigo ? e.codigo.trim().toUpperCase() : ''))
      .filter(Boolean)
  );

  const validatedRows: ValidatedImportRow[] = [];

  let validNewCount = 0;
  let validExistingCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  for (let idx = 0; idx < rawRows.length; idx++) {
    const r = rawRows[idx];
    const rowNumber = idx + 1;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validar código
    const codigoStr = r.codigo !== undefined && r.codigo !== null ? String(r.codigo).trim() : '';
    if (!codigoStr) {
      errors.push('El código de artículo es obligatorio.');
    } else {
      const codeUpper = codigoStr.toUpperCase();
      if ((fileCodesCount.get(codeUpper) || 0) > 1) {
        errors.push(`El código "${codigoStr}" está repetido en el archivo.`);
      }
      if (existingCodeSet.has(codeUpper)) {
        errors.push(`El código "${codigoStr}" ya existe en la base de datos.`);
      }
    }

    // Validar descripción
    const descripcionStr = r.descripcion ? String(r.descripcion).trim() : '';
    if (!descripcionStr) {
      errors.push('La descripción del producto es obligatoria.');
    }

    // Validar cantidad
    const cantidadNum = typeof r.cantidad === 'number' ? r.cantidad : parseInt(String(r.cantidad || '0'), 10);
    if (isNaN(cantidadNum) || cantidadNum <= 0) {
      errors.push('La cantidad debe ser un número entero mayor a 0.');
    }

    // Validar tarifa
    const parsedTar = parseTarifa(r.tarifa);
    if (!parsedTar) {
      errors.push(`Tarifa inválida: "${r.tarifa || ''}". Debe ser "POR HORA" o "POR DIA".`);
    }

    // Validar serie
    const serieStr = r.serie !== undefined && r.serie !== null ? String(r.serie).trim() : 'S/N';
    const serieUpper = serieStr.toUpperCase();
    const hasValidSerial = serieUpper && serieUpper !== 'S/N' && serieUpper !== 'N/A' && serieUpper !== 'SIN SERIE';

    if (hasValidSerial) {
      if ((fileSerialsCount.get(serieUpper) || 0) > 1) {
        errors.push(`La serie "${serieStr}" está duplicada dentro del archivo.`);
      }
      if (existingSerialSet.has(serieUpper)) {
        errors.push(`La serie "${serieStr}" ya está registrada en la base de datos.`);
      }
      if (cantidadNum > 1) {
        errors.push('Un equipo con número de serie específico debe tener cantidad = 1.');
      }
    }

    // Detección de similitud y agrupación
    let status: ValidatedImportRow['status'] = 'VALID_NEW';
    let matchedProductId: string | undefined;
    let matchedProductName: string | undefined;
    let similarityScore: number | undefined;

    if (descripcionStr) {
      const matches = findSimilarProducts(
        descripcionStr,
        existingProducts.map((p) => ({
          id: p.productoId,
          nombre: p.nombre,
          familia: p.familia,
          marca: p.marca,
        })),
        0.70
      );

      if (matches.length > 0) {
        const topMatch = matches[0];
        similarityScore = topMatch.similarity;
        matchedProductId = topMatch.id;
        matchedProductName = topMatch.nombre;

        if (topMatch.similarity >= 0.98 || normalizeText(descripcionStr) === normalizeText(topMatch.nombre)) {
          // Coincidencia exacta o casi idéntica -> Se agrupa limpiamente
          status = 'VALID_EXISTING';
        } else {
          // Similitud entre 70% y 97% -> Advertencia ámbar
          status = 'WARNING';
          warnings.push(
            `Nombre similar a "${topMatch.nombre}" (${Math.round(topMatch.similarity * 100)}% similitud). Decide si unir al grupo existente o crear uno nuevo.`
          );
        }
      }
    }

    // Si hubo errores, el estado pasa obligatoriamente a ERROR
    if (errors.length > 0) {
      status = 'ERROR';
      errorCount++;
    } else if (status === 'WARNING') {
      warningCount++;
    } else if (status === 'VALID_EXISTING') {
      validExistingCount++;
    } else {
      validNewCount++;
    }

    validatedRows.push({
      id: `row-${rowNumber}`,
      rowNumber,
      codigo: codigoStr,
      descripcion: descripcionStr,
      cantidad: cantidadNum > 0 ? cantidadNum : 1,
      tarifa: parsedTar || 'POR DIA',
      tipo: r.tipo ? String(r.tipo).trim() : 'General',
      marca: r.marca ? String(r.marca).trim() : 'N/D',
      modelo: r.modelo ? String(r.modelo).trim() : descripcionStr,
      serie: serieStr || 'S/N',
      status,
      matchedProductId,
      matchedProductName,
      similarity: similarityScore,
      userDecision: status === 'WARNING' ? 'MERGE' : undefined,
      errors,
      warnings,
    });
  }

  const summary: ImportSummary = {
    totalRows: rawRows.length,
    validNewCount,
    validExistingCount,
    warningCount,
    errorCount,
    canCommit: errorCount === 0 && rawRows.length > 0,
  };

  return { summary, rows: validatedRows };
}

/**
 * Descarga únicamente las filas con error en un archivo Excel con la columna "Motivo del Error"
 */
export function downloadErrorReportExcel(errorRows: ValidatedImportRow[]): void {
  if (errorRows.length === 0) return;

  const data = errorRows.map((r) => ({
    Fila: r.rowNumber,
    Código: r.codigo,
    Descripción: r.descripcion,
    Cantidad: r.cantidad,
    Tarifa: r.tarifa,
    Tipo: r.tipo,
    Marca: r.marca,
    Modelo: r.modelo,
    Serie: r.serie,
    'Motivo del Error': r.errors.join(' | '),
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  ws['!cols'] = [
    { wch: 8 },
    { wch: 12 },
    { wch: 35 },
    { wch: 10 },
    { wch: 12 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 45 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Errores de Importación');
  XLSX.writeFile(wb, `errores_inventario_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
