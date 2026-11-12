import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Search,
  Tag,
  Calendar,
  Layers,
  Edit2,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  TrendingDown,
} from 'lucide-react';
import type { Promocion, CreatePromocionPayload } from '../types/promotion.types';
import {
  getPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from '../services/promotions.api';
import { PromotionModal } from '../components/PromotionModal';

export const PromotionsPage: React.FC = () => {
  const [promotions, setPromotions] = useState<Promocion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterActivo, setFilterActivo] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<Promocion | null>(null);

  const fetchPromotions = async () => {
    setIsLoading(true);
    try {
      const data = await getPromotions();
      setPromotions(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar promociones');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleOpenCreate = () => {
    setSelectedPromo(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (promo: Promocion) => {
    setSelectedPromo(promo);
    setIsModalOpen(true);
  };

  const handleDuplicate = (promo: Promocion) => {
    // Clonar para crear una nueva promoción a partir de una existente
    const duplicateData: Promocion = {
      ...promo,
      id: '',
      codigo: `${promo.codigo}-COPIA`,
      nombre: `${promo.nombre} (Copia)`,
    };
    setSelectedPromo(duplicateData);
    setIsModalOpen(true);
  };

  const handleToggleActivo = async (promo: Promocion) => {
    try {
      await updatePromotion(promo.id, { activo: !promo.activo });
      await fetchPromotions();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'No se pudo cambiar el estado');
    }
  };

  const handleSave = async (payload: CreatePromocionPayload) => {
    if (selectedPromo && selectedPromo.id) {
      await updatePromotion(selectedPromo.id, payload);
    } else {
      await createPromotion(payload);
    }
    await fetchPromotions();
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar o desactivar la promoción "${nombre}"?`)) {
      return;
    }

    try {
      await deletePromotion(id);
      await fetchPromotions();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Error al eliminar promoción');
    }
  };

  // Filtrado
  const filteredPromotions = useMemo(() => {
    return promotions.filter((p) => {
      if (filterActivo === 'ACTIVE' && !p.activo) return false;
      if (filterActivo === 'INACTIVE' && p.activo) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchCode = p.codigo?.toLowerCase().includes(term);
        const matchName = p.nombre?.toLowerCase().includes(term);
        const matchDesc = p.descripcion?.toLowerCase().includes(term);
        const matchItem = p.items?.some((i) =>
          i.producto?.nombre?.toLowerCase().includes(term),
        );
        return matchCode || matchName || matchDesc || matchItem;
      }
      return true;
    });
  }, [promotions, filterActivo, searchTerm]);

  // Métricas
  const totalPromos = promotions.length;
  const promosActivas = promotions.filter((p) => p.activo).length;
  const totalMaquinasEnCombos = promotions.reduce(
    (sum, p) => sum + (p.items?.reduce((s, i) => s + (i.cantidad || 1), 0) || 0),
    0,
  );

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-6">
      {/* Header Corporativo */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-black text-[#1B1D22] tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Promociones y Combos de Maquinaria
            </h1>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Ofertas & Cotizaciones
            </span>
          </div>
          <p className="text-xs text-[#747780] mt-1">
            Configuración de paquetes de maquinaria con tarifas especiales para ofrecer directamente a clientes al cotizar.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-xs cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Promoción / Combo</span>
        </button>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E5E8EE] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#747780] uppercase tracking-wider">
              Total Promociones
            </span>
            <Tag className="w-4 h-4 text-slate-700" />
          </div>
          <div className="text-2xl font-black text-[#1B1D22] mt-2">{totalPromos}</div>
          <p className="text-[11px] text-[#747780] mt-0.5">Combos registrados en catálogo</p>
        </div>

        <div className="bg-white border border-[#E5E8EE] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">
              Combos Activos
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">{promosActivas}</div>
          <p className="text-[11px] text-[#747780] mt-0.5">Disponibles para cotizaciones</p>
        </div>

        <div className="bg-white border border-[#E5E8EE] rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#747780] uppercase tracking-wider">
              Máquinas en Paquetes
            </span>
            <Layers className="w-4 h-4 text-[#1A73E8]" />
          </div>
          <div className="text-2xl font-black text-[#1A73E8] mt-2">
            {totalMaquinasEnCombos}
          </div>
          <p className="text-[11px] text-[#747780] mt-0.5">Equipos asignados a combos</p>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white border border-[#E5E8EE] rounded-2xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center shadow-xs">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código, nombre o máquina..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-[#E5E8EE] rounded-xl text-xs text-[#1B1D22] placeholder:text-slate-400 focus:outline-none focus:border-slate-800 focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-[#747780] font-bold">Estado:</span>
          <div className="inline-flex rounded-xl border border-[#E5E8EE] p-0.5 bg-slate-100 text-xs">
            <button
              onClick={() => setFilterActivo('ACTIVE')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterActivo === 'ACTIVE'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-[#747780] hover:text-[#1B1D22]'
              }`}
            >
              Activas
            </button>
            <button
              onClick={() => setFilterActivo('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterActivo === 'ALL'
                  ? 'bg-white text-[#1B1D22] shadow-xs'
                  : 'text-[#747780] hover:text-[#1B1D22]'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterActivo('INACTIVE')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterActivo === 'INACTIVE'
                  ? 'bg-white text-slate-700 shadow-xs'
                  : 'text-[#747780] hover:text-[#1B1D22]'
              }`}
            >
              Inactivas
            </button>
          </div>
        </div>
      </div>

      {/* Alerta de Error */}
      {error && (
        <div className="flex items-center gap-2.5 p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabla de Promociones */}
      <div className="bg-white border border-[#E5E8EE] rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-[#747780]">
            Cargando promociones y combos de maquinaria...
          </div>
        ) : filteredPromotions.length === 0 ? (
          <div className="p-12 text-center">
            <Sparkles className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-[#1B1D22]">
              No se encontraron promociones
            </h3>
            <p className="text-xs text-[#747780] mt-1 max-w-sm mx-auto">
              {searchTerm
                ? 'No hay promociones que coincidan con el término buscado.'
                : 'Aún no has configurado combos de maquinaria. Crea el primero para ofrecer tarifas especiales al cotizar.'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleOpenCreate}
                type="button"
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Crear Primera Promoción
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] text-[10px] font-black uppercase text-[#747780] border-b border-[#E5E8EE]">
                  <th className="py-3 px-4">Código / Combo</th>
                  <th className="py-3 px-4">Máquinas Incluidas</th>
                  <th className="py-3 px-4 text-right">Tarifa Combo</th>
                  <th className="py-3 px-4">Vigencia / Condiciones</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EE] text-xs text-[#1B1D22] font-medium">
                {filteredPromotions.map((promo) => {
                  const hasItems = promo.items && promo.items.length > 0;
                  const precioComboNum = Number(promo.precioCombo) || 0;

                  // Cálculo de precio catálogo individual
                  const precioCatalogoIndividual = (promo.items || []).reduce((acc, it) => {
                    const tarifa = Number(it.precioUnitarioSugerido) || Number(it.producto?.precioRentaDia) || 0;
                    return acc + tarifa * (it.cantidad || 1);
                  }, 0);

                  const ahorro = Math.max(0, precioCatalogoIndividual - precioComboNum);
                  const porcentajeAhorro =
                    precioCatalogoIndividual > 0 && ahorro > 0
                      ? Math.round((ahorro / precioCatalogoIndividual) * 100)
                      : 0;

                  return (
                    <tr
                      key={promo.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !promo.activo ? 'bg-slate-50/50 opacity-70' : ''
                      }`}
                    >
                      {/* Código y Nombre */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-300">
                            {promo.codigo}
                          </span>
                        </div>
                        <div className="font-black text-sm text-[#1B1D22] mt-1">
                          {promo.nombre}
                        </div>
                        {promo.descripcion && (
                          <div className="text-[11px] text-[#747780] mt-0.5 line-clamp-1">
                            {promo.descripcion}
                          </div>
                        )}
                      </td>

                      {/* Equipos Incluidos */}
                      <td className="py-3.5 px-4 align-top">
                        {hasItems ? (
                          <div className="space-y-1">
                            {promo.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] text-[#1B1D22] mr-1.5 mb-1"
                              >
                                <span className="font-bold">
                                  {item.producto?.nombre || 'Equipo asignado'}
                                </span>
                                <span className="font-black text-emerald-800 bg-emerald-100 px-1 rounded text-[10px]">
                                  x{item.cantidad}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Sin máquinas asignadas
                          </span>
                        )}
                      </td>

                      {/* Tarifa y Ahorro */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="font-black text-base text-emerald-700">
                          ${precioComboNum.toFixed(2)}
                        </div>
                        <div className="text-[10px] text-[#747780] uppercase tracking-wider font-bold">
                          {promo.tipoCobro === 'POR_HORA' ? 'Por Hora' : 'Por Día'}
                        </div>
                        {ahorro > 0 && (
                          <div className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                            <TrendingDown className="w-3 h-3 text-emerald-600" />
                            Ahorro: ${ahorro.toFixed(2)} ({porcentajeAhorro}%)
                          </div>
                        )}
                      </td>

                      {/* Vigencia y Días Mínimos */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-center gap-1.5 text-xs text-[#1B1D22]">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {promo.fechaInicio
                              ? new Date(promo.fechaInicio).toLocaleDateString()
                              : 'Siempre'}{' '}
                            -{' '}
                            {promo.fechaFin
                              ? new Date(promo.fechaFin).toLocaleDateString()
                              : 'Indefinida'}
                          </span>
                        </div>
                        {promo.diasMinimos > 1 ? (
                          <div className="flex items-center gap-1 text-[11px] text-[#747780] mt-1 font-semibold">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Mínimo {promo.diasMinimos} días de renta
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-1">Sin mínimo de días</div>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 align-top text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleActivo(promo)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase transition-colors cursor-pointer ${
                            promo.activo
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                          }`}
                          title="Haz clic para activar o pausar la promoción"
                        >
                          {promo.activo ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Activa
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              Pausada
                            </>
                          )}
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDuplicate(promo)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Clonar o Duplicar este Combo"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(promo)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar Promoción"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(promo.id, promo.nombre)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar o Desactivar Promoción"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Modal Formulario de Alta y Edición */}
      <PromotionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        promotionToEdit={selectedPromo}
      />
    </div>
  );
};
