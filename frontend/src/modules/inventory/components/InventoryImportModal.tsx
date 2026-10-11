import React, { useState, useId } from 'react';
import type { GroupedProduct } from '../types/grouped-inventory.types';
import type {
  ValidatedImportRow,
  ImportSummary,
  ImportHistoryRecord,
} from '../types/import-inventory.types';
import {
  parseExcelOrCsv,
  validateImportRows,
} from '../services/import-inventory.service';
import { ImportDropzone } from './ImportDropzone';
import { ImportPreviewTable } from './ImportPreviewTable';
import {
  X,
  FileSpreadsheet,
  History,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

interface InventoryImportModalProps {
  existingProducts: GroupedProduct[];
  existingEquipments: Array<{ codigo?: string | null; numeroSerie?: string | null }>;
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedCount: number) => void;
  userRole?: string;
}

export const InventoryImportModal: React.FC<InventoryImportModalProps> = ({
  existingProducts,
  existingEquipments,
  isOpen,
  onClose,
  onImportSuccess,
  userRole = 'ADMIN',
}) => {
  const titleId = useId();
  const [activeTab, setActiveTab] = useState<'import' | 'history'>('import');
  const [currentStep, setCurrentStep] = useState<'UPLOAD' | 'PREVIEW' | 'SUCCESS'>('UPLOAD');

  const [isLoading, setIsLoading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Datos del archivo cargado
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ValidatedImportRow[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  // Historial de importaciones local
  const [history, setHistory] = useState<ImportHistoryRecord[]>(() => {
    const saved = localStorage.getItem('inventory_import_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [
      {
        id: 'hist-jun-2026',
        fileName: 'inventario_tarifas_junio2026.xlsx',
        uploadedAt: '2026-10-10 15:01',
        uploadedBy: 'Abdia (Admin)',
        totalRows: 278,
        createdCount: 278,
        status: 'COMPLETADO',
      },
    ];
  });

  const canUserImport = userRole === 'ADMIN' || userRole === 'GERENTE';

  if (!isOpen) return null;

  // Procesar archivo seleccionado
  const handleFileLoaded = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    setFileName(file.name);
    try {
      const rawRows = await parseExcelOrCsv(file);
      if (rawRows.length === 0) {
        throw new Error('El archivo no contiene filas con datos válidos.');
      }

      const validated = validateImportRows(rawRows, existingProducts, existingEquipments);
      setRows(validated.rows);
      setSummary(validated.summary);
      setCurrentStep('PREVIEW');
    } catch (err: any) {
      console.error('Error al procesar archivo:', err);
      setErrorMessage(err.message || 'Error al leer o interpretar el archivo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Actualización en línea de una fila
  const handleRowUpdate = (updatedRow: ValidatedImportRow) => {
    const updatedRows = rows.map((r) => (r.id === updatedRow.id ? updatedRow : r));
    const revalidated = validateImportRows(
      updatedRows.map((r) => ({
        codigo: r.codigo,
        descripcion: r.descripcion,
        cantidad: r.cantidad,
        tarifa: r.tarifa,
        tipo: r.tipo,
        marca: r.marca,
        modelo: r.modelo,
        serie: r.serie,
      })),
      existingProducts,
      existingEquipments
    );
    setRows(revalidated.rows);
    setSummary(revalidated.summary);
  };

  // Confirmar e importar en transacción
  const handleCommit = async () => {
    if (!canUserImport) {
      setErrorMessage('Solo los usuarios con rol ADMINISTRADOR o GERENTE pueden confirmar la importación.');
      return;
    }
    if (!summary || !summary.canCommit) {
      setErrorMessage('No es posible importar mientras existan errores en rojo.');
      return;
    }

    setIsCommitting(true);
    setErrorMessage(null);
    try {
      // Simulación de commit transaccional seguro
      await new Promise((resolve) => setTimeout(resolve, 800));

      const newRecord: ImportHistoryRecord = {
        id: `hist-${Date.now()}`,
        fileName,
        uploadedAt: new Date().toLocaleString('es-NI'),
        uploadedBy: 'Usuario Actual',
        totalRows: summary.totalRows,
        createdCount: summary.validNewCount + summary.validExistingCount,
        status: 'COMPLETADO',
      };

      const updatedHistory = [newRecord, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('inventory_import_history', JSON.stringify(updatedHistory));

      setCurrentStep('SUCCESS');
      onImportSuccess(summary.totalRows);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error durante la confirmación transaccional.');
    } finally {
      setIsCommitting(false);
    }
  };

  const handleReset = () => {
    setCurrentStep('UPLOAD');
    setRows([]);
    setSummary(null);
    setFileName('');
    setErrorMessage(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-fadeIn overflow-y-auto"
    >
      <div className="bg-white rounded-3xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp my-6 max-h-[94vh] flex flex-col">
        {/* Cabecera */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                Carga Masiva de Inventario
              </span>
              {!canUserImport && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                  Modo Lectura / Validación
                </span>
              )}
            </div>
            <h3 id={titleId} className="text-base font-black text-slate-900 mt-1">
              Importador Inteligente desde Excel / CSV
            </h3>
            <p className="text-xs text-slate-500">
              Carga rápida de catálogo completo con detección anti-duplicados, agrupación automática y validación de series.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Pestañas Importador vs Historial */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('import')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'import' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Importador
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  activeTab === 'history' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Historial</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mensaje de error general */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Contenido principal según pestaña */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'history' ? (
            /* ============================================================== */
            /* PESTAÑA: HISTORIAL DE IMPORTACIONES                            */
            /* ============================================================== */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Historial de Cargas Masivas Realizadas
                </h4>
                <span className="text-xs text-slate-500 font-mono">{history.length} importaciones</span>
              </div>

              <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-600 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3">Archivo</th>
                      <th className="py-2.5 px-3">Usuario</th>
                      <th className="py-2.5 px-3 text-center">Filas</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {history.map((h) => (
                      <tr key={h.id} className="hover:bg-white transition-colors">
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{h.uploadedAt}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{h.fileName}</td>
                        <td className="py-2 px-3">{h.uploadedBy}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-blue-700">
                          {h.totalRows} u.
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* PESTAÑA: IMPORTADOR (UPLOAD -> PREVIEW -> SUCCESS)             */
            /* ============================================================== */
            <div>
              {currentStep === 'UPLOAD' && (
                <ImportDropzone onFileLoaded={handleFileLoaded} isLoading={isLoading} />
              )}

              {currentStep === 'PREVIEW' && summary && (
                <ImportPreviewTable
                  rows={rows}
                  summary={summary}
                  onRowUpdate={handleRowUpdate}
                  onCommit={handleCommit}
                  onReset={handleReset}
                  isCommitting={isCommitting}
                />
              )}

              {currentStep === 'SUCCESS' && summary && (
                <div className="py-12 px-6 text-center space-y-4 max-w-md mx-auto">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900">
                    ¡Importación Completada Exitosamente!
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Se procesaron <strong className="text-slate-900 font-mono">{summary.totalRows}</strong> artículos de{' '}
                    <strong className="text-slate-900">{fileName}</strong>. Las unidades están registradas y
                    agrupadas en el inventario.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                    >
                      Ver Inventario Actualizado
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
