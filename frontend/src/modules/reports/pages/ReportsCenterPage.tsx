import { useCallback, useEffect, useState } from 'react';
import {
  Ban,
  BarChart3,
  FileSpreadsheet,
  Layers,
  ShieldCheck,
} from 'lucide-react';
import { useModuleAccess } from '../../../shared/context/ModuleAccessContext';
import { reportsApi } from '../services/reports.api';
import {
  exportConsolidatedReportToExcel,
  exportReportToExcel,
} from '../services/export-report-excel.service';
import type {
  ReportCatalogItem,
  ReportFilters,
  ReportPayload,
  ReportType,
} from '../types/reports.types';
import { ReportViewerPanel } from '../components/ReportViewerPanel';
import { DocumentVoidingCenter } from '../components/DocumentVoidingCenter';

export function ReportsCenterPage() {
  const { canWrite } = useModuleAccess();
  const [section, setSection] = useState<'reportes' | 'anulaciones'>('reportes');
  const [catalog, setCatalog] = useState<ReportCatalogItem[]>([]);
  const [selectedTipo, setSelectedTipo] = useState<ReportType>('cotizaciones');
  const [filters, setFilters] = useState<ReportFilters>({});
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [exportingSingle, setExportingSingle] = useState(false);
  const [exportingConsolidated, setExportingConsolidated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    try {
      const data = await reportsApi.getCatalog();
      setCatalog(data.reportes);
    } catch (e) {
      console.error('Error cargando catálogo de reportes:', e);
    }
  }, []);

  const loadReport = useCallback(
    async (tipo: ReportType, activeFilters: ReportFilters) => {
      setLoadingReport(true);
      try {
        const data = await reportsApi.getReportData(tipo, activeFilters);
        setReport(data);
      } catch (e) {
        console.error('Error cargando datos del reporte:', e);
      } finally {
        setLoadingReport(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (section === 'reportes') {
      void loadReport(selectedTipo, filters);
    }
  }, [section, selectedTipo, filters, loadReport]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const handleExportSingle = async () => {
    if (!report) return;
    setExportingSingle(true);
    try {
      const fileName = await exportReportToExcel(report);
      setToast(`Excel generado con tablas dinámicas y filtros: ${fileName}`);
    } catch (e) {
      console.error('Error exportando reporte:', e);
      setToast('Ocurrió un error al generar el archivo Excel.');
    } finally {
      setExportingSingle(false);
    }
  };

  const handleExportConsolidated = async () => {
    setExportingConsolidated(true);
    try {
      const consolidated = await reportsApi.getConsolidatedReport(filters);
      const fileName = await exportConsolidatedReportToExcel(consolidated);
      setToast(`Libro Consolidado de 10 módulos descargado: ${fileName}`);
    } catch (e) {
      console.error('Error exportando consolidado:', e);
      setToast('No se pudo generar el reporte consolidado.');
    } finally {
      setExportingConsolidated(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-5">
      {/* Cabecera Superior y Selector de Modo */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Centro de Reportes y Anulaciones
            </h1>
            <p className="text-xs text-slate-500">
              Informes gerenciales de todos los módulos con Excel dinámico filtrable + Control de anulación de documentos con trazabilidad en Inventario y Contabilidad
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => setSection('reportes')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              section === 'reportes'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Centro de Reportes ({catalog.length || 10})
          </button>

          <button
            type="button"
            onClick={() => setSection('anulaciones')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              section === 'anulaciones'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Ban className="w-4 h-4 text-rose-600" />
            Anular Documentos
          </button>
        </div>
      </div>

      {toast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {section === 'reportes' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Sidebar Catálogo de Reportes */}
          <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-3 space-y-1.5 shadow-xs">
            <div className="px-3 py-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-400">
              <Layers className="w-3.5 h-3.5" />
              Módulos e Informes
            </div>
            {catalog.map((item) => {
              const active = selectedTipo === item.tipo;
              return (
                <button
                  key={item.tipo}
                  type="button"
                  onClick={() => {
                    setSelectedTipo(item.tipo);
                    setFilters((prev) => ({ ...prev, estado: '' }));
                  }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all cursor-pointer border ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold leading-tight">
                      {item.titulo}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums shrink-0 ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.totalRegistros}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] block mt-0.5 ${
                      active ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    {item.area} · {item.hojasExcel.length} hojas Excel
                  </span>
                </button>
              );
            })}
          </aside>

          {/* Panel del Reporte Activo */}
          <div className="lg:col-span-9 min-w-0">
            <ReportViewerPanel
              report={report}
              loading={loadingReport}
              filters={filters}
              exportingSingle={exportingSingle}
              exportingConsolidated={exportingConsolidated}
              onChangeFilters={setFilters}
              onRefresh={() => void loadReport(selectedTipo, filters)}
              onExportSingle={() => void handleExportSingle()}
              onExportConsolidated={() => void handleExportConsolidated()}
            />
          </div>
        </div>
      ) : (
        <DocumentVoidingCenter canExecuteVoiding={canWrite} />
      )}
    </div>
  );
}
