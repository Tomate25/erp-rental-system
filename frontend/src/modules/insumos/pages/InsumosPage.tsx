import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  ArrowUpDown,
  Edit2,
  Trash2,
  CheckCircle2,
  Coins,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownLeft,
  History,
} from 'lucide-react';
import type { Insumo, TipoMovimientoInsumo } from '../types/insumo.types';
import { getInsumos, deleteInsumo, getCategoriasInsumos } from '../services/insumo.api';
import { InsumoModal } from '../components/InsumoModal';
import { AjustarStockModal } from '../components/AjustarStockModal';
import { RegistrarMovimientoModal } from '../components/RegistrarMovimientoModal';
import { KardexMovimientosTable } from '../components/KardexMovimientosTable';
import { CrearCategoriaModal } from '../components/CrearCategoriaModal';
import { formatCurrency } from '../../../shared/utils/formatters';

export const InsumosPage: React.FC = () => {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('ALL');
  const [soloBajoStock, setSoloBajoStock] = useState(false);

  const [activeTab, setActiveTab] = useState<'catalogo' | 'kardex'>('catalogo');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState<Insumo | null>(null);

  const [isCrearCategoriaOpen, setIsCrearCategoriaOpen] = useState(false);
  const [isAjustarOpen, setIsAjustarOpen] = useState(false);
  const [insumoParaAjuste, setInsumoParaAjuste] = useState<Insumo | null>(null);

  const [isMovimientoOpen, setIsMovimientoOpen] = useState(false);
  const [movimientoTipo, setMovimientoTipo] = useState<TipoMovimientoInsumo>('SALIDA');
  const [insumoParaMovimiento, setInsumoParaMovimiento] = useState<Insumo | null>(null);
  const [kardexRefreshKey, setKardexRefreshKey] = useState(0);

  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: 'success' | 'info';
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInsumos({
        categoria: categoriaFilter !== 'ALL' ? categoriaFilter : undefined,
        search: searchTerm.trim() || undefined,
        bajoStock: soloBajoStock ? true : undefined,
      });
      setInsumos(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar los insumos de bodega.');
    } finally {
      setLoading(false);
    }
  }, [categoriaFilter, searchTerm, soloBajoStock]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    void getCategoriasInsumos()
      .then(setCategoriesList)
      .catch(() => setCategoriesList([]));
  }, [kardexRefreshKey]);

  const distinctCategories = useMemo(() => {
    const set = new Set<string>();
    categoriesList.forEach((c) => set.add(c.toUpperCase()));
    insumos.forEach((i) => {
      if (i.categoria) set.add(i.categoria.toUpperCase());
    });
    return Array.from(set);
  }, [categoriesList, insumos]);

  const stats = useMemo(() => {
    const totalItems = insumos.length;
    let bajoStockCount = 0;
    let totalValorizado = 0;

    for (const item of insumos) {
      const actual = Number(item.stockActual);
      const minimo = Number(item.stockMinimo);
      const costo = Number(item.costoUnitario);

      if (actual <= minimo && minimo > 0) {
        bajoStockCount++;
      }
      totalValorizado += actual * costo;
    }

    return {
      totalItems,
      bajoStockCount,
      totalValorizado: Math.round(totalValorizado * 100) / 100,
    };
  }, [insumos]);

  const handleEdit = (insumo: Insumo) => {
    setSelectedInsumo(insumo);
    setIsModalOpen(true);
  };

  const handleOpenAjuste = (insumo: Insumo) => {
    setInsumoParaAjuste(insumo);
    setIsAjustarOpen(true);
  };

  const handleOpenSalidaManual = (insumo?: Insumo) => {
    setMovimientoTipo('SALIDA');
    setInsumoParaMovimiento(insumo || null);
    setIsMovimientoOpen(true);
  };

  const handleOpenEntradaManual = (insumo?: Insumo) => {
    setMovimientoTipo('ENTRADA');
    setInsumoParaMovimiento(insumo || null);
    setIsMovimientoOpen(true);
  };

  const handleMovimientoSuccess = () => {
    void loadData();
    setKardexRefreshKey((prev) => prev + 1);
    setFeedbackMessage({
      text: `Movimiento de ${movimientoTipo === 'SALIDA' ? 'salida de bodega' : 'entrada / compra'} registrado con éxito.`,
      type: 'success',
    });
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleDelete = async (insumo: Insumo) => {
    const confirmed = window.confirm(
      `¿Deseas dar de baja o eliminar el insumo "${insumo.nombre}"?`,
    );
    if (!confirmed) return;

    try {
      const res = await deleteInsumo(insumo.id);
      setFeedbackMessage({
        text: res.message || 'Acción completada con éxito.',
        type: 'success',
      });
      await loadData();
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'No se pudo eliminar el insumo.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6">
      {/* Header Principal */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-zinc-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-zinc-900">Bodega de Insumos & Taller</h1>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200">
              Gestión de Existencias
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Inventario de lubricantes, repuestos y consumibles, recepción de compras y despacho de salidas de almacén.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedInsumo(null);
            setIsModalOpen(true);
          }}
          type="button"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all shadow-sm cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>+ Registrar Nuevo Insumo</span>
        </button>
      </header>

      {/* Barra Operativa y Navegación de Vistas */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white p-3 rounded-2xl border border-zinc-200 shadow-xs">
        {/* Pestañas de Navegación */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('catalogo')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              activeTab === 'catalogo'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 border border-transparent'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Catálogo de Insumos</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'catalogo'
                  ? 'bg-zinc-700 text-zinc-200'
                  : 'bg-white text-zinc-600 border border-zinc-200'
              }`}
            >
              {stats.totalItems}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('kardex')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              activeTab === 'kardex'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/70 border border-transparent'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Kardex / Historial de Movimientos</span>
          </button>
        </div>

        {/* Acciones Rápidas de Bodega */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenSalidaManual()}
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>📤 Registrar Salida Manual</span>
          </button>

          <button
            onClick={() => handleOpenEntradaManual()}
            type="button"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>📥 Registrar Entrada / Compra</span>
          </button>
        </div>
      </div>

      {activeTab === 'catalogo' ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-[#E5E8EE] rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#747780]">Insumos Registrados</span>
            <p className="text-2xl font-black text-[#1B1D22]">{stats.totalItems}</p>
          </div>
          <div className="p-3 bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-xl">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white border border-[#E5E8EE] rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#747780]">Stock Bajo / Crítico</span>
            <p className={`text-2xl font-black ${stats.bajoStockCount > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
              {stats.bajoStockCount}
            </p>
          </div>
          <div
            className={`p-3 rounded-xl border ${
              stats.bajoStockCount > 0
                ? 'bg-amber-50 border-amber-200 text-amber-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {stats.bajoStockCount > 0 ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
        </div>

        <div className="p-4 bg-white border border-[#E5E8EE] rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#747780]">Valor en Bodega</span>
            <p className="text-2xl font-black text-[#1B1D22]">
              {formatCurrency(stats.totalValorizado)}
            </p>
          </div>
          <div className="p-3 bg-zinc-50 border border-zinc-200 text-zinc-800 rounded-xl">
            <Coins className="w-5 h-5" />
          </div>
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadData} className="underline font-bold cursor-pointer">
            Reintentar
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, código de insumo o especificación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-[#E5E8EE] rounded-xl focus:ring-2 focus:ring-zinc-900 focus:outline-hidden"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 bg-white border border-[#E5E8EE] px-3 py-2 rounded-xl cursor-pointer hover:bg-zinc-50 select-none whitespace-nowrap">
            <input
              type="checkbox"
              checked={soloBajoStock}
              onChange={(e) => setSoloBajoStock(e.target.checked)}
              className="rounded-sm border-zinc-300 text-zinc-900 focus:ring-zinc-900"
            />
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              Solo con stock bajo
            </span>
          </label>
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setCategoriaFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
              categoriaFilter === 'ALL'
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-white text-zinc-600 border border-[#E5E8EE] hover:bg-zinc-50'
            }`}
          >
            Todos los insumos
          </button>
          {distinctCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaFilter(cat)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                categoriaFilter.toUpperCase() === cat.toUpperCase()
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-white text-zinc-600 border border-[#E5E8EE] hover:bg-zinc-50'
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsCrearCategoriaOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Agregar Categoría</span>
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-[#E5E8EE] rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-zinc-500">
            Cargando catálogo de insumos y consumibles...
          </div>
        ) : insumos.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Package className="w-8 h-8 text-zinc-400 mx-auto" />
            <p className="text-sm font-bold text-zinc-800">No se encontraron insumos</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {searchTerm || soloBajoStock || categoriaFilter !== 'ALL'
                ? 'No hay registros que coincidan con los filtros seleccionados.'
                : 'Aún no has registrado insumos en la bodega. Haz clic en "Nuevo Insumo" para comenzar.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50/70 border-b border-[#E5E8EE] text-zinc-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Insumo</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3 text-right">Existencia Actual</th>
                  <th className="px-4 py-3 text-right">Costo Compra</th>
                  <th className="px-4 py-3">Tratamiento Fiscal</th>
                  <th className="px-4 py-3">Proveedor Habitual</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EE]">
                {insumos.map((item) => {
                  const actual = Number(item.stockActual);
                  const minimo = Number(item.stockMinimo);
                  const isLow = actual <= minimo && minimo > 0;
                  const isZero = actual <= 0;

                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-zinc-900">{item.nombre}</div>
                        <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                          {item.codigo && (
                            <span className="font-mono bg-zinc-100 px-1 rounded text-zinc-700">
                              {item.codigo}
                            </span>
                          )}
                          <span>Unidad: {item.unidadMedida}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-md bg-zinc-100 text-zinc-700 border border-zinc-200">
                          {item.categoria}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="font-mono font-extrabold text-sm text-zinc-900">
                          {actual} <span className="text-[11px] font-normal text-zinc-500">{item.unidadMedida}</span>
                        </div>
                        {isZero ? (
                          <span className="text-[10px] font-extrabold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.2 rounded">
                            Agotado
                          </span>
                        ) : isLow ? (
                          <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                            Bajo mínimo ({minimo})
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            Óptimo (Mín: {minimo})
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-mono">
                        <div className="font-bold text-zinc-900">
                          {formatCurrency(Number(item.costoUnitario))}
                        </div>
                        {item.precioVenta && (
                          <div className="text-[10px] text-zinc-500">
                            Venta: {formatCurrency(Number(item.precioVenta))}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          <span
                            className={`inline-block px-1.5 py-0.2 text-[10px] font-semibold rounded ${
                              item.costoIncluyeIva
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                            }`}
                          >
                            {item.costoIncluyeIva ? 'Costo con IVA' : 'Costo Neto'}
                          </span>
                          <div>
                            <span
                              className={`text-[10px] font-medium ${
                                item.aplicaIva ? 'text-zinc-600' : 'text-amber-700 font-bold'
                              }`}
                            >
                              {item.aplicaIva ? '• Facturación: +IVA' : '• Facturación: EXENTO'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {item.proveedor ? (
                          <div className="font-semibold text-zinc-800">
                            {item.proveedor.nombre}
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">No especificado</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenSalidaManual(item)}
                            title="Despachar salida manual de este insumo"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5 text-amber-700" />
                            <span>Salida</span>
                          </button>
                          <button
                            onClick={() => handleOpenAjuste(item)}
                            title="Ajuste de inventario / conteo físico"
                            className="p-1.5 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg border border-zinc-200 transition-colors cursor-pointer"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEdit(item)}
                            title="Editar insumo (pantalla completa)"
                            className="p-1.5 text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 rounded-lg border border-zinc-200 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            title="Dar de baja / eliminar"
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg border border-red-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      ) : (
        <KardexMovimientosTable
          insumos={insumos}
          refreshTrigger={kardexRefreshKey}
        />
      )}

      <InsumoModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedInsumo(null);
        }}
        onSuccess={loadData}
        insumoToEdit={selectedInsumo}
      />

      <RegistrarMovimientoModal
        isOpen={isMovimientoOpen}
        onClose={() => {
          setIsMovimientoOpen(false);
          setInsumoParaMovimiento(null);
        }}
        onSuccess={handleMovimientoSuccess}
        insumos={insumos}
        initialInsumo={insumoParaMovimiento}
        initialTipo={movimientoTipo}
      />

      {insumoParaAjuste && (
        <AjustarStockModal
          isOpen={isAjustarOpen}
          onClose={() => {
            setIsAjustarOpen(false);
            setInsumoParaAjuste(null);
          }}
          onSuccess={loadData}
          insumo={insumoParaAjuste}
        />
      )}

      <CrearCategoriaModal
        isOpen={isCrearCategoriaOpen}
        onClose={() => setIsCrearCategoriaOpen(false)}
        onSuccess={(nuevaCat) => {
          setCategoriesList((prev) => Array.from(new Set([nuevaCat.nombre, ...prev])));
          setCategoriaFilter(nuevaCat.nombre);
          setFeedbackMessage({
            text: `Categoría "${nuevaCat.nombre}" creada con éxito.`,
            type: 'success',
          });
          setTimeout(() => setFeedbackMessage(null), 4000);
        }}
      />
    </div>
  );
};
