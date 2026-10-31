import React, { useState, useEffect } from 'react';
import {
  Hash,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ShieldCheck,
  Edit2,
  Eye,
  Check,
  RefreshCw,
  Layers,
  AlertCircle,
} from 'lucide-react';
import type {
  SerieDocumento,
  SucursalOption,
  TipoDocumentoSerie,
  EstadoSerieDocumento,
} from '../types/numbering.types';
import { numberingApi, type NumberingFilterParams } from '../services/numbering.api';
import { SerieFormModal } from '../components/SerieFormModal';
import { SerieDetailModal } from '../components/SerieDetailModal';

interface NumberingSeriesPageProps {
  canManage?: boolean;
}

const TIPO_COLORS: Record<string, string> = {
  FACTURA: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  FACTURA_DANIO: 'bg-rose-50 text-rose-700 border-rose-200',
  RECIBO_CAJA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  NOTA_DEBITO: 'bg-amber-50 text-amber-700 border-amber-200',
  COTIZACION: 'bg-orange-50 text-orange-700 border-orange-200',
  CONTRATO: 'bg-slate-100 text-slate-800 border-slate-300',
  SOL_DESPACHO: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  SOL_RETORNO: 'bg-teal-50 text-teal-700 border-teal-200',
  ACTA_ENTREGA: 'bg-blue-50 text-blue-700 border-blue-200',
  ACTA_RECEPCION: 'bg-purple-50 text-purple-700 border-purple-200',
};

