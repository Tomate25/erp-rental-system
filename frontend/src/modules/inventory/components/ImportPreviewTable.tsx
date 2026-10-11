import React, { useState, useMemo } from 'react';
import type { ValidatedImportRow, ImportSummary } from '../types/import-inventory.types';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Search,
  Layers,
  Sparkles,
} from 'lucide-react';
import { downloadErrorReportExcel } from '../services/import-inventory.service';

interface ImportPreviewTableProps {
  rows: ValidatedImportRow[];
  summary: ImportSummary;
  onRowUpdate: (updatedRow: ValidatedImportRow) => void;
  onCommit: () => Promise<void>;
  onReset: () => void;
  isCommitting?: boolean;
}

export const ImportPreviewTable: React.FC<ImportPreviewTableProps> = ({
  rows,
  summary,
  onRowUpdate,
  onCommit,
  onReset,
  isCommitting = false,
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ERROR' | 'WARNING' | 'VALID'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrado de filas
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Filtro por estado
      if (filterStatus === 'ERROR' && r.status !== 'ERROR') return false;
      if (filterStatus === 'WARNING' && r.status !== 'WARNING') return false;
      if (filterStatus === 'VALID' && r.status !== 'VALID_NEW' && r.status !== 'VALID_EXISTING') {
        return false;
      }

      // Filtro por búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          r.codigo.toLowerCase().includes(q) ||
          r.descripcion.toLowerCase().includes(q) ||
          r.serie.toLowerCase().includes(q) ||
          r.marca.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, filterStatus, searchQuery]);

  const handleCellBlur = (
    row: ValidatedImportRow,
    field: keyof ValidatedImportRow,
    newValue: string
  ) => {
    let val: any = newValue;
    if (field === 'cantidad') {
      val = parseInt(newValue, 10) || 1;
    }
    const updated = { ...row, [field]: val };
    onRowUpdate(updated);
  };

  const errorRows = useMemo(() => rows.filter((r) => r.status === 'ERROR'), [rows]);

  return (
    <div className="space-y-4 text-xs font-sans">
      {/* ============================================================== */}
      {/* BARRA DE CONTADORES / RESUMEN KPI ACCESIBLE                    */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Válidas Nuevas */}
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5">
          <div className="p-2 bg-emerald-600 text-white rounded-xl">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
              Productos Nuevos
            </span>
            <p className="text-base font-black text-emerald-950 font-mono">
              {summary.validNewCount} <span className="text-xs font-normal">filas</span>
            </p>
          </div>
        </div>

        {/* Válidas Agrupadas */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-2.5">
          <div className="p-2 bg-blue-600 text-white rounded-xl">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-800 tracking-wider">
              Se Agrupan
            </span>
            <p className="text-base font-black text-blue-950 font-mono">
              {summary.validExistingCount} <span className="text-xs font-normal">filas</span>
            </p>
          </div>
        </div>

        {/* Advertencias */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2.5">
          <div className="p-2 bg-amber-500 text-white rounded-xl">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
              Advertencias
            </span>
            <p className="text-base font-black text-amber-950 font-mono">
              {summary.warningCount} <span className="text-xs font-normal">revisar</span>
            </p>
          </div>
        </div>

        {/* Errores */}
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5">
          <div className="p-2 bg-rose-600 text-white rounded-xl">
            <XCircle className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-rose-800 tracking-wider">
              Errores Bloqueantes
            </span>
            <p className="text-base font-black text-rose-950 font-mono">
              {summary.errorCount} <span className="text-xs font-normal">corregir</span>
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* FILTROS, BUSCADOR Y DESCARGA DE ERRORES                        */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
              filterStatus === 'ALL'
                ? 'bg-slate-800 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Todas ({summary.totalRows})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('ERROR')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
              filterStatus === 'ERROR'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-white text-rose-700 hover:bg-rose-50 border border-slate-200'
            }`}
          >
            Errores ({summary.errorCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('WARNING')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
              filterStatus === 'WARNING'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-white text-amber-800 hover:bg-amber-50 border border-slate-200'
            }`}
          >
            Advertencias ({summary.warningCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('VALID')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
              filterStatus === 'VALID'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-slate-200'
            }`}
          >
            Válidas ({summary.validNewCount + summary.validExistingCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Buscador */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar fila..."
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Botón Descargar filas con error */}
          {summary.errorCount > 0 && (
            <button
              type="button"
              onClick={() => downloadErrorReportExcel(errorRows)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-xl font-bold text-xs transition-colors shadow-2xs shrink-0"
              title="Descargar archivo Excel con únicamente las filas que tienen error para corregirlas"
            >
              <Download className="w-3.5 h-3.5 text-rose-600" />
              <span>Descargar Errores</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* TABLA DE PREVISUALIZACIÓN CON EDICIÓN EN LÍNEA                 */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden max-h-[50vh] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            <tr>
              <th scope="col" className="py-2.5 px-3 w-10 text-center">#</th>
              <th scope="col" className="py-2.5 px-3 w-28">Estado</th>
              <th scope="col" className="py-2.5 px-3">Código</th>
              <th scope="col" className="py-2.5 px-3 min-w-[200px]">Descripción</th>
              <th scope="col" className="py-2.5 px-2 w-16 text-center">Cant.</th>
              <th scope="col" className="py-2.5 px-3 w-24">Tarifa</th>
              <th scope="col" className="py-2.5 px-3">Tipo</th>
              <th scope="col" className="py-2.5 px-3">Marca / Modelo</th>
              <th scope="col" className="py-2.5 px-3">Serie</th>
              <th scope="col" className="py-2.5 px-3 min-w-[160px]">Decisión / Diagnóstico</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredRows.map((r) => {
              const isError = r.status === 'ERROR';
              const isWarning = r.status === 'WARNING';
              const isExisting = r.status === 'VALID_EXISTING';

              const rowBg = isError
                ? 'bg-rose-50/50 hover:bg-rose-50/80'
                : isWarning
                ? 'bg-amber-50/40 hover:bg-amber-50/70'
                : isExisting
                ? 'bg-blue-50/30 hover:bg-blue-50/60'
                : 'hover:bg-slate-50/70';

              return (
                <tr key={r.id} className={`transition-colors ${rowBg}`}>
                  {/* Fila # */}
                  <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-400">
                    {r.rowNumber}
                  </td>

                  {/* Estado Badge */}
                  <td className="py-2 px-3">
                    {isError ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        <XCircle className="w-3 h-3 text-rose-600" /> Error
                      </span>
                    ) : isWarning ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Aviso
                      </span>
                    ) : isExisting ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                        <Layers className="w-3 h-3 text-blue-600" /> Agrupa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Nuevo
                      </span>
                    )}
                  </td>

                  {/* Código Editable */}
                  <td className="py-2 px-3 font-mono font-bold text-slate-900">
                    <input
                      type="text"
                      defaultValue={r.codigo}
                      onBlur={(e) => handleCellBlur(r, 'codigo', e.target.value)}
                      className="w-20 px-1.5 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white bg-transparent font-mono text-xs focus:outline-none"
                    />
                  </td>

                  {/* Descripción Editable */}
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      defaultValue={r.descripcion}
                      onBlur={(e) => handleCellBlur(r, 'descripcion', e.target.value)}
                      className="w-full px-1.5 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white bg-transparent text-xs font-medium text-slate-800 focus:outline-none"
                    />
                  </td>

                  {/* Cantidad Editable */}
                  <td className="py-2 px-2 text-center">
                    <input
                      type="number"
                      defaultValue={r.cantidad}
                      onBlur={(e) => handleCellBlur(r, 'cantidad', e.target.value)}
                      className="w-14 text-center px-1 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white bg-transparent font-mono font-bold text-xs focus:outline-none"
                    />
                  </td>

                  {/* Tarifa Editable */}
                  <td className="py-2 px-3">
                    <select
                      value={r.tarifa}
                      onChange={(e) =>
                        onRowUpdate({ ...r, tarifa: e.target.value as 'POR HORA' | 'POR DIA' })
                      }
                      className="px-1.5 py-0.5 rounded border border-transparent hover:border-slate-300 bg-transparent text-[11px] font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="POR DIA">POR DIA</option>
                      <option value="POR HORA">POR HORA</option>
                    </select>
                  </td>

                  {/* Tipo */}
                  <td className="py-2 px-3 text-slate-600">{r.tipo}</td>

                  {/* Marca / Modelo */}
                  <td className="py-2 px-3 text-slate-700">
                    {r.marca} {r.modelo ? `· ${r.modelo}` : ''}
                  </td>

                  {/* Serie Editable */}
                  <td className="py-2 px-3 font-mono text-slate-700">
                    <input
                      type="text"
                      defaultValue={r.serie}
                      onBlur={(e) => handleCellBlur(r, 'serie', e.target.value)}
                      className="w-28 px-1.5 py-0.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white bg-transparent font-mono text-xs focus:outline-none"
                    />
                  </td>

                  {/* Decisión / Diagnóstico */}
                  <td className="py-2 px-3">
                    {isError ? (
                      <p className="text-[11px] text-rose-700 font-medium">
                        {r.errors.join('; ')}
                      </p>
                    ) : isWarning ? (
                      <div className="space-y-1">
                        <select
                          value={r.userDecision || 'MERGE'}
                          onChange={(e) =>
                            onRowUpdate({
                              ...r,
                              userDecision: e.target.value as 'MERGE' | 'CREATE_NEW',
                            })
                          }
                          className="w-full text-[11px] px-2 py-1 rounded-lg border border-amber-300 bg-white font-medium text-amber-900 focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="MERGE">
                            Unir al grupo: {r.matchedProductName || 'Existente'}
                          </option>
                          <option value="CREATE_NEW">Crear como grupo nuevo</option>
                        </select>
                        <span className="text-[10px] text-amber-700 block">
                          {Math.round((r.similarity || 0) * 100)}% de similitud léxica
                        </span>
                      </div>
                    ) : isExisting ? (
                      <span className="text-[11px] text-blue-700 font-medium">
                        Se incorpora al grupo: {r.matchedProductName}
                      </span>
                    ) : (
                      <span className="text-[11px] text-emerald-700 font-medium">
                        Crea ficha de producto independiente
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ============================================================== */}
      {/* BARRA DE ACCIÓN Y CONFIRMACIÓN TRANSACCIONAL                   */}
      {/* ============================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors"
          >
            Subir otro archivo
          </button>
          {summary.errorCount > 0 && (
            <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Corrige las filas en rojo para habilitar la importación.
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onCommit}
          disabled={!summary.canCommit || isCommitting}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
        >
          {isCommitting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Importando en transacción segura...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar e Importar ({summary.totalRows} filas)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
