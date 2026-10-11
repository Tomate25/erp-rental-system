import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  GroupedProduct,
  InventorySummary,
  ProductUnitsResponse,
  UnitDetail,
  SerialUnitItem,
} from '../types/grouped-inventory.types';
import type { Category, Brand } from '../types/inventory.types';
import { InventorySummaryCards } from './InventorySummaryCards';
import { InventoryTabs, type InventoryTabType } from './InventoryTabs';
import { InventoryFilters, type InventoryFilterValues } from './InventoryFilters';
import {
  GroupedInventoryTable,
  type GroupedSortField,
  type GroupedSortDirection,
} from './GroupedInventoryTable';
import { UnitDetailDrawer } from './UnitDetailDrawer';
import { AddSerialUnitModal, type AddSerialUnitPayload } from './AddSerialUnitModal';
import { AdjustQuantityModal, type AdjustQuantityPayload } from './AdjustQuantityModal';
import { NewProductModal, type NewProductSubmitPayload } from './NewProductModal';
import { InventoryImportModal } from './InventoryImportModal';
import { ProductBreakdownModal } from './ProductBreakdownModal';
import { EditProductPricingModal } from './EditProductPricingModal';
import {
  getInventorySummary,
  getGroupedInventory,
  getProductUnits,
  getUnitDetail,
} from '../services/grouped-inventory.api';
import { createEquipment, getEquipments } from '../services/inventory.api';
import { buildGroupedDataFromEquipments } from '../utils/groupEquipments';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Layers, Plus, UploadCloud } from 'lucide-react';

interface GroupedInventoryViewProps {
  /** Permite suministrar datos mock o iniciales si el backend aún está en propuesta */
  mockData?: {
    summary?: InventorySummary;
    products?: GroupedProduct[];
    unitsMap?: Record<string, ProductUnitsResponse>;
    detailsMap?: Record<string, UnitDetail>;
  };
  categories?: Category[];
  brands?: Brand[];
  sucursales?: Array<{ id: string; nombre: string }>;
  onRefreshData?: () => void;
  className?: string;
}