export const NumberingSeriesPage: React.FC<NumberingSeriesPageProps> = ({
  canManage = true,
}) => {
  const [series, setSeries] = useState<SerieDocumento[]>([]);
  const [kpis, setKpis] = useState({
    totalSeries: 0,
    activas: 0,
    agotadas: 0,
    enAlerta: 0,
  });
  const [sucursales, setSucursales] = useState<SucursalOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [mensajeOk, setMensajeOk] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroSucursal, setFiltroSucursal] = useState<string>('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [soloFiscal, setSoloFiscal] = useState<boolean>(false);

  // Modales
  const [modalFormOpen, setModalFormOpen] = useState(false);
  const [serieEditando, setSerieEditando] = useState<SerieDocumento | null>(null);
  const [modalDetailOpen, setModalDetailOpen] = useState(false);
  const [serieDetalleId, setSerieDetalleId] = useState<string | null>(null);

  useEffect(() => {
    cargarSucursales();
    cargarSeries();
  }, []);

  const cargarSucursales = async () => {
    try {
      const data = await numberingApi.getSucursales();
      setSucursales(data);
    } catch (e) {
      console.error('Error cargando sucursales:', e);
    }
  };

  const cargarSeries = async () => {
    setLoading(true);
    try {
      const params: NumberingFilterParams = {};
      if (filtroTipo) params.tipoDocumento = filtroTipo as TipoDocumentoSerie;
      if (filtroSucursal) params.sucursalId = filtroSucursal;
      if (filtroEstado) params.estado = filtroEstado as EstadoSerieDocumento;
      if (soloFiscal) params.esFiscal = true;
      if (search.trim()) params.q = search.trim();

      const res = await numberingApi.getSeries(params);
      setSeries(res.items);
      setKpis(res.kpis);
    } catch (err) {
      console.error('Error cargando series:', err);
    } finally {
      setLoading(false);
    }
  };

  // Recargar al cambiar filtros
  useEffect(() => {
    const timer = setTimeout(() => {
      cargarSeries();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, filtroTipo, filtroSucursal, filtroEstado, soloFiscal]);

  const handleActivar = async (serie: SerieDocumento) => {
    if (!canManage) return;
    if (serie.estado === 'ACTIVA') return;

    if (
      !confirm(
        `¿Desea activar la serie "${serie.serie}" como la serie oficial para ${serie.tipoDocumento}? Si existe otra serie activa para esta sucursal, pasará automáticamente a INACTIVA.`,
      )
    ) {
      return;
    }

    try {
      await numberingApi.activateSerie(serie.id);
      setMensajeOk(`Serie "${serie.serie}" activada correctamente como oficial.`);
      setTimeout(() => setMensajeOk(null), 4000);
      cargarSeries();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error al activar la serie');
    }
  };

  const handleAbrirCrear = () => {
    setSerieEditando(null);
    setModalFormOpen(true);
  };

  const handleAbrirEditar = (serie: SerieDocumento) => {
    setSerieEditando(serie);
    setModalFormOpen(true);
  };

  const handleAbrirDetalle = (serie: SerieDocumento) => {
    setSerieDetalleId(serie.id);
    setModalDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Notificación de éxito */}
      {mensajeOk && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold">{mensajeOk}</span>
        </div>
      )}

      {/* Header y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Series y Folios de Documentos
              </h2>
              <p className="text-xs text-slate-500">
                Control estricto de correlativos, rangos autorizados y folios oficiales por sucursal
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => cargarSeries()}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs cursor-pointer"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {canManage && (
            <button
              onClick={handleAbrirCrear}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Serie de Folios</span>
            </button>
          )}
        </div>
      </div>

      {/* TARJETAS KPI DE RESUMEN */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Total Series
            </span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">
              {kpis.totalSeries}
            </span>
            <span className="text-[11px] text-slate-500">Configuradas en el tenant</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">
              Series Activas
            </span>
            <span className="text-2xl font-black text-emerald-700 font-mono mt-0.5 block">
              {kpis.activas}
            </span>
            <span className="text-[11px] text-slate-500">En emisión oficial</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider block">
              Alerta de Consumo
            </span>
            <span className="text-2xl font-black text-amber-700 font-mono mt-0.5 block">
              {kpis.enAlerta}
            </span>
            <span className="text-[11px] text-slate-500">Consumo superior al 80%</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wider block">
              Series Agotadas
            </span>
            <span className="text-2xl font-black text-rose-700 font-mono mt-0.5 block">
              {kpis.agotadas}
            </span>
            <span className="text-[11px] text-slate-500">Bloqueadas para emisión</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por serie, prefijo..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Tipo de Documento */}
          <div>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="">Todos los Tipos de Documento</option>
              <option value="FACTURA">Facturas Oficiales (FAC)</option>
              <option value="FACTURA_DANIO">Facturas por Daños (FAC-DAN)</option>
              <option value="RECIBO_CAJA">Recibos de Caja (RC)</option>
              <option value="NOTA_DEBITO">Notas de Débito (ND)</option>
              <option value="COTIZACION">Cotizaciones (COT)</option>
              <option value="CONTRATO">Contratos (CTR)</option>
              <option value="SOL_DESPACHO">Solicitudes de Despacho</option>
              <option value="SOL_RETORNO">Solicitudes de Retorno</option>
              <option value="ACTA_ENTREGA">Actas de Entrega</option>
              <option value="ACTA_RECEPCION">Actas de Recepción</option>
            </select>
          </div>

          {/* Sucursal */}
          <div>
            <select
              value={filtroSucursal}
              onChange={(e) => setFiltroSucursal(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="">Todas las Sucursales</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} ({s.codigo})
                </option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="">Todos los Estados</option>
              <option value="ACTIVA">Solo ACTIVAS</option>
              <option value="INACTIVA">Solo INACTIVAS</option>
              <option value="AGOTADA">Solo AGOTADAS</option>
              <option value="VENCIDA">Solo VENCIDAS</option>
            </select>
          </div>

          {/* Checkbox Fiscal */}
          <div className="flex items-center">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={soloFiscal}
                onChange={(e) => setSoloFiscal(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Solo Fiscales DGI
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE SERIES Y FOLIOS */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Tipo Documento</th>
                <th className="py-3.5 px-4">Sucursal</th>
                <th className="py-3.5 px-4">Serie / Prefijo</th>
                <th className="py-3.5 px-4">Rango Autorizado</th>
                <th className="py-3.5 px-4">Folio Actual / Próximo</th>
                <th className="py-3.5 px-4 min-w-[160px]">Consumo (%)</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading && series.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Cargando series de folios...
                  </td>
                </tr>
              ) : series.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No se encontraron series de numeración con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                series.map((item) => {
                  const tipoColor = TIPO_COLORS[item.tipoDocumento] || 'bg-slate-100 text-slate-700';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Tipo Documento */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${tipoColor}`}
                          >
                            {item.tipoDocumento}
                          </span>
                          {item.esFiscal && (
                            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Fiscal
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sucursal */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold">
                            {item.sucursal ? item.sucursal.nombre : 'Toda la Empresa'}
                          </span>
                        </div>
                        {item.sucursal?.codigo && (
                          <span className="text-[10px] font-mono text-slate-400 block ml-5">
                            {item.sucursal.codigo}
                          </span>
                        )}
                      </td>

                      {/* Serie / Prefijo */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {item.prefijo ? `${item.prefijo}-` : ''}
                          {item.serie}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {item.plantilla || '{prefijo}-{serie}-{numero}'}
                        </span>
                      </td>

                      {/* Rango Autorizado */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-700">
                          #{item.numeroDesde} - #{item.numeroHasta}
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          Total: {item.totalRango.toLocaleString()} folios
                        </span>
                      </td>

                      {/* Folio Actual / Próximo */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-indigo-700">
                          {item.siguientePreview}
                        </div>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          Emitidos: #{item.numeroActual} ({item.foliosDisponibles.toLocaleString()} restantes)
                        </span>
                      </td>

                      {/* Consumo (%) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                          <span
                            className={`font-bold ${
                              item.alertaSuperada ? 'text-rose-600' : 'text-slate-700'
                            }`}
                          >
                            {item.porcentajeConsumo}%
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.foliosEmitidos} / {item.totalRango}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.porcentajeConsumo >= 80
                                ? 'bg-rose-500'
                                : item.porcentajeConsumo >= 60
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, item.porcentajeConsumo)}%` }}
                          />
                        </div>
                        {item.alertaSuperada && item.estado === 'ACTIVA' && (
                          <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                            <AlertTriangle className="w-3 h-3" /> Alerta: &gt;={item.alertaPorcentaje}%
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold inline-block ${
                            item.estado === 'ACTIVA'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.estado === 'AGOTADA'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : item.estado === 'VENCIDA'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {item.estado}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Activar serie */}
                          {item.estado !== 'ACTIVA' && item.estado !== 'AGOTADA' && canManage && (
                            <button
                              onClick={() => handleActivar(item)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Activar como serie oficial"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}

                          {/* Ver Detalle */}
                          <button
                            onClick={() => handleAbrirDetalle(item)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Ver bitácora de folios emitidos"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Editar */}
                          {canManage && (
                            <button
                              onClick={() => handleAbrirEditar(item)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Modificar serie"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CREAR / EDITAR */}
      <SerieFormModal
        isOpen={modalFormOpen}
        onClose={() => setModalFormOpen(false)}
        onSaved={cargarSeries}
        serieAEditar={serieEditando}
        sucursales={sucursales}
      />

      {/* MODAL DETALLE / HISTORIAL */}
      <SerieDetailModal
        isOpen={modalDetailOpen}
        serieId={serieDetalleId}
        onClose={() => setModalDetailOpen(false)}
      />
    </div>
  );
};
