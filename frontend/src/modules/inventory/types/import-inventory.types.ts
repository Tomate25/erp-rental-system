import { z } from 'zod';

export type ImportRowStatus = 'VALID_NEW' | 'VALID_EXISTING' | 'WARNING' | 'ERROR';

export type ImportTarifa = 'POR HORA' | 'POR DIA';

export interface RawImportRow {
  codigo?: string | number | null;
  descripcion?: string | null;
  cantidad?: string | number | null;
  tarifa?: string | null;
  tipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  serie?: string | number | null;
}

export interface ValidatedImportRow {
  id: string; // ID único temporal para edición en línea (ej. "row-1")
  rowNumber: number; // 1-based del archivo
  codigo: string;
  descripcion: string;
  cantidad: number;
  tarifa: ImportTarifa;
  tipo: string;
  marca: string;
  modelo: string;
  serie: string;
  status: ImportRowStatus;
  matchedProductId?: string;
  matchedProductName?: string;
  similarity?: number;
  userDecision?: 'MERGE' | 'CREATE_NEW';
  errors: string[];
  warnings: string[];
}

export interface ImportSummary {
  totalRows: number;
  validNewCount: number;
  validExistingCount: number;
  warningCount: number;
  errorCount: number;
  canCommit: boolean;
}

export interface ImportHistoryRecord {
  id: string;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  totalRows: number;
  createdCount: number;
  status: 'COMPLETADO' | 'REVERTIDO';
}

export const rawImportRowSchema = z.object({
  codigo: z.string().min(1, 'El código es obligatorio'),
  descripcion: z.string().min(2, 'La descripción es obligatoria'),
  cantidad: z.number().int().positive('La cantidad debe ser un entero positivo'),
  tarifa: z.enum(['POR HORA', 'POR DIA'], {
    error: 'La tarifa debe ser "POR HORA" o "POR DIA"',
  }),
  tipo: z.string().min(1, 'La familia o tipo es obligatorio'),
  marca: z.string().default('N/D'),
  modelo: z.string().default(''),
  serie: z.string().default('S/N'),
});