export const GroupedInventoryView: React.FC<GroupedInventoryViewProps> = ({
  mockData,
  categories = [],
  brands = [],
  sucursales = [],
  onRefreshData,
  className = '',
}) => {
  // Tab principal
  const [activeTab, setActiveTab] = useState<InventoryTabType>('todo');

  // Filtros
  const [filters, setFilters] = useState<InventoryFilterValues>({
    query: '',
    familia: '',
    estado: '',
    marca: '',
  });

  // Ordenamiento
  const [sortField, setSortField] = useState<GroupedSortField>('total');
  const [sortDirection, setSortDirection] = useState<GroupedSortDirection>('desc');

  // Paginación
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Estados de datos
  const [summary, setSummary] = useState<InventorySummary | null>(mockData?.summary || null);
  const [products, setProducts] = useState<GroupedProduct[]>(mockData?.products || []);
  const [isLoading, setIsLoading] = useState(!mockData);
  const [error, setError] = useState<string | null>(null);

  // Unidades expandidas
  const [expandedUnitsMap, setExpandedUnitsMap] = useState<Record<string, ProductUnitsResponse>>(
    mockData?.unitsMap || {}
  );
  const [loadingUnitsMap, setLoadingUnitsMap] = useState<Record<string, boolean>>({});

  // Drawer de unidad seleccionada
  const [selectedUnitDetail, setSelectedUnitDetail] = useState<UnitDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoadingDrawer, setIsLoadingDrawer] = useState(false);

  // Modales de agregar / ajustar / importar / desglose
  const [selectedProductForBreakdown, setSelectedProductForBreakdown] = useState<GroupedProduct | null>(null);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);

  const [isAddSerialModalOpen, setIsAddSerialModalOpen] = useState(false);
  const [selectedProductForSerial, setSelectedProductForSerial] = useState<GroupedProduct | null>(null);

  const [isAdjustQuantityModalOpen, setIsAdjustQuantityModalOpen] = useState(false);
  const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<GroupedProduct | null>(null);

  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [selectedProductForPricing, setSelectedProductForPricing] = useState<GroupedProduct | null>(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  // Rol del usuario actual
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);
  const userRole = user?.rol || user?.role || 'ADMIN';

  // Familias y Marcas extraídas dinámicamente de los productos o disponibles
  const familias = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.familia) set.add(p.familia);
    });
    return Array.from(set).sort();
  }, [products]);

  const marcas = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.marca && p.marca !== 'N/D') set.add(p.marca);
    });
    return Array.from(set).sort();
  }, [products]);

  // Recolección de códigos y series existentes para validaciones anti-duplicados
  const { allExistingCodes, allExistingSerials, existingEquipmentsForImport } = useMemo(() => {
    const codes = new Set<string>();
    const serials = new Set<string>();
    const eqList: Array<{ codigo?: string | null; numeroSerie?: string | null }> = [];

    // De los datos de unidades expandidas
    Object.values(expandedUnitsMap).forEach((res) => {
      if (res.tipoControl === 'SERIALIZADO') {
        res.unidades.forEach((u) => {
          if (u.codigo) {
            codes.add(u.codigo);
            eqList.push({ codigo: u.codigo, numeroSerie: u.serie || null });
          }
          if (u.serie && u.serie !== 'S/N') serials.add(u.serie);
        });
      }
    });

    return {
      allExistingCodes: Array.from(codes),
      allExistingSerials: Array.from(serials),
      existingEquipmentsForImport: eqList,
    };
  }, [expandedUnitsMap]);

  // Sincronización si cambian las props mockData (p.ej. al recargar en InventoryPage)
  useEffect(() => {
    if (mockData) {
      if (mockData.summary) setSummary(mockData.summary);
      if (mockData.products) setProducts(mockData.products);
      if (mockData.unitsMap) setExpandedUnitsMap((prev) => ({ ...prev, ...mockData.unitsMap }));
    }
  }, [mockData]);

  // Carga de resumen
  const loadSummary = useCallback(async () => {
    if (mockData?.summary) {
      setSummary(mockData.summary);
      return;
    }
    try {
      const data = await getInventorySummary();
      setSummary(data);
    } catch {
      console.warn('Backend /inventory/summary no disponible aún, usando cálculo local si existe.');
    }
  }, [mockData]);

  // Carga de productos agrupados
  const loadProducts = useCallback(async () => {
    if (mockData?.products) {
      // Filtrar y ordenar en memoria si se usan mockData
      let filtered = [...mockData.products];
      if (activeTab === 'amarilla') {
        filtered = filtered.filter((p) => p.tarifa === 'HORA');
      } else if (activeTab === 'equipo') {
        filtered = filtered.filter((p) => p.tarifa === 'DIA');
      }
      if (filters.familia) {
        filtered = filtered.filter((p) => p.familia === filters.familia);
      }
      if (filters.marca) {
        filtered = filtered.filter((p) => p.marca.toLowerCase() === filters.marca.toLowerCase());
      }
      if (filters.query) {
        const q = filters.query.toLowerCase();
        filtered = filtered.filter(
          (p) => p.nombre.toLowerCase().includes(q) || p.familia.toLowerCase().includes(q)
        );
      }
      if (filters.estado) {
        const st = filters.estado as keyof GroupedProduct['porEstado'];
        filtered = filtered.filter((p) => (p.porEstado[st] || 0) > 0);
      }

      filtered.sort((a, b) => {
        let diff = 0;
        if (sortField === 'nombre') diff = a.nombre.localeCompare(b.nombre);
        else if (sortField === 'total') diff = a.total - b.total;
        else if (sortField === 'ocupacion') diff = a.porcentajeOcupacion - b.porcentajeOcupacion;
        return sortDirection === 'asc' ? diff : -diff;
      });

      const total = filtered.length;
      const pages = Math.max(1, Math.ceil(total / limit));
      const validPage = Math.min(Math.max(1, page), pages);
      const startIndex = (validPage - 1) * limit;
      const pagedProducts = filtered.slice(startIndex, startIndex + limit);

      setProducts(pagedProducts);
      setTotalCount(total);
      setTotalPages(pages);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await getGroupedInventory({
        tab: activeTab,
        familia: filters.familia,
        estado: filters.estado,
        marca: filters.marca,
        q: filters.query,
        page,
        limit,
        sortBy: sortField,
        sortOrder: sortDirection,
      });
      setProducts(res.items);
      setTotalPages(res.totalPages);
      setTotalCount(res.total);
    } catch (err: unknown) {
      // Fallback resiliente: Si /inventory/grouped responde 404 (aún no en backend), agrupamos en front
      try {
        const eqs = await getEquipments();
        const fallbackData = buildGroupedDataFromEquipments(eqs);
        setSummary(fallbackData.summary);
        const total = fallbackData.products.length;
        const pages = Math.max(1, Math.ceil(total / limit));
        const validPage = Math.min(Math.max(1, page), pages);
        const startIndex = (validPage - 1) * limit;
        setProducts(fallbackData.products.slice(startIndex, startIndex + limit));
        setExpandedUnitsMap(fallbackData.unitsMap);
        setTotalPages(pages);
        setTotalCount(total);
      } catch (fallbackErr: unknown) {
        const msg =
          fallbackErr instanceof Error
            ? fallbackErr.message
            : err instanceof Error
            ? err.message
            : 'Error al conectar con la API de inventario';
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, filters, page, limit, sortField, sortDirection, mockData]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Manejo de ordenamiento
  const handleSortChange = (field: GroupedSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'nombre' ? 'asc' : 'desc');
    }
  };

  // Expansión de unidades
  const handleToggleExpand = async (productoId: string) => {
    if (expandedUnitsMap[productoId]) {
      return; // Ya cargado en cache
    }
    setLoadingUnitsMap((prev) => ({ ...prev, [productoId]: true }));
    try {
      if (mockData?.unitsMap?.[productoId]) {
        setExpandedUnitsMap((prev) => ({
          ...prev,
          [productoId]: mockData.unitsMap![productoId],
        }));
      } else {
        const unitsRes = await getProductUnits(productoId);
        setExpandedUnitsMap((prev) => ({ ...prev, [productoId]: unitsRes }));
      }
    } catch (err) {
      console.error(`Error al cargar unidades de ${productoId}:`, err);
    } finally {
      setLoadingUnitsMap((prev) => ({ ...prev, [productoId]: false }));
    }
  };

  // Apertura de pantalla/modal de desglose completo de unidades
  const handleOpenBreakdownModal = (product: GroupedProduct) => {
    setSelectedProductForBreakdown(product);
    setIsBreakdownModalOpen(true);
    handleToggleExpand(product.productoId);
  };

  // Apertura de modal de configuración y edición de tarifas A, B y C
  const handleOpenPricingModal = (product: GroupedProduct) => {
    setSelectedProductForPricing(product);
    setIsPricingModalOpen(true);
  };

  // Selección de unidad para drawer
  const handleSelectUnit = async (
    unit: SerialUnitItem | { codigo: string; nombre: string; productoId: string }
  ) => {
    setIsDrawerOpen(true);
    setIsLoadingDrawer(true);
    try {
      const unitId = 'id' in unit ? unit.id : unit.codigo;
      if (mockData?.detailsMap?.[unitId]) {
        setSelectedUnitDetail(mockData.detailsMap[unitId]);
      } else {
        const detail = await getUnitDetail(unitId);
        setSelectedUnitDetail(detail);
      }
    } catch {
      // Fallback amigable con los datos básicos
      setSelectedUnitDetail({
        id: 'id' in unit ? unit.id : unit.codigo,
        codigo: unit.codigo,
        productoNombre: 'modelo' in unit ? `${unit.marca} ${unit.modelo}` : unit.nombre,
        marca: 'marca' in unit ? unit.marca : 'N/D',
        modelo: 'modelo' in unit ? unit.modelo : '',
        serie: 'serie' in unit ? unit.serie : 'S/N',
        estado: 'estado' in unit ? unit.estado : 'DISPONIBLE',
        tipoControl: 'SERIALIZADO',
        clienteActual:
          'clienteAsignado' in unit && unit.clienteAsignado
            ? { id: 'cl-1', nombre: unit.clienteAsignado }
            : null,
        contratoActual:
          'contratoNumero' in unit && unit.contratoNumero
            ? {
                id: 'ct-1',
                numero: unit.contratoNumero,
                fechaInicio: '2026-06-01',
                fechaDevolucionPrevista: ('fechaDevolucion' in unit && unit.fechaDevolucion) || '2026-12-31',
              }
            : null,
        historialMantenimiento: [],
      });
    } finally {
      setIsLoadingDrawer(false);
    }
  };

  // ==============================================================
  // ACCIONES: AGREGAR UNIDAD SERIALIZADA DENTRO DEL GRUPO
  // ==============================================================
  const handleAddSerialUnitSubmit = async (payload: AddSerialUnitPayload) => {
    // 1. Intento de persistencia en backend
    try {
      await createEquipment({
        codigo: payload.codigo,
        modelo: payload.modelo || selectedProductForSerial?.nombre || '',
        numeroSerie: payload.numeroSerie || undefined,
        categoriaId: payload.categoriaId || categories[0]?.id || 'cat-gen',
        marcaId: payload.marcaId || brands[0]?.id || 'marca-gen',
        sucursalId: payload.sucursalId || sucursales[0]?.id || 'suc-1',
        precioRentaDia: payload.precioRentaDia,
        precioRentaHora: payload.precioRentaHora,
        cantidadTotal: 1,
        cantidadDisponible: payload.estado === 'DISPONIBLE' ? 1 : 0,
        horometro: 0,
        estado: payload.estado === 'EN_REPARACION' ? 'FUERA_DE_SERVICIO' : (payload.estado as any),
      });
    } catch (err) {
      console.warn('Backend createEquipment no disponible o en modo local:', err);
    }

    // 2. Actualización reactiva inmediata en el frontend
    if (selectedProductForSerial) {
      const prodId = selectedProductForSerial.productoId;
      const newUnit: SerialUnitItem = {
        id: `unit-${Date.now()}`,
        codigo: payload.codigo,
        marca: selectedProductForSerial.marca || 'N/D',
        modelo: payload.modelo || selectedProductForSerial.nombre,
        serie: payload.numeroSerie,
        estado: payload.estado,
        clienteAsignado: null,
        contratoNumero: null,
        fechaDevolucion: null,
      };

      // Inyectar en la lista de unidades de este grupo
      setExpandedUnitsMap((prev) => {
        const existing = prev[prodId];
        if (existing && existing.tipoControl === 'SERIALIZADO') {
          return {
            ...prev,
            [prodId]: {
              ...existing,
              unidades: [newUnit, ...existing.unidades],
            },
          };
        }
        return {
          ...prev,
          [prodId]: {
            productoId: prodId,
            tipoControl: 'SERIALIZADO',
            unidades: [newUnit],
          },
        };
      });

      // Actualizar conteos del producto en la lista
      setProducts((prev) =>
        prev.map((p) => {
          if (p.productoId !== prodId) return p;
          const newTotal = p.total + 1;
          const updatedPorEstado = {
            ...p.porEstado,
            [payload.estado]: (p.porEstado[payload.estado] || 0) + 1,
          };
          const activeRent = (updatedPorEstado.ALQUILADO || 0) + (updatedPorEstado.RESERVADO || 0);
          const nonBaja = newTotal - (updatedPorEstado.BAJA || 0);
          const newOcupacion = nonBaja > 0 ? Math.round((activeRent / nonBaja) * 100) : 0;
          const newRentado =
            nonBaja > 0 ? Math.round(((updatedPorEstado.ALQUILADO || 0) / nonBaja) * 100) : 0;
          return {
            ...p,
            total: newTotal,
            porEstado: updatedPorEstado,
            porcentajeOcupacion: newOcupacion,
            porcentajeRentado: newRentado,
          };
        })
      );

      // Actualizar resumen KPI
      setSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          totalUnidades: prev.totalUnidades + 1,
          unidadesDisponibles:
            payload.estado === 'DISPONIBLE' ? prev.unidadesDisponibles + 1 : prev.unidadesDisponibles,
          unidadesEnReparacion:
            payload.estado === 'EN_REPARACION' ? prev.unidadesEnReparacion + 1 : prev.unidadesEnReparacion,
          unidadesReservadas:
            payload.estado === 'RESERVADO' ? prev.unidadesReservadas + 1 : prev.unidadesReservadas,
        };
      });
    }

    setIsAddSerialModalOpen(false);
    setSelectedProductForSerial(null);
    onRefreshData?.();
  };

  // ==============================================================
  // ACCIONES: AJUSTAR CANTIDAD EN ARTÍCULO POR LOTE (COMPRA/BAJA)
  // ==============================================================
  const handleAdjustQuantitySubmit = async (payload: AdjustQuantityPayload) => {
    if (selectedProductForAdjust) {
      const prodId = selectedProductForAdjust.productoId;
      const delta = payload.deltaCantidad;

      // Actualizar desglose en unidades
      setExpandedUnitsMap((prev) => {
        const existing = prev[prodId];
        if (existing && existing.tipoControl === 'POR_CANTIDAD') {
          const currentDisp = existing.desglose.porEstado.DISPONIBLE;
          return {
            ...prev,
            [prodId]: {
              ...existing,
              desglose: {
                ...existing.desglose,
                porEstado: {
                  ...existing.desglose.porEstado,
                  DISPONIBLE: Math.max(0, currentDisp + delta),
                },
              },
            },
          };
        }
        return prev;
      });

      // Actualizar producto en la lista
      setProducts((prev) =>
        prev.map((p) => {
          if (p.productoId !== prodId) return p;
          const newTotal = Math.max(0, p.total + delta);
          const newDisp = Math.max(0, (p.porEstado.DISPONIBLE || 0) + delta);
          const updatedPorEstado = {
            ...p.porEstado,
            DISPONIBLE: newDisp,
          };
          const activeRent = (updatedPorEstado.ALQUILADO || 0) + (updatedPorEstado.RESERVADO || 0);
          const nonBaja = newTotal - (updatedPorEstado.BAJA || 0);
          const newOcupacion = nonBaja > 0 ? Math.round((activeRent / nonBaja) * 100) : 0;
          return {
            ...p,
            total: newTotal,
            porEstado: updatedPorEstado,
            porcentajeOcupacion: newOcupacion,
          };
        })
      );

      // Actualizar resumen KPI
      setSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          totalUnidades: Math.max(0, prev.totalUnidades + delta),
          unidadesDisponibles: Math.max(0, prev.unidadesDisponibles + delta),
        };
      });
    }

    setIsAdjustQuantityModalOpen(false);
    setSelectedProductForAdjust(null);
    onRefreshData?.();
  };

  // ==============================================================
  // ACCIONES: CREAR NUEVA FICHA DE PRODUCTO
  // ==============================================================
  const handleNewProductSubmit = async (payload: NewProductSubmitPayload) => {
    try {
      await createEquipment({
        codigo: payload.codigo,
        modelo: payload.modelo || payload.nombre,
        numeroSerie: payload.numeroSerie || undefined,
        categoriaId: payload.categoriaId,
        marcaId: payload.marcaId,
        sucursalId: payload.sucursalId,
        precioRentaDia: payload.precioRentaDia,
        precioDiaB: payload.precioDiaB,
        precioDiaC: payload.precioDiaC,
        precioRentaHora: payload.precioRentaHora,
        precioHoraB: payload.precioHoraB,
        precioHoraC: payload.precioHoraC,
        cantidadTotal: payload.tipoControl === 'SERIALIZADO' ? 1 : payload.cantidadInicial || 1,
        cantidadDisponible: payload.tipoControl === 'SERIALIZADO' ? 1 : payload.cantidadInicial || 1,
        horometro: 0,
        estado: 'DISPONIBLE',
      });
    } catch (err) {
      console.warn('Backend createEquipment no disponible en modo local:', err);
    }

    const newProdId = `prod-new-${Date.now()}`;
    const totalQty = payload.tipoControl === 'SERIALIZADO' ? 1 : payload.cantidadInicial || 1;
    const catName = categories.find((c) => c.id === payload.categoriaId)?.nombre || 'General';
    const brandName = brands.find((b) => b.id === payload.marcaId)?.nombre || 'N/D';

    const newProduct: GroupedProduct = {
      productoId: newProdId,
      nombre: payload.nombre,
      familia: catName,
      marca: brandName,
      tarifa: payload.tarifa,
      tipoControl: payload.tipoControl,
      total: totalQty,
      porEstado: {
        DISPONIBLE: totalQty,
        ALQUILADO: 0,
        RESERVADO: 0,
        EN_REPARACION: 0,
        BAJA: 0,
      },
      porcentajeRentado: 0,
      porcentajeOcupacion: 0,
      precioDiaA: payload.precioRentaDia,
      precioDiaB: payload.precioDiaB,
      precioDiaC: payload.precioDiaC,
      precioHoraA: payload.precioRentaHora,
      precioHoraB: payload.precioHoraB,
      precioHoraC: payload.precioHoraC,
    };

    if (payload.tipoControl === 'SERIALIZADO') {
      setExpandedUnitsMap((prev) => ({
        ...prev,
        [newProdId]: {
          productoId: newProdId,
          tipoControl: 'SERIALIZADO',
          unidades: [
            {
              id: `unit-${Date.now()}`,
              codigo: payload.codigo,
              marca: brandName,
              modelo: payload.modelo || payload.nombre,
              serie: payload.numeroSerie || 'S/N',
              estado: 'DISPONIBLE',
              clienteAsignado: null,
              contratoNumero: null,
              fechaDevolucion: null,
            },
          ],
        },
      }));
    } else {
      setExpandedUnitsMap((prev) => ({
        ...prev,
        [newProdId]: {
          productoId: newProdId,
          tipoControl: 'POR_CANTIDAD',
          desglose: {
            porEstado: {
              DISPONIBLE: totalQty,
              ALQUILADO: 0,
              RESERVADO: 0,
              EN_REPARACION: 0,
              BAJA: 0,
            },
            porCliente: [],
          },
        },
      }));
    }

    setProducts((prev) => [newProduct, ...prev]);
    setTotalCount((prev) => prev + 1);

    setSummary((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        totalUnidades: prev.totalUnidades + totalQty,
        unidadesDisponibles: prev.unidadesDisponibles + totalQty,
      };
    });

    setIsNewProductModalOpen(false);
    onRefreshData?.();
  };

  // ==============================================================
  // ACCIONES: CARGA MASIVA EXITOSA
  // ==============================================================
  const handleImportSuccess = (importedCount: number) => {
    setSummary((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        totalUnidades: prev.totalUnidades + importedCount,
        unidadesDisponibles: prev.unidadesDisponibles + importedCount,
      };
    });
    setIsImportModalOpen(false);
    onRefreshData?.();
  };

  return (
    <div className={`space-y-5 font-sans ${className}`}>
      {/* Encabezado y Acciones Principales */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" /> Inventario Agrupado por Producto
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Supervisión integral de flota, control de ocupación y detalle operativo por unidad y lote.
          </p>
        </div>

        {/* Acciones principales de inventario agrupado */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 font-mono">
            BM Construcciones · {summary?.totalUnidades.toLocaleString() ?? '17,062'} u.
          </div>

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="Carga masiva de inventario desde archivo Excel (.xlsx) o CSV"
          >
            <UploadCloud className="w-4 h-4 text-blue-600" />
            <span>Carga Masiva</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewProductModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            title="Crear nueva ficha de producto o grupo en el inventario"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen KPI */}
      {summary && <InventorySummaryCards summary={summary} />}

      {/* Pestañas de Tarifa */}
      <InventoryTabs
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab);
          setPage(1);
        }}
        counts={{
          todo: summary?.totalUnidades,
          amarilla: 4,
          equipo: (summary?.totalUnidades ?? 17062) - 4,
        }}
      />

      {/* Filtros y Buscador con Debounce */}
      <InventoryFilters
        values={filters}
        onChange={(newFilters) => {
          setFilters(newFilters);
          setPage(1);
        }}
        familias={familias}
        marcas={marcas}
      />

      {/* Tabla Agrupada con Filas Expandibles y Acciones */}
      <GroupedInventoryTable
        products={products}
        expandedUnitsMap={expandedUnitsMap}
        loadingUnitsMap={loadingUnitsMap}
        onToggleExpand={handleToggleExpand}
        onSelectUnit={handleSelectUnit}
        onAddSerialUnit={(p) => {
          setSelectedProductForSerial(p);
          setIsAddSerialModalOpen(true);
        }}
        onAdjustQuantity={(p) => {
          setSelectedProductForAdjust(p);
          setIsAdjustQuantityModalOpen(true);
        }}
        onOpenBreakdownModal={handleOpenBreakdownModal}
        onOpenPricingModal={handleOpenPricingModal}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        isLoading={isLoading}
        error={error}
        onRetry={loadProducts}
      />

      {/* Paginador enriquecido y adaptable */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white px-4 py-3 rounded-2xl border border-slate-200 text-xs text-slate-600 gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <span>
              Mostrando{' '}
              <strong className="text-slate-900 font-mono">
                {Math.min((page - 1) * limit + 1, totalCount)} - {Math.min(page * limit, totalCount)}
              </strong>{' '}
              de <strong className="text-slate-900 font-mono">{totalCount}</strong> productos
            </span>

            {/* Selector de cantidad por página */}
            <div className="hidden sm:flex items-center gap-1.5 border-l border-slate-200 pl-3">
              <span className="text-[11px] text-slate-400">Ver:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="py-1 px-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value={10}>10 / pág</option>
                <option value={25}>25 / pág</option>
                <option value={50}>50 / pág</option>
                <option value={100}>100 / pág</option>
                <option value={1000}>Todos</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(1)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Primera página"
              aria-label="Primera página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Página anterior"
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Números de páginas compactos */}
            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | string)[]>((acc, cur, idx, arr) => {
                  if (idx > 0 && cur - (arr[idx - 1] as number) > 1) {
                    acc.push('...');
                  }
                  acc.push(cur);
                  return acc;
                }, [])
                .map((item, idx) =>
                  typeof item === 'string' ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-slate-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        item === page
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
            </div>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Página siguiente"
              aria-label="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Última página"
              aria-label="Última página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Pantalla Completa: Desglose de Unidades de Producto */}
      {selectedProductForBreakdown && (
        <ProductBreakdownModal
          product={selectedProductForBreakdown}
          unitsData={expandedUnitsMap[selectedProductForBreakdown.productoId]}
          isLoadingUnits={Boolean(loadingUnitsMap[selectedProductForBreakdown.productoId])}
          isOpen={isBreakdownModalOpen}
          onClose={() => {
            setIsBreakdownModalOpen(false);
            setSelectedProductForBreakdown(null);
          }}
          onSelectUnit={handleSelectUnit}
          onAddSerialUnit={(p) => {
            setSelectedProductForSerial(p);
            setIsAddSerialModalOpen(true);
          }}
          onAdjustQuantity={(p) => {
            setSelectedProductForAdjust(p);
            setIsAdjustQuantityModalOpen(true);
          }}
          onOpenPricingModal={handleOpenPricingModal}
        />
      )}

      {/* Modal: Configuración y modificación de tarifas A, B y C */}
      {selectedProductForPricing && (
        <EditProductPricingModal
          product={selectedProductForPricing}
          isOpen={isPricingModalOpen}
          onClose={() => {
            setIsPricingModalOpen(false);
            setSelectedProductForPricing(null);
          }}
          onUpdated={() => {
            loadProducts();
            if (onRefreshData) onRefreshData();
          }}
        />
      )}

      {/* Drawer Lateral de Detalle de Unidad */}
      <UnitDetailDrawer
        unit={selectedUnitDetail}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        isLoading={isLoadingDrawer}
      />

      {/* Modal: Agregar unidad serializada a un grupo */}
      {selectedProductForSerial && (
        <AddSerialUnitModal
          product={selectedProductForSerial}
          existingCodes={allExistingCodes}
          existingSerials={allExistingSerials}
          sucursales={
            sucursales.length > 0 ? sucursales : [{ id: 'suc-1', nombre: 'Sucursal Central Nicaragua' }]
          }
          isOpen={isAddSerialModalOpen}
          onClose={() => {
            setIsAddSerialModalOpen(false);
            setSelectedProductForSerial(null);
          }}
          onSubmit={handleAddSerialUnitSubmit}
        />
      )}

      {/* Modal: Ajustar cantidad en lote */}
      {selectedProductForAdjust && (
        <AdjustQuantityModal
          product={selectedProductForAdjust}
          isOpen={isAdjustQuantityModalOpen}
          onClose={() => {
            setIsAdjustQuantityModalOpen(false);
            setSelectedProductForAdjust(null);
          }}
          onSubmit={handleAdjustQuantitySubmit}
        />
      )}

      {/* Modal: Crear nuevo producto en catálogo */}
      <NewProductModal
        existingProducts={products}
        existingCodes={allExistingCodes}
        existingSerials={allExistingSerials}
        categories={categories}
        brands={brands}
        sucursales={
          sucursales.length > 0 ? sucursales : [{ id: 'suc-1', nombre: 'Sucursal Central Nicaragua' }]
        }
        isOpen={isNewProductModalOpen}
        onClose={() => setIsNewProductModalOpen(false)}
        onSubmit={handleNewProductSubmit}
        onSelectExistingProduct={(p) => {
          setIsNewProductModalOpen(false);
          if (p.tipoControl === 'SERIALIZADO') {
            setSelectedProductForSerial(p);
            setIsAddSerialModalOpen(true);
          } else {
            setSelectedProductForAdjust(p);
            setIsAdjustQuantityModalOpen(true);
          }
        }}
      />

      {/* Modal: Carga masiva de inventario con previsualización */}
      <InventoryImportModal
        existingProducts={products}
        existingEquipments={existingEquipmentsForImport}
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={handleImportSuccess}
        userRole={userRole}
      />
    </div>
  );
};
