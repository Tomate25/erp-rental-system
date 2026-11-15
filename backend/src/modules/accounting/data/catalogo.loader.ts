import * as fs from 'fs';
import * as path from 'path';

export interface CuentaCatalogo {
  codigo: string;
  nombre: string;
  nivel: number;
  tipo: string;
  naturaleza: 'Deudora' | 'Acreedora';
  aceptaMovimiento: boolean;
  esControl: boolean;
  mayorCodigo?: string;
  mayorNombre?: string;
  estado?: string;
  renglon?: string;
  modulo: string;
  dimensiones: string;
  nota: string;
  qbTipo: string;
  qbNombre: string;
  qbClass: string;
}

export interface SaldoInicialSeedItem {
  codigo: string;
  nombre: string;
  deudor: number;
  acreedor: number;
}

export interface SaldosInicialesSeed {
  empresa: string;
  ruc: string;
  fechaCorte: string;
  descripcion: string;
  totalDeudor: number;
  totalAcreedor: number;
  items: SaldoInicialSeedItem[];
}

function readJsonFromCandidates<T>(fileName: string): T | null {
  const candidatePaths = [
    path.join(__dirname, fileName),
    path.join(process.cwd(), 'dist', 'modules', 'accounting', 'data', fileName),
    path.join(process.cwd(), 'dist', 'src', 'modules', 'accounting', 'data', fileName),
    path.join(__dirname, '..', '..', '..', '..', 'modules', 'accounting', 'data', fileName),
    path.join(process.cwd(), 'src', 'modules', 'accounting', 'data', fileName),
    path.join(process.cwd(), 'backend', 'src', 'modules', 'accounting', 'data', fileName),
    path.join(__dirname, '..', '..', '..', 'src', 'modules', 'accounting', 'data', fileName),
    path.join(__dirname, '..', '..', '..', 'backend', 'src', 'modules', 'accounting', 'data', fileName),
  ];

  for (const jsonPath of candidatePaths) {
    try {
      if (fs.existsSync(jsonPath)) {
        const raw = fs.readFileSync(jsonPath, 'utf8');
        return JSON.parse(raw) as T;
      }
    } catch {
      // Intentar siguiente ruta candidata
    }
  }

  console.warn(`Advertencia: No se encontró ${fileName} en rutas candidatas:`, candidatePaths);
  return null;
}

let cachedCatalogo: CuentaCatalogo[] | null = null;
let cachedSaldosOficiales: SaldosInicialesSeed | null = null;

export function getCatalogoOficial(): CuentaCatalogo[] {
  if (cachedCatalogo && cachedCatalogo.length > 0) {
    return cachedCatalogo;
  }
  const parsed = readJsonFromCandidates<CuentaCatalogo[]>('catalogo-cuentas-bm.json');
  if (Array.isArray(parsed) && parsed.length > 0) {
    cachedCatalogo = parsed;
    return cachedCatalogo;
  }
  return [];
}

export function getSaldosInicialesOficiales(): SaldosInicialesSeed | null {
  if (cachedSaldosOficiales) {
    return cachedSaldosOficiales;
  }
  const parsed = readJsonFromCandidates<SaldosInicialesSeed>('saldos-iniciales-bm.json');
  if (parsed && Array.isArray(parsed.items)) {
    cachedSaldosOficiales = parsed;
    return cachedSaldosOficiales;
  }
  return null;
}
