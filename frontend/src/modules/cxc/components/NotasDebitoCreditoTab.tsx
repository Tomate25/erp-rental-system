import React, { useState, useEffect } from 'react';
import type { NotaItem, MonedaTipo } from '../types/cxc.types';
import { cxcApi } from '../services/cxc.api';
import { NotaModal } from './NotaModal';
import { Plus, Search, Ban } from 'lucide-react';

interface NotasDebitoCreditoTabProps {
  clientes: Array<{ id: string; nombre: string; rfc: string }>;
  moneda?: MonedaTipo;
  tipoCambioBcn: number;
}

export const NotasDebitoCreditoTab: React.FC<NotasDebitoCreditoTabProps> = ({
  clientes,
  tipoCambioBcn,
}) => {
  const [notas, setNotas] = useState<NotaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('TODAS');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    cargarNotas();
  }, [filtroTipo]);

  const cargarNotas = async () => {
    setLoading(true);
    try {
      const data = await cxcApi.getNotas({
        tipoNota: filtroTipo !== 'TODAS' ? filtroTipo : undefined,
      });
      setNotas(data);
    } catch (err) {
      console.error('Error cargando notas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnular = async (id: string, numeroNota: string) => {
    const motivo = prompt(`Ingrese el motivo para anular la nota ${numeroNota}:`);
    if (!motivo) return;

    try {
      await cxcApi.anularNota(id, motivo);
      alert('Nota anulada exitosamente y asiento revertido.');
      cargarNotas();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error al anular la nota.');
    }
  };

  const formatMonto = (valor: number) => {
    return `C$ ${valor.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const notasFiltradas = notas.filter(
    (n) =>
      n.numeroNota.toLowerCase().includes(busqueda.toLowerCase()) ||
      n.cliente?.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      n.concepto.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Barra de Filtros y Botón Nuevo */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número de nota, cliente, concepto..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-700/60 rounded-lg text-xs">
            <button
              onClick={() => setFiltroTipo('TODAS')}
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                filtroTipo === 'TODAS' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFiltroTipo('DEBITO')}
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                filtroTipo === 'DEBITO' ? 'bg-white dark:bg-gray-800 text-orange-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              Débito (ND)
            </button>
            <button
              onClick={() => setFiltroTipo('CREDITO')}
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                filtroTipo === 'CREDITO' ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              Crédito (NC)
            </button>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Nueva Nota (ND / NC)
        </button>
      </div>

      {/* Tabla de Notas */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="py-3 px-3">No. Nota</th>
                <th className="py-3 px-3">Tipo</th>
                <th className="py-3 px-3">Cliente</th>
                <th className="py-3 px-3">Origen</th>
                <th className="py-3 px-3">Emisión</th>
                <th className="py-3 px-3">Vencimiento</th>
                <th className="py-3 px-3 text-right">Subtotal</th>
                <th className="py-3 px-3 text-right">IVA</th>
                <th className="py-3 px-3 text-right font-bold">Total</th>
                <th className="py-3 px-3 text-right font-bold">Saldo Pendiente</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-gray-500">
                    Cargando notas...
                  </td>
                </tr>
              ) : notasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-gray-500">
                    No se han registrado notas de débito o crédito.
                  </td>
                </tr>
              ) : (
                notasFiltradas.map((n) => (
                  <tr key={n.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                    <td className="py-2.5 px-3 font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                      {n.numeroNota}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          n.tipoNota === 'DEBITO'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                        }`}
                      >
                        {n.tipoNota === 'DEBITO' ? 'DÉBITO' : 'CRÉDITO'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-gray-900 dark:text-gray-100">
                      <div>{n.cliente?.nombre}</div>
                      <div className="text-[10px] text-gray-400 truncate max-w-xs">{n.concepto}</div>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300 text-[11px] whitespace-nowrap">
                      {n.origen}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                      {new Date(n.fechaEmision).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 whitespace-nowrap">
                      {new Date(n.fechaVence).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-right">{formatMonto(n.subtotal)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-500">
                      {n.iva > 0 ? formatMonto(n.iva) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-gray-900 dark:text-gray-100">
                      {formatMonto(n.total)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-gray-900 dark:text-gray-100">
                      {formatMonto(n.saldoPendiente)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          n.estado === 'PAGADA'
                            ? 'bg-emerald-100 text-emerald-800'
                            : n.estado === 'ANULADA'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {n.estado}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {n.estado !== 'ANULADA' && n.estado !== 'PAGADA' && (
                        <button
                          type="button"
                          onClick={() => handleAnular(n.id, n.numeroNota)}
                          title="Anular nota"
                          className="p-1 text-gray-400 hover:text-rose-600 rounded"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <NotaModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={cargarNotas}
        clientes={clientes}
        tipoCambioBcn={tipoCambioBcn}
      />
    </div>
  );
};
