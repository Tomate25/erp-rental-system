import { useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Filter,
  Layers,
  PieChart,
  RefreshCw,
  Search,
  Table2,
} from 'lucide-react';
import type {
  ReportColumnDef,
  ReportFilters,
  ReportPayload,
} from '../types/reports.types';

interface ReportViewerPanelProps {
  report: ReportPayload | null;
  loading: boolean;
  filters: ReportFilters;
  exportingSingle: boolean;
  exportingConsolidated: boolean;
  onChangeFilters: (next: ReportFilters) => void;
  onRefresh: () => void;
  onExportSingle: () => void;
  onExportConsolidated: () => void;
}

const fmtCurrency = (val: number) =>
  `C$ ${Number(val || 0).toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtNumber = (val: number) =>
  Number(val || 0).toLocaleString('es-NI', { maximumFractionDigits: 2 });

function formatKpiValue(val: number, format: 'currency' | 'number' | 'percent'): string {
  if (format === 'currency') return fmtCurrency(val);
  if (format === 'percent') return `${Number(val || 0).toFixed(1)}%`;
  return fmtNumber(val);
}

function formatCell(col: ReportColumnDef, raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '-';
  if (col.type === 'currency') return fmtCurrency(Number(raw));
  if (col.type === 'percent') return `${Number(raw).toFixed(1)}%`;
  if (col.type === 'number') return fmtNumber(Number(raw));
  return String(raw);
}

const TONE_CLASSES: Record<string, string> = {
  blue: 'border-l-blue-600 bg-blue-50/40',
  emerald: 'border-l-emerald-600 bg-emerald-50/40',
  amber: 'border-l-amber-500 bg-amber-50/40',
  rose: 'border-l-rose-600 bg-rose-50/40',
  indigo: 'border-l-indigo-600 bg-indigo-50/40',
  slate: 'border-l-slate-600 bg-slate-50/60',
};

export function ReportViewerPanel({
  report,
  loading,
  filters,
  exportingSingle,
  exportingConsolidated,
  onChangeFilters,
  onRefresh,
  onExportSingle,
  onExportConsolidated,
}: ReportViewerPanelProps) {
  const [viewMode, setViewMode] = useState<'tabla' | 'dinamica' | string>('tabla');
  const [selectedPivotId, setSelectedPivotId] = useState<string>('');
  const [customDimension, setCustomDimension] = useState<string>('');

  const pivotDimensions = useMemo(
    () => (report?.columnas || []).filter((c) => c.pivotDimension),
    [report],
  );
  const defaultMetricCol = useMemo(
    () =>
      (report?.columnas || []).find((c) => c.pivotMetric) ||
      (report?.columnas || []).find((c) => c.sumInTotals),
    [report],
  );

  // Tabla dinámica interactiva al vuelo cuando el usuario selecciona cualquier columna de agrupación
  const activeCustomPivot = useMemo(() => {
    if (!report || !customDimension) return null;
    const dimCol = report.columnas.find((c) => c.key === customDimension);
    if (!dimCol) return null;
    const metricKey = defaultMetricCol?.key;
    const map = new Map<string, { cantidad: number; total: number }>();
    let grand = 0;

    for (const row of report.filas) {
      const clave = String(row[customDimension] ?? 'Sin Clasificar').trim() || 'Sin Clasificar';
      const val = metricKey ? Number(row[metricKey] || 0) : 1;
      const cur = map.get(clave) || { cantidad: 0, total: 0 };
      cur.cantidad += 1;
      cur.total = Math.round((cur.total + val) * 100) / 100;
      map.set(clave, cur);
      grand = Math.round((grand + val) * 100) / 100;
    }

    return {
      dimensionLabel: dimCol.label,
      metricLabel: defaultMetricCol?.label || 'Registros',
      metricFormat: defaultMetricCol?.type === 'currency' ? 'currency' : 'number',
      rows: Array.from(map.entries())
        .map(([clave, agg]) => ({
          clave,
          cantidad: agg.cantidad,
          metricaPrincipal: agg.total,
          participacion:
            grand > 0 ? Math.round((agg.total / grand) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.metricaPrincipal - a.metricaPrincipal),
    };
  }, [report, customDimension, defaultMetricCol]);

  const activeSummary = useMemo(() => {
    if (!report || report.resumenesDinamicos.length === 0) return null;
    return (
      report.resumenesDinamicos.find((s) => s.id === selectedPivotId) ||
      report.resumenesDinamicos[0]
    );
  }, [report, selectedPivotId]);

  const activeExtraSheet = useMemo(() => {
    if (!report) return null;
    return report.hojasAdicionales.find((h) => h.id === viewMode) || null;
  }, [report, viewMode]);

  const applyQuickRange = (days: number | 'month' | 'year' | 'all') => {
    if (days === 'all') {
      onChangeFilters({ ...filters, fechaDesde: '', fechaHasta: '' });
      return;
    }
    const today = new Date();
    const hasta = today.toISOString().slice(0, 10);
    let desde = '';
    if (days === 'month') {
      desde = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
    } else if (days === 'year') {
      desde = `${today.getFullYear()}-01-01`;
    } else {
      const start = new Date(today.getTime() - days * 86400000);
      desde = start.toISOString().slice(0, 10);
    }
    onChangeFilters({ ...filters, fechaDesde: desde, fechaHasta: hasta });
  };

  return (
    <div className="space-y-4">
      {/* Encabezado y Acciones de Exportación Excel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase tracking-wider">
              {report?.modulo || 'Reporte'}
            </span>
            {report && (
              <span className="text-[11px] font-semibold text-slate-400">
                {report.filas.length} registros · {report.hojasAdicionales.length + 2} hojas Excel
              </span>
            )}
          </div>
          <h2 className="text-lg font-black text-slate-900 mt-1">
            {report?.titulo || 'Cargando reporte...'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{report?.subtitulo || ''}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={!report || exportingSingle}
            onClick={onExportSingle}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exportingSingle
              ? 'Generando Excel...'
              : 'Exportar Excel Dinámico (.xlsx)'}
          </button>

          <button
            type="button"
            disabled={exportingConsolidated}
            onClick={onExportConsolidated}
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-extrabold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
            title="Descarga un único libro Excel con portada ejecutiva y todos los módulos del ERP"
          >
            <Download className="w-4 h-4" />
            {exportingConsolidated
              ? 'Consolidando 10 módulos...'
              : 'Consolidado Todo el ERP'}
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            Filtros:
          </div>

          <input
            type="date"
            value={filters.fechaDesde || ''}
            onChange={(e) =>
              onChangeFilters({ ...filters, fechaDesde: e.target.value })
            }
            aria-label="Fecha desde"
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
          />
          <span className="text-xs text-slate-400">a</span>
          <input
            type="date"
            value={filters.fechaHasta || ''}
            onChange={(e) =>
              onChangeFilters({ ...filters, fechaHasta: e.target.value })
            }
            aria-label="Fecha hasta"
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
          />

          {report && report.estadosDisponibles.length > 0 && (
            <select
              value={filters.estado || ''}
              onChange={(e) =>
                onChangeFilters({ ...filters, estado: e.target.value })
              }
              aria-label="Filtrar por estado"
              className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="">Todos los estados</option>
              {report.estadosDisponibles.map((est) => (
                <option key={est} value={est}>
                  {est}
                </option>
              ))}
            </select>
          )}

          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) =>
                onChangeFilters({ ...filters, search: e.target.value })
              }
              placeholder="Buscar en columnas del reporte..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Aplicar
          </button>
        </div>

        {/* Presets rápidos de período */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-400 font-semibold mr-1">Período rápido:</span>
          {[
            { label: 'Este Mes', val: 'month' as const },
            { label: 'Últimos 30 días', val: 30 },
            { label: 'Últimos 90 días', val: 90 },
            { label: 'Año Actual', val: 'year' as const },
            { label: 'Todo el Historial', val: 'all' as const },
          ].map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyQuickRange(p.val)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 font-bold transition-colors cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      {report && report.kpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {report.kpis.map((kpi) => (
            <div
              key={kpi.label}
              className={`bg-white border border-slate-200 border-l-4 rounded-xl p-3.5 shadow-xs ${
                TONE_CLASSES[kpi.tone || 'slate'] || TONE_CLASSES.slate
              }`}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                {kpi.label}
              </span>
              <span className="text-base font-black text-slate-900 mt-1 block tabular-nums">
                {formatKpiValue(kpi.value, kpi.format)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Selector de Vista: Tabla Detallada / Tabla Dinámica / Hojas Anexas */}
      {report && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('tabla')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
              viewMode === 'tabla'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            Datos Detallados ({report.filas.length})
          </button>

          <button
            type="button"
            onClick={() => setViewMode('dinamica')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
              viewMode === 'dinamica'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            Tabla Dinámica (Agrupación)
          </button>

          {report.hojasAdicionales.map((hoja) => (
            <button
              key={hoja.id}
              type="button"
              onClick={() => setViewMode(hoja.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all ${
                viewMode === hoja.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {hoja.nombreHoja} ({hoja.filas.length})
            </button>
          ))}
        </div>
      )}

      {/* Contenido Principal */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-xs font-semibold text-slate-500">
          Compilando datos del módulo...
        </div>
      ) : !report ? null : viewMode === 'dinamica' ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Vista de Tabla Dinámica Interactiva
              </h3>
              <p className="text-xs text-slate-500">
                Al exportar a Excel (.xlsx), estas agrupaciones y matrices cruzadas se generan con fórmulas vivas <code>SUMIF</code>, <code>COUNTIF</code> y <code>SUMIFS</code>.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {report.resumenesDinamicos.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setCustomDimension('');
                    setSelectedPivotId(s.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    !customDimension && activeSummary?.id === s.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Por {s.dimensionLabel}
                </button>
              ))}
              {pivotDimensions.length > 0 && (
                <select
                  value={customDimension}
                  onChange={(e) => setCustomDimension(e.target.value)}
                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white"
                  aria-label="Agrupar dinámicamente por columna"
                >
                  <option value="">Otra dimensión...</option>
                  {pivotDimensions.map((d) => (
                    <option key={d.key} value={d.key}>
                      Agrupar por {d.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {(() => {
            const pivotData = activeCustomPivot || activeSummary;
            if (!pivotData) {
              return (
                <p className="text-xs text-slate-500 py-6 text-center">
                  No hay datos para agrupar en este período.
                </p>
              );
            }
            const totalCantidad = pivotData.rows.reduce((s, r) => s + r.cantidad, 0);
            const totalMetrica = pivotData.rows.reduce(
              (s, r) => s + r.metricaPrincipal,
              0,
            );
            return (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-slate-900 text-white uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-bold">
                        {pivotData.dimensionLabel}
                      </th>
                      <th className="px-4 py-2.5 text-right font-bold">Registros</th>
                      <th className="px-4 py-2.5 text-right font-bold">
                        {pivotData.metricLabel}
                      </th>
                      <th className="px-4 py-2.5 text-right font-bold">% Participación</th>
                      <th className="px-4 py-2.5 text-left font-bold w-44">Distribución</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pivotData.rows.map((row) => (
                      <tr key={row.clave} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-bold text-slate-900">
                          {row.clave}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                          {fmtNumber(row.cantidad)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-black text-slate-900">
                          {pivotData.metricFormat === 'currency'
                            ? fmtCurrency(row.metricaPrincipal)
                            : fmtNumber(row.metricaPrincipal)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-bold text-indigo-700">
                          {row.participacion.toFixed(1)}%
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-indigo-600"
                              style={{ width: `${Math.min(100, Math.max(2, row.participacion))}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-black text-slate-900">
                    <tr>
                      <td className="px-4 py-2.5">TOTAL GENERAL</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {fmtNumber(totalCantidad)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {pivotData.metricFormat === 'currency'
                          ? fmtCurrency(totalMetrica)
                          : fmtNumber(totalMetrica)}
                      </td>
                      <td className="px-4 py-2.5 text-right">100.0%</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })()}
        </div>
      ) : (
        (() => {
          const cols = activeExtraSheet ? activeExtraSheet.columnas : report.columnas;
          const rows = activeExtraSheet ? activeExtraSheet.filas : report.filas;

          return (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              {activeExtraSheet && (
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-xs font-black text-slate-900">
                    {activeExtraSheet.titulo}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {activeExtraSheet.subtitulo}
                  </p>
                </div>
              )}
              <div className="overflow-x-auto max-h-[540px]">
                <table className="w-full text-xs">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] sticky top-0 z-10">
                    <tr>
                      {cols.map((col) => (
                        <th
                          key={col.key}
                          className={`px-3 py-2.5 font-bold whitespace-nowrap ${
                            col.type === 'currency' ||
                            col.type === 'number' ||
                            col.type === 'percent'
                              ? 'text-right'
                              : col.type === 'date' || col.type === 'badge'
                                ? 'text-center'
                                : 'text-left'
                          }`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={cols.length}
                          className="px-4 py-12 text-center text-slate-500 font-semibold"
                        >
                          No hay registros que coincidan con los filtros actuales.
                        </td>
                      </tr>
                    ) : (
                      rows.slice(0, 300).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80">
                          {cols.map((col) => (
                            <td
                              key={col.key}
                              className={`px-3 py-2 whitespace-nowrap ${
                                col.type === 'currency' ||
                                col.type === 'number' ||
                                col.type === 'percent'
                                  ? 'text-right tabular-nums font-semibold text-slate-800'
                                  : col.type === 'date'
                                    ? 'text-center tabular-nums text-slate-600'
                                    : col.type === 'badge'
                                      ? 'text-center'
                                      : 'text-left text-slate-800 max-w-[220px] truncate'
                              }`}
                            >
                              {col.type === 'badge' ? (
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[10px]">
                                  {formatCell(col, row[col.key])}
                                </span>
                              ) : (
                                formatCell(col, row[col.key])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {rows.length > 300 && (
                <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-200 text-[11px] font-semibold text-amber-900">
                  Mostrando los primeros 300 registros en pantalla de {rows.length}. Usa{' '}
                  <strong>Exportar Excel Dinámico (.xlsx)</strong> para descargar el 100% de las filas.
                </div>
              )}
            </div>
          );
        })()
      )}
    </div>
  );
}
