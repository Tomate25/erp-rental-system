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

  const handleSave = async (payload: CreatePromocionPayload) => {
    if (selectedPromo) {
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Promociones y Combos de Maquinaria
            </h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Configura paquetes de equipos con tarifas especiales para ofrecer a clientes en cotizaciones.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          Nueva Promoción / Combo
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-surface-base border border-border-default shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Total Promociones
            </span>
            <Tag className="w-4 h-4 text-accent" />
          </div>
          <div className="text-2xl font-bold text-text-primary mt-2">{totalPromos}</div>
          <p className="text-[11px] text-text-tertiary mt-1">Registradas en el catálogo</p>
        </div>

        <div className="p-4 rounded-xl bg-surface-base border border-border-default shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Combos Activos
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">{promosActivas}</div>
          <p className="text-[11px] text-text-tertiary mt-1">Disponibles para cotizar</p>
        </div>

        <div className="p-4 rounded-xl bg-surface-base border border-border-default shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Máquinas en Paquetes
            </span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400 mt-2">
            {totalMaquinasEnCombos}
          </div>
          <p className="text-[11px] text-text-tertiary mt-1">Equipos vinculados en combos</p>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-surface-base border border-border-default">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Buscar por código, combo o máquina..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface-elevated border border-border-default rounded-lg text-text-primary focus:outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-text-secondary font-medium">Estado:</span>
          <div className="inline-flex rounded-lg border border-border-default p-0.5 bg-surface-elevated text-xs">
            <button
              onClick={() => setFilterActivo('ACTIVE')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filterActivo === 'ACTIVE'
                  ? 'bg-surface-subtle text-emerald-400 font-bold shadow-sm'
                  : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              Activas
            </button>
            <button
              onClick={() => setFilterActivo('ALL')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filterActivo === 'ALL'
                  ? 'bg-surface-subtle text-text-primary font-bold shadow-sm'
                  : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterActivo('INACTIVE')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                filterActivo === 'INACTIVE'
                  ? 'bg-surface-subtle text-text-secondary font-bold shadow-sm'
                  : 'text-text-tertiary hover:text-text-primary'
              }`}
            >
              Inactivas
            </button>
          </div>
        </div>
      </div>

      {/* Listado de Promociones */}
      {error && (
        <div className="flex items-center gap-2 p-4 text-sm text-red-400 bg-red-950/40 border border-red-800/60 rounded-xl">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-xs text-text-tertiary">
          Cargando catálogo de promociones y combos...
        </div>
      ) : filteredPromotions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-border-default bg-surface-base">
          <Sparkles className="w-10 h-10 mx-auto text-text-tertiary mb-3 opacity-40" />
          <h3 className="text-sm font-bold text-text-primary">
            No se encontraron promociones
          </h3>
          <p className="text-xs text-text-tertiary mt-1 max-w-sm mx-auto">
            {searchTerm
              ? 'No hay promociones que coincidan con la búsqueda.'
              : 'Aún no has configurado combos o promociones. Crea la primera para ofrecer tarifas especiales en cotizaciones.'}
          </p>
          {!searchTerm && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              Crear Promoción
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPromotions.map((promo) => {
            const hasItems = promo.items && promo.items.length > 0;
            const precioComboNum = Number(promo.precioCombo) || 0;

            return (
              <div
                key={promo.id}
                className={`flex flex-col justify-between p-5 rounded-xl border transition-all ${
                  promo.activo
                    ? 'bg-surface-base border-border-default hover:border-emerald-500/40 shadow-sm'
                    : 'bg-surface-subtle/50 border-border-default/50 opacity-70'
                }`}
              >
                <div>
                  {/* Top Bar: Code & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-surface-elevated text-emerald-400 border border-emerald-500/20">
                      <Tag className="w-3 h-3" />
                      {promo.codigo}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        promo.activo
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {promo.activo ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Activa
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          Inactiva
                        </>
                      )}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-text-primary leading-tight">
                    {promo.nombre}
                  </h3>
                  {promo.descripcion && (
                    <p className="text-xs text-text-secondary mt-1.5 line-clamp-2">
                      {promo.descripcion}
                    </p>
                  )}

                  {/* Machine Items List */}
                  <div className="mt-4 pt-3 border-t border-border-default space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary flex items-center gap-1.5">
                      <Layers className="w-3 h-3" />
                      Máquinas incluidas ({promo.items?.length || 0}):
                    </div>

                    {hasItems ? (
                      <div className="space-y-1.5">
                        {promo.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs px-2.5 py-1 rounded-md bg-surface-elevated border border-border-default"
                          >
                            <span className="text-text-primary font-medium truncate max-w-[180px]">
                              {item.producto?.nombre || 'Equipo del combo'}
                            </span>
                            <span className="text-[11px] font-bold text-accent px-1.5 py-0.5 rounded bg-accent/10">
                              x{item.cantidad}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-text-tertiary italic">
                        Sin máquinas específicas asignadas.
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Footer: Price, Validity & Actions */}
                <div className="mt-5 pt-3 border-t border-border-default space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-text-tertiary uppercase tracking-wider">
                        Tarifa Combo ({promo.tipoCobro === 'POR_HORA' ? 'Hora' : 'Día'})
                      </span>
                      <div className="text-xl font-extrabold text-emerald-400">
                        ${precioComboNum.toFixed(2)}
                      </div>
                    </div>

                    {promo.diasMinimos > 1 && (
                      <span className="text-[11px] text-text-secondary flex items-center gap-1">
                        <Clock className="w-3 h-3 text-text-tertiary" />
                        Min. {promo.diasMinimos} días
                      </span>
                    )}
                  </div>

                  {(promo.fechaInicio || promo.fechaFin) && (
                    <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                      <Calendar className="w-3 h-3" />
                      <span>
                        Vigencia:{' '}
                        {promo.fechaInicio
                          ? new Date(promo.fechaInicio).toLocaleDateString()
                          : 'Siempre'}{' '}
                        -{' '}
                        {promo.fechaFin
                          ? new Date(promo.fechaFin).toLocaleDateString()
                          : 'Indefinida'}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      onClick={() => handleOpenEdit(promo)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-surface-elevated hover:bg-surface-subtle text-text-secondary hover:text-text-primary transition-colors border border-border-default"
                    >
                      <Edit2 className="w-3 h-3" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(promo.id, promo.nombre)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-surface-elevated hover:bg-red-950/40 text-text-secondary hover:text-red-400 transition-colors border border-border-default"
                    >
                      <Trash2 className="w-3 h-3" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Promotion Modal Form */}
      <PromotionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        promotionToEdit={selectedPromo}
      />
    </div>
  );
};
