import { Spinner } from '../../../shared/components/Spinner';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  Shield,
  Clock,
  Globe,
  Eye,
  X,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Info,
  Server,
  FileCode,
  Lock,
  Database,
  Cpu
} from 'lucide-react';
import {
  getAuditoria,
  getAuditoriaUsers,
  type UserSummary
} from '../services/auditoria.api';
import type { AuditoriaRecord, AuditoriaQueryParams, HttpTraceDetails } from '../types/auditoria.types';

// Módulos canónicos del ERP
const MODULOS_OPTIONS = [
  { value: '', label: 'Todos los Módulos' },
  { value: 'CONTRACTS', label: 'Contratos' },
  { value: 'QUOTATIONS', label: 'Cotizaciones' },
  { value: 'OPERATIONS', label: 'Operaciones (Despacho / Retorno)' },
  { value: 'BILLING', label: 'Facturación y Caja' },
  { value: 'INVENTORY', label: 'Inventario y Maquinaria' },
  { value: 'CLIENTS', label: 'Clientes' },
  { value: 'SECURITY', label: 'Seguridad y Roles' },
  { value: 'MAINTENANCE', label: 'Taller y Mantenimiento' },
  { value: 'ACCOUNTING', label: 'Contabilidad & Finanzas' },
  { value: 'COMMISSIONS', label: 'Comisiones de Ventas' },
  { value: 'AVAILABILITY', label: 'Disponibilidad' },
  { value: 'HOROMETROS', label: 'Horómetros' },
  { value: 'AUDITORIA', label: 'Bitácora' },
  { value: 'AUTH', label: 'Autenticación' },
];

