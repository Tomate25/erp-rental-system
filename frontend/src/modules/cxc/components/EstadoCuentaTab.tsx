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
    <div className="space-y-4">
      {/* Selector de Cliente y Rango de Fechas */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-72">
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Seleccionar Cliente</label>
            <select
              value={selectedClienteId}
              onChange={(e) => setSelectedClienteId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium"
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
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
            />
          </div>
        </div>

        <button
          onClick={() => window.print()}
          disabled={!estadoCuenta}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm"
        >
          <Printer className="w-3.5 h-3.5" />
          Imprimir Estado de Cuenta
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          Cargando movimientos del cliente...
        </div>
      ) : !estadoCuenta ? (
        <div className="p-12 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          Seleccione un cliente para ver su estado de cuenta oficial.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Ficha Fiscal del Cliente */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{estadoCuenta.cliente.nombre}</h2>
                  {estadoCuenta.cliente.esRetenedor && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <ShieldCheck className="w-3 h-3" />
                      Agente Retenedor DGI
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  RUC / Cédula: <span className="font-semibold text-gray-700 dark:text-gray-300">{estadoCuenta.cliente.rfc}</span>
                  {estadoCuenta.cliente.direccion && ` • ${estadoCuenta.cliente.direccion}`}
                </div>
              </div>

              {/* Tarjetas resumen */}
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-right min-w-[120px]">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Total Cargos</span>
                  <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {formatMonto(estadoCuenta.resumen.totalCargos)}
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-right min-w-[120px]">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Total Abonos</span>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatMonto(estadoCuenta.resumen.totalAbonos)}
                  </div>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-900 text-right min-w-[140px]">
                  <span className="text-[10px] text-blue-700 dark:text-blue-300 uppercase font-bold">Saldo Actual</span>
                  <div className="text-base font-extrabold text-blue-900 dark:text-blue-100">
                    {formatMonto(estadoCuenta.resumen.saldoActualVisualizado)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Movimientos Cronológicos */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="py-3 px-3">Fecha</th>
                    <th className="py-3 px-3">Tipo</th>
                    <th className="py-3 px-3">No. Documento</th>
                    <th className="py-3 px-4">Concepto / Detalle</th>
                    <th className="py-3 px-3 text-right">Cargo (Debe)</th>
                    <th className="py-3 px-3 text-right">Abono (Haber)</th>
                    <th className="py-3 px-3 text-right font-bold">Saldo Acumulado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {estadoCuenta.movimientos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        No hay movimientos registrados para este cliente en el periodo seleccionado.
                      </td>
                    </tr>
                  ) : (
                    estadoCuenta.movimientos.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <td className="py-2.5 px-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {new Date(m.fecha).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              m.tipoMovimiento === 'FACTURA'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                : m.tipoMovimiento === 'RECIBO_CAJA'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : m.tipoMovimiento === 'NOTA_DEBITO'
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
                                : 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                            }`}
                          >
                            {m.tipoMovimiento}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {m.numeroDocumento}
                        </td>
                        <td className="py-2.5 px-4 text-gray-700 dark:text-gray-300 max-w-xs truncate">
                          {m.concepto}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {m.cargo > 0 ? (
                            <span className="text-gray-900 dark:text-gray-100 flex items-center justify-end gap-1">
                              {formatMonto(m.cargo)}
                              <ArrowDownRight className="w-3 h-3 text-rose-500 inline" />
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {m.abono > 0 ? (
                            <span className="flex items-center justify-end gap-1">
                              {formatMonto(m.abono)}
                              <ArrowUpRight className="w-3 h-3 text-emerald-500 inline" />
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
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
