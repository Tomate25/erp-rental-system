import React, { useState, useEffect } from 'react';
import type { ArregloPagoItem, MonedaTipo } from '../types/cxc.types';
import { cxcApi } from '../services/cxc.api';
import { SimuladorArregloModal } from './SimuladorArregloModal';
import { Plus, Search, ChevronDown, ChevronRight, Ban, ShieldAlert } from 'lucide-react';

interface ArreglosPagoTabProps {
  clientes: Array<{ id: string; nombre: string; rfc: string }>;
  moneda?: MonedaTipo;
  tipoCambioBcn: number;
}

export const ArreglosPagoTab: React.FC<ArreglosPagoTabProps> = ({
  clientes,
  moneda = 'NIO',
  tipoCambioBcn,
}) => {
  const [arreglos, setArreglos] = useState<ArregloPagoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [arregloExpandidoId, setArregloExpandidoId] = useState<string | null>(null);

  useEffect(() => {
    cargarArreglos();
  }, []);

  const cargarArreglos = async () => {
    setLoading(true);
    try {
      const data = await cxcApi.getArreglos();
      setArreglos(data);
    } catch (err) {
      console.error('Error cargando arreglos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAplicarPenalidad = async (id: string, numeroArreglo: string, penalidadUsd: number) => {
    const confirm = window.confirm(
      `¿Desea aplicar la penalidad por incumplimiento de $${penalidadUsd} USD sobre el acuerdo ${numeroArreglo}? Esto generará una Nota de Débito al tipo de cambio BCN oficial.`
    );
    if (!confirm) return;

    try {
      await cxcApi.aplicarPenalidad(id);
      alert('Penalidad por incumplimiento aplicada exitosamente mediante Nota de Débito.');
      cargarArreglos();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error al aplicar penalidad.');
    }
  };

  const handleAnular = async (id: string, numeroArreglo: string) => {
    const motivo = prompt(`Ingrese el motivo para anular el acuerdo de pago ${numeroArreglo}:`);
    if (!motivo) return;

    try {
      await cxcApi.anularArreglo(id, motivo);
      alert('Acuerdo de pago anulado. Las facturas han retornado a la cartera ordinaria.');
      cargarArreglos();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error al anular el acuerdo de pago.');
    }
  };

  const formatMonto = (valor: number) => {
    return `C$ ${valor.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const arreglosFiltrados = arreglos.filter(
    (a) =>
      a.numeroArreglo.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.cliente?.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Barra de Búsqueda y Botón Nuevo */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número de acuerdo, cliente..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:bg-white"
            />
          </div>
        </div>

        <button
          onClick={() => setModalNuevoOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#1A73E8] text-white rounded-lg hover:bg-[#1557B0] shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" />
          Simular / Formalizar Arreglo de Pago
        </button>
      </div>

      {/* Tabla de Acuerdos */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
              <tr>
                <th className="py-3 px-3 w-8"></th>
                <th className="py-3 px-3">No. Acuerdo</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Fecha Emisión</th>
                <th className="py-3 px-3 text-right">Capital Original</th>
                <th className="py-3 px-3 text-right">Intereses + Gastos</th>
                <th className="py-3 px-3 text-right">Total Acuerdo</th>
                <th className="py-3 px-3 text-right font-bold">Saldo Pendiente</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500">
                    Cargando acuerdos de pago...
                  </td>
                </tr>
              ) : arreglosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500">
                    No se han registrado acuerdos de pago.
                  </td>
                </tr>
              ) : (
                arreglosFiltrados.map((arr) => {
                  const isExpanded = arregloExpandidoId === arr.id;
                  return (
                    <React.Fragment key={arr.id}>
                      <tr className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setArregloExpandidoId(isExpanded ? null : arr.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#1A73E8] whitespace-nowrap">
                          {arr.numeroArreglo}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-gray-900">
                          {arr.cliente?.nombre}
                        </td>
                        <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                          {new Date(arr.fechaEmision).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          {formatMonto(arr.capitalOriginal)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-600 font-medium">
                          {formatMonto(arr.montoTotalIntereses + arr.montoGastosAdmin)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-900 font-semibold">
                          {formatMonto(arr.montoTotalArreglo)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                          {formatMonto(arr.saldoPendiente)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              arr.estado === 'FORMALIZADO' || arr.estado === 'VIGENTE'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : arr.estado === 'CANCELADO'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : arr.estado === 'INCUMPLIDO'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {arr.estado}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {arr.estado !== 'ANULADO' && arr.estado !== 'CANCELADO' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAplicarPenalidad(arr.id, arr.numeroArreglo, arr.penalidadIncumplimientoUsd)
                                  }
                                  title="Aplicar penalidad por mora"
                                  className="p-1 text-gray-400 hover:text-amber-600 rounded transition-colors"
                                >
                                  <ShieldAlert className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAnular(arr.id, arr.numeroArreglo)}
                                  title="Anular acuerdo"
                                  className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Cuotas del Arreglo Desplegadas */}
                      {isExpanded && arr.cuotas && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={10} className="p-4 pl-10">
                            <div className="text-xs font-semibold text-gray-700 mb-2 flex items-center justify-between">
                              <span>Calendario de Amortización ({arr.cuotas.length} cuotas):</span>
                              <span className="text-gray-500 font-normal">
                                Penalidad por incumplimiento pactada: <strong>${arr.penalidadIncumplimientoUsd} USD</strong>
                              </span>
                            </div>
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-xs">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                  <tr>
                                    <th className="py-2 px-3">Cuota #</th>
                                    <th className="py-2 px-3">Fecha Vencimiento</th>
                                    <th className="py-2 px-3 text-right">Capital</th>
                                    <th className="py-2 px-3 text-right">Interés</th>
                                    <th className="py-2 px-3 text-right">Gastos Admin</th>
                                    <th className="py-2 px-3 text-right">Total Cuota</th>
                                    <th className="py-2 px-3 text-right font-bold">Saldo Cuota</th>
                                    <th className="py-2 px-3 text-center">Estado</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {arr.cuotas.map((c) => (
                                    <tr key={c.id} className="hover:bg-gray-50/50">
                                      <td className="py-1.5 px-3 font-semibold">{c.numeroCuota}</td>
                                      <td className="py-1.5 px-3">{new Date(c.fechaVencimiento).toLocaleDateString()}</td>
                                      <td className="py-1.5 px-3 text-right">{formatMonto(c.capital)}</td>
                                      <td className="py-1.5 px-3 text-right text-amber-600 font-medium">
                                        {formatMonto(c.interes)}
                                      </td>
                                      <td className="py-1.5 px-3 text-right text-gray-500">{formatMonto(c.gastosAdmin)}</td>
                                      <td className="py-1.5 px-3 text-right font-semibold">{formatMonto(c.totalCuota)}</td>
                                      <td className="py-1.5 px-3 text-right font-bold text-[#1A73E8]">
                                        {formatMonto(c.saldoCuota)}
                                      </td>
                                      <td className="py-1.5 px-3 text-center">
                                        <span
                                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                            c.estado === 'PAGADA'
                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                              : c.estado === 'VENCIDA'
                                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                              : 'bg-gray-100 text-gray-700'
                                          }`}
                                        >
                                          {c.estado}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Simulador */}
      <SimuladorArregloModal
        isOpen={modalNuevoOpen}
        onClose={() => setModalNuevoOpen(false)}
        onSuccess={cargarArreglos}
        clientes={clientes}
        moneda={moneda}
        tipoCambioBcn={tipoCambioBcn}
      />
    </div>
  );
};
