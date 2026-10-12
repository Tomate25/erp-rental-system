import React, { useState, useEffect } from 'react';
import type { ReciboCajaItem, MonedaTipo } from '../types/cxc.types';
import { cxcApi } from '../services/cxc.api';
import { ReciboCajaModal } from './ReciboCajaModal';
import { Plus, Search, Ban, AlertTriangle } from 'lucide-react';

interface RecibosCajaTabProps {
  clientes: Array<{ id: string; nombre: string; rfc: string; esRetenedor?: boolean }>;
  moneda?: MonedaTipo;
  tipoCambioBcn: number;
}

export const RecibosCajaTab: React.FC<RecibosCajaTabProps> = ({
  clientes,
  moneda = 'NIO',
  tipoCambioBcn,
}) => {
  const [recibos, setRecibos] = useState<ReciboCajaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [anulandoId, setAnulandoId] = useState<string | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');

  useEffect(() => {
    cargarRecibos();
  }, []);

  const cargarRecibos = async () => {
    setLoading(true);
    try {
      const data = await cxcApi.getRecibos();
      setRecibos(data);
    } catch (err) {
      console.error('Error cargando recibos de caja:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnular = async (id: string) => {
    if (!motivoAnulacion.trim()) {
      alert('Debe ingresar un motivo para anular el recibo.');
      return;
    }
    try {
      await cxcApi.anularRecibo(id, motivoAnulacion);
      setAnulandoId(null);
      setMotivoAnulacion('');
      cargarRecibos();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error al anular el recibo de caja.');
    }
  };

  const recibosFiltrados = recibos.filter(
    (r) =>
      r.numeroRecibo.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.cliente?.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.concepto.toLowerCase().includes(busqueda.toLowerCase())
  );

  const formatMonto = (valor: number) => {
    return `C$ ${valor.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-4">
      {/* Barra de Búsqueda y Botón Nuevo */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número de recibo, cliente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          onClick={() => setModalNuevoOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Emitir Recibo de Caja
        </button>
      </div>

      {/* Tabla de Recibos */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="py-3 px-3">No. Recibo</th>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Método / Ref</th>
                <th className="py-3 px-3 text-right">Efectivo / Banco</th>
                <th className="py-3 px-3 text-right">Ret. IR 2%</th>
                <th className="py-3 px-3 text-right">Ret. IMI 1%</th>
                <th className="py-3 px-3 text-right font-bold">Total Liquidado</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500">
                    Cargando recibos de caja...
                  </td>
                </tr>
              ) : recibosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500">
                    No se han registrado recibos de caja en el sistema.
                  </td>
                </tr>
              ) : (
                recibosFiltrados.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="py-2.5 px-3 font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {r.numeroRecibo}
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {new Date(r.fechaRecibo).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-gray-100">
                      <div>{r.cliente?.nombre}</div>
                      <div className="text-[10px] text-gray-400">{r.concepto}</div>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">
                      <div>{r.metodoPago}</div>
                      {r.numeroTransferenciaReferencia && (
                        <div className="text-[10px] text-gray-400">Ref: {r.numeroTransferenciaReferencia}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatMonto(r.montoEfectivoBancos)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-700 dark:text-gray-300">
                      {r.montoRetencionIr > 0 ? (
                        <div>
                          <div>{formatMonto(r.montoRetencionIr)}</div>
                          <div className="text-[10px] text-gray-400">{r.noConstanciaRetencionIr}</div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-700 dark:text-gray-300">
                      {r.montoRetencionImi > 0 ? (
                        <div>
                          <div>{formatMonto(r.montoRetencionImi)}</div>
                          <div className="text-[10px] text-gray-400">{r.noConstanciaRetencionImi}</div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-gray-900 dark:text-gray-100">
                      {formatMonto(r.totalLiquidado)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          r.estado === 'EMITIDO'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                        }`}
                      >
                        {r.estado}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {r.estado === 'EMITIDO' && (
                          <button
                            type="button"
                            onClick={() => setAnulandoId(r.id)}
                            title="Anular recibo"
                            className="p-1 text-gray-400 hover:text-rose-600 rounded"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Anulación */}
      {anulandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Anular Recibo de Caja</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300">
              Esta acción revertirá las aplicaciones contables y restaurará los saldos de cartera pendientes de las facturas amortizadas.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Motivo de anulación *
              </label>
              <textarea
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                rows={3}
                placeholder="Indique la justificación formal..."
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAnulandoId(null);
                  setMotivoAnulacion('');
                }}
                className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleAnular(anulandoId)}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-sm"
              >
                Confirmar Anulación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nuevo Recibo */}
      <ReciboCajaModal
        isOpen={modalNuevoOpen}
        onClose={() => setModalNuevoOpen(false)}
        onSuccess={cargarRecibos}
        clientes={clientes}
        moneda={moneda}
        tipoCambioBcn={tipoCambioBcn}
      />
    </div>
  );
};
