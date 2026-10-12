import React, { useState, useEffect } from 'react';
import type { ReciboCajaItem, MonedaTipo } from '../types/cxc.types';
import { cxcApi } from '../services/cxc.api';
import { ReciboCajaModal } from './ReciboCajaModal';
import { Plus, Search, Printer, Ban, AlertTriangle } from 'lucide-react';

interface RecibosCajaTabProps {
  clientes: Array<{ id: string; nombre: string; rfc: string }>;
  moneda: MonedaTipo;
  tipoCambioBcn: number;
}

export const RecibosCajaTab: React.FC<RecibosCajaTabProps> = ({
  clientes,
  moneda,
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
    } catch (e) {
      console.error('Error cargando recibos de caja:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAnular = async (id: string) => {
    if (!motivoAnulacion.trim()) {
      alert('Por favor ingrese el motivo de anulación formal.');
      return;
    }
    try {
      await cxcApi.anularRecibo(id, motivoAnulacion);
      setAnulandoId(null);
      setMotivoAnulacion('');
      cargarRecibos();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al anular el recibo de caja');
    }
  };

  const formatMonto = (valor: number, m: MonedaTipo = moneda) => {
    const symbol = m === 'USD' ? '$' : 'C$';
    return `${symbol} ${Number(valor || 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const recibosFiltrados = recibos.filter((r) => {
    if (!busqueda.trim()) return true;
    const q = busqueda.toLowerCase();
    const clienteNombre = r.cliente?.nombre || '';
    const ref = r.numeroTransferenciaReferencia || '';
    return (
      r.numeroRecibo.toLowerCase().includes(q) ||
      clienteNombre.toLowerCase().includes(q) ||
      ref.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 font-sans">
      {/* Barra de Acciones y Búsqueda */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#747780]" />
            <input
              type="text"
              placeholder="Buscar por número de recibo, cliente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E5E8EE] rounded-xl text-[#1B1D22] focus:ring-1 focus:ring-[#1A73E8] focus:border-[#1A73E8]"
            />
          </div>
        </div>

        <button
          onClick={() => setModalNuevoOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Emitir Recibo de Caja
        </button>
      </div>

      {/* Tabla de Recibos */}
      <div className="bg-white rounded-2xl border border-[#E5E8EE] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F6F9] text-[#747780] font-extrabold text-[10px] uppercase border-b border-[#E5E8EE]">
              <tr>
                <th className="py-3 px-4">No. Recibo</th>
                <th className="py-3 px-3">Fecha</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-3">Método / Ref</th>
                <th className="py-3 px-3 text-right">Efectivo / Banco</th>
                <th className="py-3 px-3 text-right">Ret. IR 2%</th>
                <th className="py-3 px-3 text-right">Ret. IMI 1%</th>
                <th className="py-3 px-4 text-right font-black">Total Liquidado</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8EE] font-medium text-[#1B1D22]">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#747780]">
                    Cargando recibos de caja...
                  </td>
                </tr>
              ) : recibosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-[#747780]">
                    No se han registrado recibos de caja aún.
                  </td>
                </tr>
              ) : (
                recibosFiltrados.map((r) => {
                  const mTipo = (r.moneda as MonedaTipo) || moneda;
                  return (
                    <tr key={r.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 font-black text-[#1A73E8]">
                        {r.numeroRecibo}
                      </td>
                      <td className="py-3 px-3 text-[#747780] whitespace-nowrap">
                        {new Date(r.fechaRecibo).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#1B1D22]">
                        {r.cliente?.nombre || '—'}
                      </td>
                      <td className="py-3 px-3 text-[#747780]">
                        <span className="font-semibold text-[#1B1D22]">{r.metodoPago}</span>
                        {r.numeroTransferenciaReferencia && (
                          <span className="block text-[11px] text-[#747780]">{r.numeroTransferenciaReferencia}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {formatMonto(r.montoEfectivoBancos, mTipo)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#747780]">
                        {r.montoRetencionIr > 0 ? formatMonto(r.montoRetencionIr, mTipo) : '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#747780]">
                        {r.montoRetencionImi > 0 ? formatMonto(r.montoRetencionImi, mTipo) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-[#1B1D22]">
                        {formatMonto(r.totalLiquidado, mTipo)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            r.estado === 'EMITIDO'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {r.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="p-1.5 text-[#1A73E8] hover:bg-[#E8F0FE] rounded-lg transition-all cursor-pointer"
                            title="Imprimir Recibo"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {r.estado === 'EMITIDO' && (
                            <button
                              type="button"
                              onClick={() => setAnulandoId(r.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Anular Recibo"
                            >
                              <Ban className="w-3.5 h-3.5" />
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

      {/* Modal de Anulación */}
      {anulandoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#37474F]/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-[#E5E8EE] shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-black text-[#1B1D22]">Anular Recibo de Caja</h3>
            </div>
            <p className="text-xs text-[#747780] font-medium">
              Esta acción revertirá las aplicaciones contables y restaurará los saldos de cartera pendientes de las facturas amortizadas.
            </p>
            <div>
              <label className="block text-xs font-bold text-[#1B1D22] mb-1">
                Motivo de anulación *
              </label>
              <textarea
                value={motivoAnulacion}
                onChange={(e) => setMotivoAnulacion(e.target.value)}
                rows={3}
                placeholder="Indique la justificación formal..."
                className="w-full px-3 py-2 text-xs bg-white border border-[#E5E8EE] rounded-xl text-[#1B1D22] focus:ring-1 focus:ring-[#1A73E8]"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAnulandoId(null);
                  setMotivoAnulacion('');
                }}
                className="px-4 py-2 text-xs font-bold text-[#747780] hover:bg-[#F4F6F9] rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleAnular(anulandoId)}
                className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-xs cursor-pointer"
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