export const AuditLogPage: React.FC = () => {
  // Lista de auditoría y paginación
  const [records, setRecords] = useState<AuditoriaRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(20);

  // Estados de carga y error
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Catálogo de usuarios para filtro
  const [users, setUsers] = useState<UserSummary[]>([]);

  // Filtros aplicados
  const [filterModule, setFilterModule] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterEventType, setFilterEventType] = useState<'ALL' | 'BUSINESS' | 'HTTP'>('ALL');

  // Registro seleccionado para ver detalle en modal
  const [selectedRecord, setSelectedRecord] = useState<AuditoriaRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Cargar lista de usuarios para el filtro una sola vez
  useEffect(() => {
    getAuditoriaUsers().then(setUsers);
  }, []);

  // Cargar auditoría con los filtros actuales
  const fetchAuditData = useCallback(async (pageToLoad: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const params: AuditoriaQueryParams = {
        page: pageToLoad,
        limit,
      };

      if (filterModule) {
        params.modulo = filterModule;
      }
      if (filterEventType !== 'ALL') params.tipoEvento = filterEventType === 'BUSINESS' ? 'NEGOCIO' : 'HTTP';
      if (filterUser) params.usuarioId = filterUser;
      if (filterAction.trim()) params.accion = filterAction.trim();
      if (filterDateStart) params.fechaInicio = new Date(`${filterDateStart}T00:00:00`).toISOString();
      if (filterDateEnd) params.fechaFin = new Date(`${filterDateEnd}T23:59:59.999`).toISOString();

      const response = await getAuditoria(params);
      setRecords(response.data || []);
      setTotalRecords(response.total || 0);
      setCurrentPage(response.page || 1);
      setTotalPages(response.totalPages || 1);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al consultar la bitácora de auditoría. Verifique sus permisos de Administrador.');
    } finally {
      setIsLoading(false);
    }
  }, [limit, filterModule, filterUser, filterAction, filterDateStart, filterDateEnd, filterEventType]);

  // Carga inicial y cuando cambia el límite o tipo de evento
  useEffect(() => {
    fetchAuditData(1);
  }, [fetchAuditData]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAuditData(1);
  };

  const handleClearFilters = () => {
    setFilterModule('');
    setFilterUser('');
    setFilterAction('');
    setFilterDateStart('');
    setFilterDateEnd('');
    setFilterEventType('ALL');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatManaguaDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      return new Intl.DateTimeFormat('es-NI', {
        timeZone: 'America/Managua',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(new Date(isoString));
    } catch {
      return isoString;
    }
  };

  const isHttpTrace = (rec: AuditoriaRecord) => rec.accion.startsWith('HTTP_');

  const parseTraceDetails = (detalles: any): HttpTraceDetails => {
    if (!detalles) return {};
    if (typeof detalles === 'object') return detalles;
    try {
      return JSON.parse(detalles);
    } catch {
      return {};
    }
  };

  const getHttpMethodBadge = (method?: string) => {
    const m = (method || '').toUpperCase();
    if (m === 'GET') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (m === 'POST') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (m === 'PUT' || m === 'PATCH') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (m === 'DELETE') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getHttpStatusBadge = (code?: number) => {
    if (!code) return 'bg-slate-50 text-slate-700 border-slate-200';
    if (code >= 200 && code < 300) return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
    if (code >= 400 && code < 500) return 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
    if (code >= 500) return 'bg-red-50 text-red-700 border-red-200 font-bold';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getEntityBadgeStyle = (tipo: string) => {
    const t = tipo.toUpperCase();
    if (t.includes('CONTRATO') || t === 'CONTRACTS') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (t.includes('COTIZACION') || t === 'QUOTATIONS') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (t.includes('DESPACHO') || t.includes('DEVOLUCION') || t === 'OPERATIONS') return 'bg-orange-50 text-orange-700 border-orange-200';
    if (t.includes('FACTURA') || t.includes('PAGO') || t.includes('CORTE') || t === 'BILLING') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (t.includes('USUARIO') || t.includes('ROL') || t === 'SECURITY') return 'bg-purple-50 text-purple-700 border-purple-200';
    if (t.includes('EQUIPO') || t === 'INVENTORY') return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    if (t.includes('MANTENIMIENTO') || t === 'MAINTENANCE') return 'bg-slate-100 text-slate-700 border-slate-300';
    if (t.includes('CLIENTE') || t === 'CLIENTS') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getActionBadgeStyle = (accion: string) => {
    const a = accion.toUpperCase();
    if (a.includes('ELIMIN') || a.includes('CANCEL') || a.includes('BLOQUE') || a.includes('RECHAZ')) {
      return 'bg-red-50 text-red-700 border-red-200 font-bold';
    }
    if (a.includes('CREA') || a.includes('APROB') || a.includes('AUTORIZ') || a.includes('DESBLOQUE') || a.includes('EMIT')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
    }
    if (a.includes('ACTUALIZ') || a.includes('MODIFIC') || a.includes('EDIT')) {
      return 'bg-sky-50 text-sky-700 border-sky-200 font-bold';
    }
    return 'bg-slate-50 text-slate-700 border-slate-200 font-medium';
  };

  // Sanitizador estricto para detalles (ocultar contraseñas, tokens, secrets o hashes sensibles)
  const sanitizeDetailPayload = (payload: any): string => {
    if (!payload) return 'Sin detalles registrados';
    try {
      const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
      if (typeof parsed !== 'object' || parsed === null) return 'Detalle de texto omitido por seguridad.';
      const maskSecrets = (obj: any): any => {
        if (typeof obj !== 'object' || obj === null) return obj;
        if (Array.isArray(obj)) return obj.map(maskSecrets);
        const result: Record<string, any> = {};
        for (const [key, val] of Object.entries(obj)) {
          const lower = key.toLowerCase();
          if (
            lower.includes('password') ||
            lower.includes('secret') ||
            lower.includes('token') ||
            lower.includes('hash') ||
            lower.includes('sessiontoken') ||
            lower.includes('authorization') ||
            lower.includes('cookie') ||
            lower.includes('apikey') ||
            lower.includes('credential')
          ) {
            result[key] = '••••••••••••';
          } else if (typeof val === 'object') {
            result[key] = maskSecrets(val);
          } else {
            result[key] = val;
          }
        }
        return result;
      };
      return JSON.stringify(maskSecrets(parsed), null, 2);
    } catch {
      return 'Detalle no disponible en formato válido.';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans max-w-7xl mx-auto pb-12">
      
      {/* Encabezado Principal */}
      <div className="bg-white border border-[#E5E8EE] rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-[#1B1D22] text-white rounded-2xl shadow-sm shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#1B1D22]/10 text-[#1B1D22]">
                  Seguridad & Trazabilidad
                </span>
                <span className="text-[10px] font-bold text-[#747780] flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-600" /> Acceso Restringido a Administradores
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-[#1B1D22] tracking-tight">
                Bitácora de Auditoría y Trazabilidad
              </h1>
              <p className="text-xs text-[#747780] font-medium mt-1">
                Registro inmutable de transacciones persistentes, operaciones de negocio y solicitudes HTTP autenticadas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAuditData(currentPage)}
              disabled={isLoading}
              className="btn-precision-outline text-xs flex items-center gap-2 cursor-pointer"
              title="Refrescar datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Selector Rápido de Categoría: Todos / Negocio / Trazas HTTP */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[#E5E8EE] pt-4">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#747780] mr-2">
            Tipo de Evento:
          </span>
          <button
            type="button"
            onClick={() => setFilterEventType('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterEventType === 'ALL'
                ? 'bg-[#1B1D22] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setFilterEventType('BUSINESS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              filterEventType === 'BUSINESS'
                ? 'bg-[#1A73E8] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Eventos de Negocio</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterEventType('HTTP')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              filterEventType === 'HTTP'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Trazas HTTP</span>
          </button>
        </div>

        {/* Nota de Alcance Operativo */}
        <div className="mt-4 p-3.5 bg-[#F8FAFC] border border-[#E5E8EE] rounded-2xl flex items-start gap-3 text-xs text-[#5A5D66]">
          <Info className="w-4 h-4 text-[#1A73E8] shrink-0 mt-0.5" />
          <p className="leading-relaxed text-[11px]">
            <strong>Aviso de auditoría:</strong> La bitácora registra transacciones persistentes (creación, edición, autorizaciones y pagos) y trazas de peticiones HTTP autenticadas con código de estado y duración, garantizando aislamiento total por empresa.
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <form onSubmit={handleApplyFilter} className="bg-white border border-[#E5E8EE] rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E8EE] pb-3">
          <div className="flex items-center gap-2 text-xs font-black text-[#1B1D22] uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#1A73E8]" />
            <span>Filtros de Búsqueda</span>
          </div>
          <div className="text-[11px] text-[#747780] font-medium">
            Total en vista: <strong className="text-[#1B1D22]">{records.length}</strong> de <strong className="text-[#1B1D22]">{totalRecords}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Filtro Módulo */}
          <div>
            <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
              Módulo del Sistema
            </label>
            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className="precision-input text-xs w-full"
            >
              {MODULOS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Usuario */}
          <div>
            <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
              Usuario
            </label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="precision-input text-xs w-full"
            >
              <option value="">Todos los Usuarios</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido} ({u.email})
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Acción */}
          <div>
            <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
              Acción (ej. CREAR, DESPACHO, HTTP)
            </label>
            <div className="relative">
              <input
                type="text"
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                placeholder="Buscar por acción..."
                className="precision-input text-xs w-full pl-8"
              />
              <Search className="w-3.5 h-3.5 text-[#747780] absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Filtro Fecha Desde */}
          <div>
            <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
              Desde
            </label>
            <input
              type="date"
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
              className="precision-input text-xs w-full"
            />
          </div>

          {/* Filtro Fecha Hasta */}
          <div>
            <label className="text-[10px] font-extrabold text-[#747780] uppercase block mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              className="precision-input text-xs w-full"
            />
          </div>
        </div>

        {/* Botones de acción de filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-precision-primary text-xs py-2 px-5 cursor-pointer flex items-center gap-2"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Aplicar Filtros</span>
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              disabled={isLoading}
              className="btn-precision-outline text-xs py-2 px-4 cursor-pointer"
            >
              Limpiar
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[10px] font-extrabold text-[#747780] uppercase">Mostrar por pág:</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="precision-input text-xs py-1 px-2 font-mono font-bold"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </form>

      {/* Manejo de Error */}
      {error && (
        <div className="p-5 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchAuditData(currentPage)}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg text-xs transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tabla de Bitácora */}
      <div className="bg-white border border-[#E5E8EE] rounded-3xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-[#747780] space-y-3">
            <Spinner />
            <p className="text-xs font-semibold">Consultando registros de auditoría...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No se encontraron eventos</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No hay registros de auditoría que coincidan con los filtros seleccionados. Intente ajustar los criterios de búsqueda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5E8EE] text-[10px] font-black text-[#747780] uppercase tracking-wider">
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Módulo / Acción</th>
                  <th className="py-3 px-4">Detalle / Ruta</th>
                  <th className="py-3 px-4">Origen / IP</th>
                  <th className="py-3 px-4 text-center">Inspección</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8EE] text-xs">
                {records.map((rec) => {
                  const isHttp = isHttpTrace(rec);
                  const trace = isHttp ? parseTraceDetails(rec.detalles) : null;

                  return (
                    <tr key={rec.id} className="hover:bg-[#F8FAFC] transition-colors">
                      {/* Fecha */}
                      <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap text-[#1B1D22]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#747780] shrink-0" />
                          <span>{formatManaguaDate(rec.createdAt)}</span>
                        </div>
                      </td>

                      {/* Usuario */}
                      <td className="py-3 px-4">
                        {rec.usuario ? (
                          <div>
                            <div className="font-extrabold text-[#1B1D22] text-[11px]">
                              {rec.usuario.nombre} {rec.usuario.apellido}
                            </div>
                            <div className="text-[10px] text-[#747780] font-mono">
                              {rec.usuario.email}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <Server className="w-3 h-3 text-slate-500" /> Sistema
                          </span>
                        )}
                      </td>

                      {/* Tipo de Registro (Negocio vs HTTP) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isHttp ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                            <Cpu className="w-3 h-3" /> Traza HTTP
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                            <Database className="w-3 h-3" /> Negocio
                          </span>
                        )}
                      </td>

                      {/* Módulo / Acción */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] border ${getEntityBadgeStyle(rec.entidadTipo)}`}>
                            {rec.entidadTipo}
                          </span>
                          {isHttp ? (
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${getHttpMethodBadge(trace?.metodo || rec.accion.replace('HTTP_', ''))}`}>
                              {trace?.metodo || rec.accion.replace('HTTP_', '')}
                            </span>
                          ) : (
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] border ${getActionBadgeStyle(rec.accion)}`}>
                              {rec.accion}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Detalle o Ruta */}
                      <td className="py-3 px-4">
                        {isHttp ? (
                          <div className="flex items-center gap-2">
                            {trace?.codigoHttp && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${getHttpStatusBadge(trace.codigoHttp)}`}>
                                {trace.codigoHttp}
                              </span>
                            )}
                            <span className="font-mono text-[11px] text-[#37474F] truncate max-w-xs block" title={trace?.ruta || ''}>
                              {trace?.ruta || '—'}
                            </span>
                            {trace?.duracionMs !== undefined && (
                              <span className="text-[10px] text-[#747780] font-mono shrink-0">
                                {trace.duracionMs} ms
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-[#37474F] font-bold">
                              ID: {rec.entidadId.length > 12 ? `${rec.entidadId.substring(0, 10)}…` : rec.entidadId}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(rec.entidadId, rec.id)}
                              className="p-1 hover:bg-slate-200 text-[#747780] rounded transition-colors"
                              title="Copiar ID completo"
                            >
                              {copiedId === rec.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* IP Origen */}
                      <td className="py-3 px-4 font-mono text-[10px] text-[#747780] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3 shrink-0" />
                          <span>{rec.ipDireccion || '127.0.0.1'}</span>
                        </div>
                      </td>

                      {/* Ver Detalle */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(rec)}
                          className="btn-precision-outline text-[11px] py-1 px-3 inline-flex items-center gap-1.5 cursor-pointer font-bold"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#1A73E8]" />
                          <span>Inspeccionar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginador */}
        <div className="p-4 bg-[#F8FAFC] border-t border-[#E5E8EE] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-[#747780] font-medium text-[11px]">
            Mostrando página <strong className="text-[#1B1D22]">{currentPage}</strong> de{' '}
            <strong className="text-[#1B1D22]">{totalPages}</strong> (Total: {totalRecords} eventos)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAuditData(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              className="btn-precision-outline text-xs py-1.5 px-3 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Anterior
            </button>

            <span className="font-mono text-xs font-bold px-2 text-[#1B1D22]">
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => fetchAuditData(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
              className="btn-precision-outline text-xs py-1.5 px-3 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Siguiente <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Detalle Forense del Evento */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto space-y-6">
            
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-[#E5E8EE] pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-[#1A73E8] rounded-2xl border border-blue-100">
                  <FileCode className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${getEntityBadgeStyle(selectedRecord.entidadTipo)}`}>
                      {selectedRecord.entidadTipo}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getActionBadgeStyle(selectedRecord.accion)}`}>
                      {selectedRecord.accion}
                    </span>
                    {isHttpTrace(selectedRecord) && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                        Petición HTTP
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-black text-[#1B1D22] mt-1">
                    Inspección Forense de Evento
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Metadatos del Evento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8FAFC] p-4 rounded-2xl border border-[#E5E8EE] text-xs">
              <div>
                <span className="text-[10px] font-extrabold text-[#747780] uppercase block">ID de Registro</span>
                <span className="font-mono font-bold text-[#1B1D22] break-all">{selectedRecord.id}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Fecha y Hora Oficial</span>
                <span className="font-mono font-bold text-[#1B1D22]">{formatManaguaDate(selectedRecord.createdAt)}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Usuario Responsable</span>
                <span className="font-bold text-[#1B1D22]">
                  {selectedRecord.usuario ? `${selectedRecord.usuario.nombre} ${selectedRecord.usuario.apellido} (${selectedRecord.usuario.email})` : 'Sistema Automático'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-[#747780] uppercase block">ID de Entidad / Trace</span>
                <span className="font-mono font-bold text-[#1B1D22] break-all">{selectedRecord.entidadId}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Dirección IP</span>
                <span className="font-mono font-bold text-[#1B1D22]">{selectedRecord.ipDireccion || 'Desconocida / Local'}</span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-[#747780] uppercase block">Request ID</span>
                <span className="font-mono font-bold text-[#747780] break-all">{selectedRecord.requestId || 'No disponible'}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] font-extrabold text-[#747780] uppercase block">User-Agent / Cliente</span>
                <span className="font-mono text-[11px] text-[#5A5D66] break-all">{selectedRecord.userAgent || 'Cliente API Directo'}</span>
              </div>
            </div>

            {/* Carga Útil / Detalles (Sanitizado) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-[#1B1D22] uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Detalles del Evento (Sanitizado contra secretos y tokens)</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleCopy(sanitizeDetailPayload(selectedRecord.detalles), 'payload')}
                  className="btn-precision-outline text-[10px] py-1 px-2.5 flex items-center gap-1 cursor-pointer font-bold"
                >
                  {copiedId === 'payload' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar JSON</span>
                </button>
              </div>

              <pre className="p-4 bg-[#1B1D22] text-[#4ADE80] font-mono text-[11px] rounded-2xl overflow-x-auto max-h-72 border border-slate-700 leading-relaxed">
                {sanitizeDetailPayload(selectedRecord.detalles)}
              </pre>
            </div>

            {/* Footer Modal */}
            <div className="border-t border-[#E5E8EE] pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="btn-precision-primary text-xs py-2 px-6 cursor-pointer font-bold"
              >
                Cerrar Inspección
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
