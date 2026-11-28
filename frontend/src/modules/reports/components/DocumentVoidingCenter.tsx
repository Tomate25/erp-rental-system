import { useCallback, useEffect, useState } from 'react';
import {
  Ban,
  BookOpen,
  Calculator,
  CheckCircle2,
  Eye,
  FileSpreadsheet,
  History,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { reportsApi } from '../services/reports.api';
import { exportVoidingHistoryToExcel } from '../services/export-report-excel.service';
import type {
  TipoDocumentoAnulable,
  VoidableDocumentRow,
  VoidingBehaviorMatrixRule,
  VoidingHistoryResponse,
  VoidingImpactPreview,
} from '../types/reports.types';
import { VoidingImpactModal } from './VoidingImpactModal';

const PRIMARY_DOC_TYPES: TipoDocumentoAnulable[] = [
  'FACTURA',
  'RECIBO_CAJA',
  'COMPRA_INSUMO',
  'CONTRATO',
  'NOTA_CXC',
];

const QUICK_TYPE_PILLS: Array<{
  value: TipoDocumentoAnulable | 'PRINCIPALES' | 'TODOS';
  label: string;
}> = [
  { value: 'PRINCIPALES', label: 'Principales (5)' },
  { value: 'FACTURA', label: 'Facturas' },
  { value: 'RECIBO_CAJA', label: 'Recibos de Caja' },
  { value: 'COMPRA_INSUMO', label: 'Compras de Insumos' },
  { value: 'CONTRATO', label: 'Contratos' },
  { value: 'NOTA_CXC', label: 'Notas CxC' },
  { value: 'COTIZACION', label: 'Cotizaciones' },
  { value: 'SUBARRIENDO_PROVEEDOR', label: 'Subarriendos' },
  { value: 'ASIENTO_MANUAL', label: 'Asientos Manuales' },
  { value: 'TODOS', label: 'Ver Todos' },
];

const fmtCurrency = (val: number) =>
  `C$ ${Number(val || 0).toLocaleString('es-NI', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

interface DocumentVoidingCenterProps {
  canExecuteVoiding: boolean;
}

export function DocumentVoidingCenter({
  canExecuteVoiding,
}: DocumentVoidingCenterProps) {
  const [subTab, setSubTab] = useState<'documentos' | 'matriz' | 'historial'>('documentos');
  const [tipoFiltro, setTipoFiltro] = useState<TipoDocumentoAnulable | 'PRINCIPALES' | 'TODOS'>('PRINCIPALES');
  const [estadoFiltro, setEstadoFiltro] = useState<'ACTIVOS' | 'ANULADOS' | 'TODOS'>('ACTIVOS');
  const [search, setSearch] = useState('');

  const [docs, setDocs] = useState<VoidableDocumentRow[]>([]);
  const [stats, setStats] = useState({ total: 0, activos: 0, anulados: 0 });
  const [loadingDocs, setLoadingDocs] = useState(false);

  const [matrix, setMatrix] = useState<VoidingBehaviorMatrixRule[]>([]);
  const [loadingMatrix, setLoadingMatrix] = useState(false);

  const [history, setHistory] = useState<VoidingHistoryResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<VoidingImpactPreview | null>(null);
  const [exportingHistory, setExportingHistory] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const apiTipo: TipoDocumentoAnulable | '' =
        tipoFiltro === 'PRINCIPALES' || tipoFiltro === 'TODOS' ? '' : tipoFiltro;
      const res = await reportsApi.listVoidableDocuments({
        tipoDocumento: apiTipo,
        estadoFiltro,
        search,
      });
      const filteredDocs =
        tipoFiltro === 'PRINCIPALES'
          ? res.documentos.filter((d) => PRIMARY_DOC_TYPES.includes(d.tipoDocumento))
          : res.documentos;
      setDocs(filteredDocs);
      setStats({
        total: filteredDocs.length,
        activos: filteredDocs.filter((d) => !d.estaAnulado).length,
        anulados: filteredDocs.filter((d) => d.estaAnulado).length,
      });
    } catch (e) {
      console.error('Error cargando documentos anulables:', e);
    } finally {
      setLoadingDocs(false);
    }
  }, [tipoFiltro, estadoFiltro, search]);

  const fetchMatrix = useCallback(async () => {
    setLoadingMatrix(true);
    try {
      const data = await reportsApi.getVoidingMatrix();
      setMatrix(data);
    } catch (e) {
      console.error('Error cargando matriz de comportamiento:', e);
    } finally {
      setLoadingMatrix(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const apiTipo: TipoDocumentoAnulable | '' =
        tipoFiltro === 'PRINCIPALES' || tipoFiltro === 'TODOS' ? '' : tipoFiltro;
      const data = await reportsApi.getVoidingHistory({
        tipoDocumento: apiTipo,
        search,
      });
      setHistory(data);
    } catch (e) {
      console.error('Error cargando historial de anulaciones:', e);
    } finally {
      setLoadingHistory(false);
    }
  }, [tipoFiltro, search]);

  useEffect(() => {
    if (subTab === 'documentos') {
      void fetchDocuments();
    } else if (subTab === 'matriz' && matrix.length === 0) {
      void fetchMatrix();
    } else if (subTab === 'historial') {
      void fetchHistory();
    }
  }, [subTab, fetchDocuments, fetchMatrix, fetchHistory, matrix.length]);

  const handleOpenPreview = async (doc: VoidableDocumentRow) => {
    setModalOpen(true);
    setPreview(null);
    setLoadingPreview(true);
    try {
      const data = await reportsApi.previewVoiding(
        doc.tipoDocumento,
        doc.documentoId,
      );
      setPreview(data);
    } catch (e) {
      console.error('Error generando previsualización de anulación:', e);
      setModalOpen(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmVoid = async (motivo: string) => {
    if (!preview) throw new Error('Sin documento seleccionado.');
    const res = await reportsApi.executeVoiding({
      tipoDocumento: preview.tipoDocumento,
      documentoId: preview.documentoId,
      motivo,
    });
    await fetchDocuments();
    return res;
  };

  const handleExportHistory = async () => {
    if (!history) return;
    setExportingHistory(true);
    try {
      await exportVoidingHistoryToExcel(history);
    } finally {
      setExportingHistory(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub-navegación del Centro de Anulación */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubTab('documentos')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === 'documentos'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Ban className="w-4 h-4" />
            Anular Documentos
          </button>
          <button
            type="button"
            onClick={() => setSubTab('matriz')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === 'matriz'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Matriz de Comportamiento (Inventario y Contabilidad)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('historial')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
              subTab === 'historial'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            Historial de Anulaciones
          </button>
        </div>

        <div className="flex items-center gap-2 px-2 text-[11px] font-semibold text-slate-500">
          <span>Activos: <strong className="text-slate-900">{stats.activos}</strong></span>
          <span>·</span>
          <span>Anulados: <strong className="text-rose-700">{stats.anulados}</strong></span>
        </div>
      </div>

      {/* TAB 1: DOCUMENTOS ANULABLES */}
      {subTab === 'documentos' && (
        <div className="space-y-4">
          {/* Selector rápido por tipo de documento */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_TYPE_PILLS.map((pill) => {
                const active = tipoFiltro === pill.value;
                return (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => setTipoFiltro(pill.value)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold transition-all cursor-pointer border ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={estadoFiltro}
                onChange={(e) =>
                  setEstadoFiltro(e.target.value as 'ACTIVOS' | 'ANULADOS' | 'TODOS')
                }
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 bg-white"
                aria-label="Filtrar por estado de anulación"
              >
                <option value="ACTIVOS">Solo Activos / Vigentes</option>
                <option value="ANULADOS">Solo Anulados / Cancelados</option>
                <option value="TODOS">Todos</option>
              </select>

              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por folio, código, cliente o proveedor..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={() => void fetchDocuments()}
                className="px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingDocs ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>

            {/* Reglas rápidas de protección */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[11px]">
              <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                <strong className="text-slate-900">Factura con Recibo:</strong> anula primero el Recibo de Caja y luego la Factura.
              </div>
              <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                <strong className="text-slate-900">Equipos en obra:</strong> despachos ejecutados no se anulan directo; registra el Retorno en Operaciones.
              </div>
              <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                <strong className="text-slate-900">Compras de insumos:</strong> se bloquea la anulación si el stock ya fue consumido en taller.
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-900 text-white uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold">Tipo</th>
                    <th className="px-4 py-3 text-left font-bold">Código / Folio</th>
                    <th className="px-4 py-3 text-center font-bold">Fecha</th>
                    <th className="px-4 py-3 text-left font-bold">Cliente / Proveedor</th>
                    <th className="px-4 py-3 text-left font-bold">Detalle</th>
                    <th className="px-4 py-3 text-right font-bold">Monto</th>
                    <th className="px-4 py-3 text-center font-bold">Impacto</th>
                    <th className="px-4 py-3 text-center font-bold">Estado</th>
                    <th className="px-4 py-3 text-right font-bold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingDocs ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-500 font-semibold">
                        Consultando documentos del ERP...
                      </td>
                    </tr>
                  ) : docs.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-500 font-semibold">
                        No se encontraron documentos con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    docs.map((doc) => (
                      <tr
                        key={`${doc.tipoDocumento}-${doc.documentoId}`}
                        className="hover:bg-slate-50/90 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-extrabold text-[10px]">
                            {doc.tipoDocumento.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          {doc.codigo}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600 tabular-nums">
                          {doc.fecha || '-'}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 max-w-[180px] truncate">
                          {doc.tercero}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate">
                          {doc.descripcion}
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-900">
                          {fmtCurrency(doc.monto)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex items-center gap-1">
                            {doc.afectaInventario && (
                              <span
                                className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold inline-flex items-center gap-1"
                                title="Afecta Inventario"
                              >
                                <Package className="w-3 h-3" /> Inv
                              </span>
                            )}
                            {doc.afectaContabilidad && (
                              <span
                                className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold inline-flex items-center gap-1"
                                title="Afecta Cuentas Contables"
                              >
                                <Calculator className="w-3 h-3" /> Cont
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              doc.estaAnulado
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {doc.estado}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void handleOpenPreview(doc)}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                              doc.estaAnulado
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs'
                            }`}
                          >
                            {doc.estaAnulado ? (
                              <>
                                <Eye className="w-3.5 h-3.5" />
                                Ver detalle
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5" />
                                Anular
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MATRIZ DE COMPORTAMIENTO (INVENTARIO + CONTABILIDAD) */}
      {subTab === 'matriz' && (
        <div className="space-y-4">
          <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black">
                Reglas Oficiales de Anulación — Inventario y Contabilidad BM Construcciones
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Consulta exactamente qué ocurre con la flota de maquinaria, la bodega de insumos, las cuentas del catálogo contable (Debe/Haber) y los estados financieros al anular cada tipo de documento.
              </p>
            </div>
          </div>

          {loadingMatrix ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs font-semibold text-slate-500">
              Cargando matriz de reglas de anulación...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {matrix.map((rule) => (
                <div
                  key={rule.tipoDocumento}
                  className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        {rule.modulo}
                      </span>
                      <h4 className="text-sm font-black text-slate-900 mt-0.5">
                        {rule.nombre}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rule.afectaInventario
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {rule.afectaInventario ? 'Mueve Inventario' : 'Sin Stock'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rule.afectaContabilidad
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {rule.afectaContabilidad ? 'Reversión Contable' : 'Sin Póliza'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                      <div className="font-black text-blue-900 flex items-center gap-1.5 mb-1">
                        <Package className="w-3.5 h-3.5" /> Comportamiento del Inventario
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        {rule.comportamientoInventario}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                      <div className="font-black text-indigo-900 flex items-center gap-1.5 mb-1">
                        <Calculator className="w-3.5 h-3.5" /> Comportamiento Contable y Cuentas
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        {rule.comportamientoContable}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {rule.cuentasAfectadas.map((cta) => (
                          <span
                            key={cta}
                            className="px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-800 font-mono font-bold text-[10px]"
                          >
                            {cta}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                      <div className="font-black text-emerald-900 flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Efecto en Estados Financieros
                      </div>
                      <p className="text-slate-700">{rule.efectoEstadosFinancieros}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-100">
                      <div className="font-black text-rose-900 flex items-center gap-1.5 mb-1">
                        <ShieldAlert className="w-3.5 h-3.5" /> Bloqueos de Seguridad
                      </div>
                      <ul className="list-disc pl-4 text-rose-900/90 space-y-0.5">
                        {rule.reglasBloqueo.map((r, idx) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HISTORIAL DE ANULACIONES */}
      {subTab === 'historial' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Historial y Bitácora Forense de Anulaciones
              </h3>
              <p className="text-xs text-slate-500">
                Documentos anulados/cancelados y registro inmutable de auditoría.
              </p>
            </div>
            <button
              type="button"
              disabled={!history || exportingHistory}
              onClick={() => void handleExportHistory()}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {exportingHistory ? 'Exportando...' : 'Exportar Historial a Excel'}
            </button>
          </div>

          {loadingHistory ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs font-semibold text-slate-500">
              Cargando historial de anulaciones...
            </div>
          ) : history ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-black text-xs text-slate-800">
                  Documentos Anulados ({history.totalDocumentosAnulados})
                </div>
                <div className="overflow-x-auto max-h-[420px]">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Tipo</th>
                        <th className="px-3 py-2 text-left">Código</th>
                        <th className="px-3 py-2 text-left">Tercero</th>
                        <th className="px-3 py-2 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {history.documentosAnulados.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                            No hay documentos anulados registrados.
                          </td>
                        </tr>
                      ) : (
                        history.documentosAnulados.map((d) => (
                          <tr key={`${d.tipoDocumento}-${d.documentoId}`}>
                            <td className="px-3 py-2 font-bold text-[10px] text-rose-700">
                              {d.tipoDocumento}
                            </td>
                            <td className="px-3 py-2 font-mono font-bold text-slate-900">
                              {d.codigo}
                            </td>
                            <td className="px-3 py-2 text-slate-700">{d.tercero}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-bold">
                              {fmtCurrency(d.monto)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-black text-xs text-slate-800">
                  Bitácora Forense ({history.bitacoraAnulaciones.length} eventos)
                </div>
                <div className="overflow-x-auto max-h-[420px]">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Fecha</th>
                        <th className="px-3 py-2 text-left">Acción</th>
                        <th className="px-3 py-2 text-left">Usuario</th>
                        <th className="px-3 py-2 text-left">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {history.bitacoraAnulaciones.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                            Sin eventos de anulación en bitácora.
                          </td>
                        </tr>
                      ) : (
                        history.bitacoraAnulaciones.map((b) => (
                          <tr key={b.id}>
                            <td className="px-3 py-2 text-slate-500 whitespace-nowrap tabular-nums">
                              {b.fecha.slice(0, 16).replace('T', ' ')}
                            </td>
                            <td className="px-3 py-2 font-bold text-slate-800">{b.accion}</td>
                            <td className="px-3 py-2 text-slate-700">{b.usuario}</td>
                            <td className="px-3 py-2 text-slate-600 max-w-[200px] truncate" title={b.detalles}>
                              {b.detalles}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {modalOpen && (
        <VoidingImpactModal
          preview={preview}
          loading={loadingPreview}
          canExecute={canExecuteVoiding}
          onClose={() => {
            setModalOpen(false);
            setPreview(null);
          }}
          onConfirmVoid={handleConfirmVoid}
        />
      )}
    </div>
  );
}
