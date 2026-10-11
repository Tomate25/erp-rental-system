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
  modulo: string;
  dimensiones: string;
  nota: string;
  qbTipo: string;
  qbNombre: string;
  qbClass: string;
}

let cachedCatalogo: CuentaCatalogo[] | null = null;

export function getCatalogoOficial(): CuentaCatalogo[] {
  if (cachedCatalogo && cachedCatalogo.length > 0) {
    return cachedCatalogo;
  }

  const candidatePaths = [
    path.join(__dirname, 'catalogo-cuentas-bm.json'),
    path.join(process.cwd(), 'src', 'modules', 'accounting', 'data', 'catalogo-cuentas-bm.json'),
    path.join(process.cwd(), 'backend', 'src', 'modules', 'accounting', 'data', 'catalogo-cuentas-bm.json'),
    path.join(__dirname, '..', '..', '..', 'src', 'modules', 'accounting', 'data', 'catalogo-cuentas-bm.json'),
    path.join(__dirname, '..', '..', '..', 'backend', 'src', 'modules', 'accounting', 'data', 'catalogo-cuentas-bm.json'),
  ];

  for (const jsonPath of candidatePaths) {
    try {
      if (fs.existsSync(jsonPath)) {
        const raw = fs.readFileSync(jsonPath, 'utf8');
        const parsed = JSON.parse(raw) as CuentaCatalogo[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedCatalogo = parsed;
          return cachedCatalogo;
        }
      }
    } catch {
      // Intentar siguiente ruta candidata
    }
  }

  console.warn('Advertencia: No se encontró catalogo-cuentas-bm.json en rutas candidatas:', candidatePaths);
  return [];
}
