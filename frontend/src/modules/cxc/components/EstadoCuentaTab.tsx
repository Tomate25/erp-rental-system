import React, { useState, useEffect } from 'react';
import type { EstadoCuentaResponse, MonedaTipo } from '../types/cxc.types';
import { cxcApi } from '../services/cxc.api';
import { Printer, ShieldCheck, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface EstadoCuentaTabProps {
  clientes: Array<{ id: string; nombre: string; rfc: string }>;
  clienteInicialId?: string | null;
  moneda: MonedaTipo;
}

export const EstadoCuentaTab: React.FC<EstadoCuentaTabProps> = ({
  clientes,
  clienteInicialId,
  moneda,
}) => {
  const [selectedClienteId, setSelectedClienteId] = useState<string>(clienteInicialId || (clientes[0]?.id || ''));
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [loading, setLoading] = useState(false);
  const [estadoCuenta, setEstadoCuenta] = useState<EstadoCuentaResponse | null>(null);

  useEffect(() => {
    if (clienteInicialId) {
      setSelectedClienteId(clienteInicialId);
    }
  }, [clienteInicialId]);

  useEffect(() => {
    if (!selectedClienteId) return;
    cargarEstadoCuenta();
  }, [selectedClienteId, moneda, fechaDesde, fechaHasta]);

  const cargarEstadoCuenta = async () => {
    if (!selectedClienteId) return;
    setLoading(true);
    try {
      const data = await cxcApi.getEstadoCuenta(selectedClienteId, {
        moneda,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
      });
      setEstadoCuenta(data);
    } catch (err) {
      console.error('Error cargando estado de cuenta:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatMonto = (valor: number) => {
    const symbol = moneda === 'USD' ? '$' : 'C$';
    return `${symbol} ${valor.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Selector de Cliente y Rango de Fechas */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E8EE] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-72">
            <label className="block text-[11px] font-bold text-[#747780] uppercase mb-1">Seleccionar Cliente</label>
            <select
              value={selectedClienteId}
              onChange={(e) => setSelectedClienteId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-white border border-[#E5E8EE] rounded-xl focus:ring-1 focus:ring-[#1A73E8] focus:border-[#1A73E8] font-bold text-[#1B1D22]"
            >
              <option value="">-- Seleccionar cliente --</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.rfc || 'Sin RUC'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#747780] uppercase mb-1">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-[#E5E8EE] rounded-xl text-[#1B1D22] font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#747780] uppercase mb-1">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-[#E5E8EE] rounded-xl text-[#1B1D22] font-medium"
            />
          </div>
        </div>

        <button
          onClick={() => window.print()}
          disabled={!estadoCuenta}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-[#1A73E8] text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-xs cursor-pointer transition-all"
        >
          <Printer className="w-3.5 h-3.5" />
          Imprimir Estado de Cuenta
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#747780] font-medium bg-white rounded-2xl border border-[#E5E8EE]">
          Cargando movimientos del cliente...
        </div>
      ) : !estadoCuenta ? (
        <div className="p-12 text-center text-[#747780] font-medium bg-white rounded-2xl border border-[#E5E8EE]">
          Seleccione un cliente para ver su estado de cuenta oficial.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Ficha Fiscal del Cliente */}
          <div className="bg-white p-5 rounded-2xl border border-[#E5E8EE] shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-[#1B1D22]">{estadoCuenta.cliente.nombre}</h2>
                  {estadoCuenta.cliente.esRetenedor && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3 h-3" />
                      Agente Retenedor DGI
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#747780] mt-1 font-medium">
                  RUC / Cédula: <span className="font-bold text-[#1B1D22]">{estadoCuenta.cliente.rfc}</span>
                  {estadoCuenta.cliente.direccion && ` • ${estadoCuenta.cliente.direccion}`}
                </div>
              </div>

              {/* Tarjetas resumen */}
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E5E8EE] text-right min-w-[120px]">
                  <span className="text-[10px] text-[#747780] uppercase font-bold block">Total Cargos</span>
                  <div className="text-sm font-black text-[#1B1D22] font-mono mt-0.5">
                    {formatMonto(estadoCuenta.resumen.totalCargos)}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 text-right min-w-[120px]">
                  <span className="text-[10px] text-emerald-800 uppercase font-bold block">Total Abonos</span>
                  <div className="text-sm font-black text-emerald-700 font-mono mt-0.5">
                    {formatMonto(estadoCuenta.resumen.totalAbonos)}
                  </div>
                </div>
                <div className="p-3 bg-[#E8F0FE] rounded-xl border border-[#1A73E8]/30 text-right min-w-[140px]">
                  <span className="text-[10px] text-[#1A73E8] uppercase font-black block">Saldo Actual</span>
                  <div className="text-base font-black text-[#1A73E8] font-mono mt-0.5">
                    {formatMonto(estadoCuenta.resumen.saldoActualVisualizado)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Movimientos Cronológicos */}
          <div className="bg-white rounded-2xl border border-[#E5E8EE] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F4F6F9] text-[#747780] font-extrabold text-[10px] uppercase border-b border-[#E5E8EE]">
                  <tr>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-3">Tipo</th>
                    <th className="py-3 px-3">No. Documento</th>
                    <th className="py-3 px-4">Concepto / Detalle</th>
                    <th className="py-3 px-3 text-right">Cargo (Debe)</th>
                    <th className="py-3 px-3 text-right">Abono (Haber)</th>
                    <th className="py-3 px-4 text-right font-black">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E8EE] font-medium text-[#1B1D22]">
                  {estadoCuenta.movimientos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#747780] font-medium">
                        No hay movimientos registrados para este cliente en el periodo seleccionado.
                      </td>
                    </tr>
                  ) : (
                    estadoCuenta.movimientos.map((m) => (
                      <tr key={m.id} className="hover:bg-[#F8FAFC]">
                        <td className="py-3 px-4 text-[#747780] whitespace-nowrap">
                          {new Date(m.fecha).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                              m.tipoMovimiento === 'FACTURA'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : m.tipoMovimiento === 'RECIBO_CAJA'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : m.tipoMovimiento === 'NOTA_DEBITO'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-purple-50 text-purple-800 border border-purple-200'
                            }`}
                          >
                            {m.tipoMovimiento}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-black text-[#1A73E8] whitespace-nowrap">
                          {m.numeroDocumento}
                        </td>
                        <td className="py-3 px-4 text-[#1B1D22] max-w-xs truncate">
                          {m.concepto}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#1B1D22] whitespace-nowrap font-mono">
                          {m.cargo > 0 ? (
                            <span className="flex items-center justify-end gap-1">
                              {formatMonto(m.cargo)}
                              <ArrowDownRight className="w-3 h-3 text-rose-500 inline" />
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-700 whitespace-nowrap font-mono">
                          {m.abono > 0 ? (
                            <span className="flex items-center justify-end gap-1">
                              {formatMonto(m.abono)}
                              <ArrowUpRight className="w-3 h-3 text-emerald-500 inline" />
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-[#1B1D22] whitespace-nowrap font-mono">
                          {formatMonto(m.saldoAcumulado)}
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
    </div>
  );
};
