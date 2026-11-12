import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  User,
  FileText,
  MapPin,
  Package,
} from 'lucide-react';
import type { InsumoMovimiento, TipoMovimientoInsumo, Insumo } from '../types/insumo.types';
import { getMovimientosInsumos } from '../services/insumo.api';
import { formatCurrency } from '../../../shared/utils/formatters';

interface KardexMovimientosTableProps {
  insumos: Insumo[];
  refreshTrigger?: number;
}

export const KardexMovimientosTable: React.FC<KardexMovimientosTableProps> = ({
  insumos,
  refreshTrigger = 0,
}) => {
  const [movimientos, setMovimientos] = useState<InsumoMovimiento[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tipoFilter, setTipoFilter] = useState<TipoMovimientoInsumo | 'ALL'>('ALL');
  const [insumoFilter, setInsumoFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const loadMovimientos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMovimientosInsumos({
        tipo: tipoFilter !== 'ALL' ? tipoFilter : undefined,
        insumoId: insumoFilter !== 'ALL' ? insumoFilter : undefined,
        search: searchTerm.trim() || undefined,
        limit: 100,
      });
      setMovimientos(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar el historial de movimientos.');
    } finally {
      setLoading(false);
    }
  }, [tipoFilter, insumoFilter, searchTerm]);

  useEffect(() => {
    void loadMovimientos();
  }, [loadMovimientos, refreshTrigger]);

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('es-NI', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por motivo, destino, referencia o insumo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
          />
        </div>

        {/* Tipo Filter */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-zinc-400 shrink-0" />
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value as any)}
            className="px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden font-medium text-zinc-700 cursor-pointer"
          >
            <option value="ALL">Todos los Movimientos</option>
            <option value="SALIDA">🔴 Salidas / Despachos</option>
            <option value="ENTRADA">🟢 Entradas / Compras</option>
            <option value="AJUSTE">🔵 Ajustes de Conteo</option>
          </select>
        </div>

        {/* Insumo Filter */}
        <select
          value={insumoFilter}
          onChange={(e) => setInsumoFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden font-medium text-zinc-700 max-w-xs truncate cursor-pointer"
        >
          <option value="ALL">Todos los Insumos</option>
          {insumos.map((ins) => (
            <option key={ins.id} value={ins.id}>
              {ins.codigo ? `[${ins.codigo}] ` : ''}
              {ins.nombre}
            </option>
          ))}
        </select>

        <button
          onClick={loadMovimientos}
          title="Recargar kardex"
          className="p-2 border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadMovimientos} className="underline font-bold cursor-pointer">
            Reintentar
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-800">
              Kardex de Movimientos de Bodega
            </h3>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-800">
              {total} registros
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 font-medium">
            Entradas por compras y salidas manuales o de taller
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/30 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                <th className="py-3 px-4">Fecha & Hora</th>
                <th className="py-3 px-4">Insumo</th>
                <th className="py-3 px-4 text-center">Tipo</th>
                <th className="py-3 px-4 text-right">Cantidad</th>
                <th className="py-3 px-4 text-center">Stock (Ant → Nvo)</th>
                <th className="py-3 px-4">Motivo / Destino</th>
                <th className="py-3 px-4">Referencia</th>
                <th className="py-3 px-4">Usuario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs text-zinc-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-zinc-500" />
                    Cargando movimientos del kardex...
                  </td>
                </tr>
              ) : movimientos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    <Package className="w-8 h-8 mx-auto mb-2 text-zinc-300" />
                    <p className="font-bold text-sm text-zinc-700">
                      No hay movimientos registrados
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Las salidas manuales y entradas de compras se reflejarán aquí.
                    </p>
                  </td>
                </tr>
              ) : (
                movimientos.map((mov) => {
                  const isSalida = mov.tipo === 'SALIDA';
                  const isEntrada = mov.tipo === 'ENTRADA';
                  const cantidadNum = Number(mov.cantidad);
                  const unidad = mov.insumo?.unidadMedida || 'und';

                  return (
                    <tr
                      key={mov.id}
                      className="hover:bg-zinc-50/80 transition-colors"
                    >
                      {/* Fecha */}
                      <td className="py-3 px-4 whitespace-nowrap text-zinc-600 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{formatDate(mov.createdAt)}</span>
                        </div>
                      </td>

                      {/* Insumo */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900">
                          {mov.insumo?.nombre || 'Insumo'}
                        </div>
                        {mov.insumo?.codigo && (
                          <span className="text-[10px] text-zinc-400 font-mono">
                            [{mov.insumo.codigo}]
                          </span>
                        )}
                      </td>

                      {/* Tipo */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                            isSalida
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : isEntrada
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                        >
                          {isSalida && <ArrowUpRight className="w-3 h-3 text-amber-600" />}
                          {isEntrada && <ArrowDownLeft className="w-3 h-3 text-emerald-600" />}
                          {mov.tipo}
                        </span>
                      </td>

                      {/* Cantidad */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold">
                        <span
                          className={
                            isSalida
                              ? 'text-amber-700'
                              : isEntrada
                              ? 'text-emerald-700'
                              : 'text-zinc-800'
                          }
                        >
                          {isSalida ? '-' : isEntrada ? '+' : ''}
                          {cantidadNum} {unidad}
                        </span>
                        {mov.costoTotal !== null && mov.costoTotal !== undefined && Number(mov.costoTotal) > 0 && (
                          <div className="text-[10px] text-zinc-400 font-normal">
                            {formatCurrency(Number(mov.costoTotal))}
                          </div>
                        )}
                      </td>

                      {/* Stock Anter -> Nvo */}
                      <td className="py-3 px-4 text-center whitespace-nowrap font-mono text-[11px] text-zinc-500">
                        <span>{Number(mov.stockAnterior)}</span>
                        <span className="mx-1 text-zinc-300">→</span>
                        <span className="font-bold text-zinc-800">
                          {Number(mov.stockNuevo)}
                        </span>
                      </td>

                      {/* Motivo & Destino */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-zinc-800 truncate" title={mov.motivo}>
                          {mov.motivo}
                        </div>
                        {mov.destino && (
                          <div
                            className="flex items-center gap-1 text-[11px] text-zinc-500 truncate mt-0.5"
                            title={mov.destino}
                          >
                            <MapPin className="w-3 h-3 text-zinc-400 shrink-0" />
                            <span>{mov.destino}</span>
                          </div>
                        )}
                      </td>

                      {/* Referencia */}
                      <td className="py-3 px-4 whitespace-nowrap text-zinc-600">
                        {mov.referencia ? (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 font-mono text-zinc-700">
                            <FileText className="w-3 h-3 text-zinc-400" />
                            {mov.referencia}
                          </span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>

                      {/* Usuario */}
                      <td className="py-3 px-4 whitespace-nowrap text-zinc-500 text-[11px]">
                        {mov.usuario ? (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-zinc-400" />
                            <span>
                              {mov.usuario.nombre} {mov.usuario.apellido?.charAt(0)}.
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
