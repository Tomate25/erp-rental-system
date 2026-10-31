import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, AlertCircle, Clock, FileText } from 'lucide-react';
import type { SerieDocumento } from '../types/numbering.types';
import { numberingApi } from '../services/numbering.api';

interface SerieDetailModalProps {
  serieId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const SerieDetailModal: React.FC<SerieDetailModalProps> = ({
  serieId,
  isOpen,
  onClose,
}) => {
  const [serie, setSerie] = useState<SerieDocumento | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && serieId) {
      cargarDetalle(serieId);
    } else {
      setSerie(null);
      setError(null);
    }
  }, [isOpen, serieId]);

  const cargarDetalle = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await numberingApi.getSerie(id);
      setSerie(data);
    } catch (err: any) {
      console.error('Error cargando detalle de serie:', err);
      setError(err?.message || 'Error al obtener información de la serie.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Historial y Bitácora de Serie
              </h3>
              <p className="text-xs text-slate-500">
                Detalle de folios emitidos y parámetros de numeración
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              Cargando bitácora de la serie...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          ) : serie ? (
            <>
              {/* Tarjeta de Resumen */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-800">
                      {serie.tipoDocumento}
                    </span>
                    <span className="text-sm font-mono font-bold text-slate-800">
                      Serie {serie.serie}
                    </span>
                    {serie.esFiscal && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Fiscal DGI
                      </span>
                    )}
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                      serie.estado === 'ACTIVA'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : serie.estado === 'AGOTADA'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {serie.estado}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Sucursal</span>
                    <span className="font-semibold text-slate-700">
                      {serie.sucursal ? `${serie.sucursal.nombre} (${serie.sucursal.codigo})` : 'Toda la empresa'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Rango Autorizado</span>
                    <span className="font-mono font-semibold text-slate-700">
                      {serie.numeroDesde} - {serie.numeroHasta}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Folios Emitidos</span>
                    <span className="font-mono font-bold text-indigo-700">
                      {serie.foliosEmitidos} folios ({serie.porcentajeConsumo}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Próximo Folio</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {serie.siguientePreview}
                    </span>
                  </div>
                </div>

                {/* Barra de progreso */}
                <div className="pt-2">
                  <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-1">
                    <span>Consumo de folios</span>
                    <span>{serie.porcentajeConsumo}% utilizado</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        serie.porcentajeConsumo >= 80
                          ? 'bg-rose-500'
                          : serie.porcentajeConsumo >= 60
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, serie.porcentajeConsumo)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Bitácora de Folios Emitidos */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Últimos Folios Emitidos ({serie.usos?.length || 0})
                </h4>

                {(!serie.usos || serie.usos.length === 0) ? (
                  <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                    Esta serie aún no ha emitido ningún folio oficial.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Folio Formateado</th>
                          <th className="py-2.5 px-3">Número</th>
                          <th className="py-2.5 px-3">Fecha y Hora</th>
                          <th className="py-2.5 px-3 text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {serie.usos.map((uso) => (
                          <tr key={uso.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                              {uso.codigoFormateado}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              #{uso.numero}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                              {new Date(uso.createdAt).toLocaleString('es-NI')}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  uso.estado === 'EMITIDO'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {uso.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
