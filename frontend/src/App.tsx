import { Spinner } from './shared/components/Spinner';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { LoginPage } from './modules/auth/pages/LoginPage';
import { getCurrentUser } from './modules/auth/services/auth.api';
import api from './shared/services/api';
import {
  clearAuthSession,
  getAuthToken,
  getStoredUser,
  isSessionIdleExpired,
  touchActivity,
  updateStoredUser,
} from './shared/utils/auth-storage';
import { SystemStatusPage, type SystemErrorCode } from './shared/components/SystemStatusPage';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { readModuleFromUrl, syncModuleToUrl } from './shared/utils/module-navigation';
import { lazyWithRetry } from './shared/utils/lazy-with-retry';
import {
  normalizeUserRoles,
  resolveUserModuleAccess,
  type ModuleAccessLevel,
} from './shared/constants/modules';
import { ModuleAccessProvider } from './shared/context/ModuleAccessContext';
import { ReadOnlyModuleGuard } from './shared/components/ReadOnlyModuleGuard';

// Code Splitting por módulos con carga diferida (lazy loading con auto-recuperación ante despliegues)
const ClientsPage = lazyWithRetry(() => import('./modules/clients/pages/ClientsPage').then((m) => ({ default: m.ClientsPage })));
const SecurityPage = lazyWithRetry(() => import('./modules/security/pages/SecurityPage').then((m) => ({ default: m.SecurityPage })));
const InventoryPage = lazyWithRetry(() => import('./modules/inventory/pages/InventoryPage').then((m) => ({ default: m.InventoryPage })));
const OperationsPage = lazyWithRetry(() => import('./modules/operations/pages/OperationsPage').then((m) => ({ default: m.OperationsPage })));
const ContractsPage = lazyWithRetry(() => import('./modules/contracts/pages/ContractsPage').then((m) => ({ default: m.ContractsPage })));
const QuotationsPage = lazyWithRetry(() => import('./modules/quotations/pages/QuotationsPage').then((m) => ({ default: m.QuotationsPage })));
const AvailabilityPage = lazyWithRetry(() => import('./modules/availability/pages/AvailabilityPage').then((m) => ({ default: m.AvailabilityPage })));
const BillingDashboard = lazyWithRetry(() => import('./modules/billing/pages/BillingDashboard').then((m) => ({ default: m.BillingDashboard })));
const MaintenanceDashboard = lazyWithRetry(() => import('./modules/maintenance/pages/MaintenanceDashboard').then((m) => ({ default: m.MaintenanceDashboard })));
const AccountingDashboard = lazyWithRetry(() => import('./modules/accounting/pages/AccountingDashboard').then((m) => ({ default: m.AccountingDashboard })));
const PublicQuotationRequest = lazyWithRetry(() => import('./modules/quotations/pages/PublicQuotationRequest').then((m) => ({ default: m.PublicQuotationRequest })));
const PublicQuotationView = lazyWithRetry(() => import('./modules/quotations/pages/PublicQuotationView').then((m) => ({ default: m.PublicQuotationView })));
const ForceChangePasswordPage = lazyWithRetry(() => import('./modules/security/pages/ForceChangePasswordPage').then((m) => ({ default: m.ForceChangePasswordPage })));
const CommissionsPage = lazyWithRetry(() => import('./modules/commissions/pages/CommissionsPage').then((m) => ({ default: m.CommissionsPage })));
const PayrollPage = lazyWithRetry(() => import('./modules/payroll/pages/PayrollPage').then((m) => ({ default: m.PayrollPage })));
const SalesDashboardPage = lazyWithRetry(() => import('./modules/sales/pages/SalesDashboardPage').then((m) => ({ default: m.SalesDashboardPage })));
const AuditLogPage = lazyWithRetry(() => import('./modules/auditoria/pages/AuditLogPage').then((m) => ({ default: m.AuditLogPage })));
const CxcDashboard = lazyWithRetry(() => import('./modules/cxc/pages/CxcDashboard').then((m) => ({ default: m.CxcDashboard })));
const NumberingSeriesPage = lazyWithRetry(() => import('./modules/numbering/pages/NumberingSeriesPage').then((m) => ({ default: m.NumberingSeriesPage })));
const ProvidersPage = lazyWithRetry(() => import('./modules/providers/pages/ProvidersPage').then((m) => ({ default: m.ProvidersPage })));
const PurchasesPage = lazyWithRetry(() => import('./modules/purchases/pages/PurchasesPage').then((m) => ({ default: m.PurchasesPage })));
const InsumosPage = lazyWithRetry(() => import('./modules/insumos/pages/InsumosPage').then((m) => ({ default: m.InsumosPage })));
const PromotionsPage = lazyWithRetry(() => import('./modules/promotions/pages/PromotionsPage').then((m) => ({ default: m.PromotionsPage })));
const ReportsCenterPage = lazyWithRetry(() => import('./modules/reports/pages/ReportsCenterPage').then((m) => ({ default: m.ReportsCenterPage })));

const ModuleLoadingFallback = () => (
  <div className="flex flex-col items-center justify-center p-16 text-[#747780] animate-fadeIn">
    <Spinner className="mb-4" />
    <span className="text-xs font-semibold text-[#5A5D66]">Cargando módulo del sistema...</span>
  </div>
);
import {
  Wrench,
  Users,
  FileText,
  Shield,
  Layers,
  Calendar,
  LogOut,
  User,
  MapPin,
  Truck,
  Grid,
  ArrowLeft,
  ChevronRight,
  Activity,
  Receipt,
  Calculator,
  Award,
  Trophy,
  Banknote,
  CreditCard,
  Hash,
  Building2,
  Package,
  Sparkles,
  ShoppingBag,
  AlertTriangle,
  X,
  BarChart3,
} from 'lucide-react';

function App() {
  const [user, setUser] = useState<any>(() => (getAuthToken() ? getStoredUser() : null));
  const [isValidatingSession, setIsValidatingSession] = useState<boolean>(() => Boolean(getAuthToken()));
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [currentModule, setCurrentModuleState] = useState<string | null>(() => readModuleFromUrl());
  const currentModuleRef = useRef<string | null>(currentModule);
  currentModuleRef.current = currentModule;
  const lastTouchRef = useRef<number>(0);

  const setCurrentModule = useCallback((nextModule: string | null, options?: { replace?: boolean }) => {
    if (currentModuleRef.current !== nextModule) {
      syncModuleToUrl(nextModule, currentModuleRef.current, options?.replace);
    }
    currentModuleRef.current = nextModule;
    setCurrentModuleState(nextModule);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const nextMod = readModuleFromUrl();
      currentModuleRef.current = nextMod;
      setCurrentModuleState(nextMod);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleLogout = useCallback(async (notice?: unknown) => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Error al cerrar sesión en el servidor:', e);
    } finally {
      clearAuthSession();
      delete api.defaults.headers.common.Authorization;
      setUser(null);
      setCurrentModule(null, { replace: true });
      if (typeof notice === 'string') {
        setSessionNotice(notice);
      }
    }
  }, [setCurrentModule]);

  useEffect(() => {
    let isMounted = true;

    const verifyStartupSession = async () => {
      const token = getAuthToken();
      if (!token) {
        clearAuthSession();
        if (isMounted) {
          setUser(null);
          setIsValidatingSession(false);
        }
        return;
      }

      if (isSessionIdleExpired()) {
        api.post('/auth/logout').catch(() => undefined);
        clearAuthSession();
        delete api.defaults.headers.common.Authorization;
        if (isMounted) {
          setSessionNotice('Tu sesión se cerró por inactividad. Inicia sesión nuevamente.');
          setUser(null);
          setIsValidatingSession(false);
        }
        return;
      }

      try {
        const verifiedUser = await getCurrentUser();
        if (!isMounted) return;
        updateStoredUser(verifiedUser);
        touchActivity();
        setUser(verifiedUser);
      } catch {
        clearAuthSession();
        delete api.defaults.headers.common.Authorization;
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsValidatingSession(false);
        }
      }
    };

    verifyStartupSession();

    const handleAuthExpired = () => {
      if (!isMounted) return;
      clearAuthSession();
      setSessionNotice('Tu sesión expiró. Inicia sesión nuevamente.');
      setUser(null);
      setCurrentModule(null, { replace: true });
    };

    window.addEventListener('bismark:auth-expired', handleAuthExpired);
    const handlePermissionDenied = (event: Event) => {
      if (!isMounted) return;
      const customEvent = event as CustomEvent<{ message?: string }>;
      setPermissionNotice(
        customEvent.detail?.message ||
          'No tienes permiso para realizar esta acción en este módulo.',
      );
    };
    window.addEventListener('bismark:permission-denied', handlePermissionDenied);
    return () => {
      isMounted = false;
      window.removeEventListener('bismark:auth-expired', handleAuthExpired);
      window.removeEventListener('bismark:permission-denied', handlePermissionDenied);
    };
  }, [setCurrentModule]);

  useEffect(() => {
    if (!permissionNotice) return;
    const timer = window.setTimeout(() => setPermissionNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [permissionNotice]);

  useEffect(() => {
    if (!user) return;

    if (window.location.pathname === '/login') {
      window.history.replaceState({}, '', '/');
    }

    const checkIdleExpiration = () => {
      if (isSessionIdleExpired()) {
        void handleLogout('Tu sesión se cerró automáticamente por inactividad.');
      }
    };

    const handleUserActivity = () => {
      if (isSessionIdleExpired()) {
        checkIdleExpiration();
        return;
      }
      const now = Date.now();
      if (now - lastTouchRef.current >= 15000) {
        lastTouchRef.current = now;
        touchActivity(now);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkIdleExpiration();
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if ((event.key === 'token' || event.key === null) && !getAuthToken()) {
        clearAuthSession();
        setUser(null);
        setCurrentModule(null, { replace: true });
      }
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    for (const evt of activityEvents) {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);
    const intervalId = window.setInterval(checkIdleExpiration, 30000);

    return () => {
      for (const evt of activityEvents) {
        window.removeEventListener(evt, handleUserActivity);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
      window.clearInterval(intervalId);
    };
  }, [user, handleLogout, setCurrentModule]);

  // Soporte para vista previa / demo interactivo de estados y errores (404, 500, 503, offline)
  const searchParams = new URLSearchParams(window.location.search);
  const errorParam = searchParams.get('error') as SystemErrorCode | null;
  const isErrorDemo =
    window.location.pathname === '/error-demo' ||
    window.location.pathname === '/status' ||
    window.location.pathname === '/404' ||
    searchParams.has('demo-error');

  if (isErrorDemo || errorParam) {
    return (
      <SystemStatusPage
        code={errorParam || '404'}
        onGoHome={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  // Rutas públicas
  const publicCotMatch = window.location.pathname.match(/^\/(?:cotizacion|quote)\/([a-zA-Z0-9_-]+)/);
  if (publicCotMatch) {
    return (
      <Suspense fallback={<ModuleLoadingFallback />}>
        <PublicQuotationView token={publicCotMatch[1]} />
      </Suspense>
    );
  }

  if (window.location.pathname === '/request-quote') {
    return (
      <Suspense fallback={<ModuleLoadingFallback />}>
        <PublicQuotationRequest />
      </Suspense>
    );
  }

  // Si la ruta en el navegador no es raíz '/', '/login' ni una ruta pública conocida, mostrar 404
  const currentPath = window.location.pathname;
  if (currentPath !== '/' && currentPath !== '' && currentPath !== '/login') {
    return (
      <SystemStatusPage
        code="404"
        onGoHome={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  if (isValidatingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F6F9] text-[#5A5D66]">
        <Spinner className="mb-3" />
        <span className="text-xs font-semibold">Verificando sesión activa...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        sessionMessage={sessionNotice}
        onLoginSuccess={(loggedUser) => {
          setSessionNotice(null);
          setUser(loggedUser);
          if (window.location.pathname === '/login') {
            window.history.replaceState({}, '', '/');
          }
        }}
      />
    );
  }

  // Intercepta cambio de contraseña obligatorio si es temporal
  if (user.requiereCambioPassword) {
    return (
      <Suspense fallback={<ModuleLoadingFallback />}>
        <ForceChangePasswordPage
          onSuccess={() => {
            const updatedUser = { ...user, requiereCambioPassword: false };
            updateStoredUser(updatedUser);
            setUser(updatedUser);
          }}
        />
      </Suspense>
    );
  }

  // Módulos organizados del Sistema ERP:
  // Control de Acceso Basado en Roles (RBAC): Cada módulo restringe su visibilidad a los roles autorizados.
  const apps = [
    {
      id: 'clients',
      nombre: 'Clientes',
      descripcion: 'Directorio de empresas, contactos y registro de arrendatarios',
      icono: Users,
      badgeColor: 'bg-[#1A73E8] text-white shadow-md shadow-[#1A73E8]/20',
      cardHover: 'hover:border-[#1A73E8]/40 hover:shadow-lg hover:shadow-[#1A73E8]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'VENDEDOR', 'FACTURACION', 'OPERACIONES', 'CONTABILIDAD'],
    },
    {
      id: 'inventory',
      nombre: 'Inventario y Maquinaria',
      descripcion: 'Control de maquinaria pesada, tarifas por hora/día, series y horómetros',
      icono: Layers,
      badgeColor: 'bg-[#1A73E8] text-white shadow-md shadow-[#1A73E8]/20',
      cardHover: 'hover:border-[#1A73E8]/40 hover:shadow-lg hover:shadow-[#1A73E8]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'VENDEDOR', 'OPERACIONES', 'MANTENIMIENTO', 'BODEGA', 'LOGISTICA', 'SUPERVISOR', 'AUDITOR', 'FACTURACION', 'CONTABILIDAD'],
    },
    {
      id: 'providers',
      nombre: 'Proveedores',
      descripcion: 'Catálogo de proveedores de maquinaria externa, insumos y talleres',
      icono: Building2,
      badgeColor: 'bg-amber-700 text-white shadow-md shadow-amber-700/20',
      cardHover: 'hover:border-amber-700/40 hover:shadow-lg hover:shadow-amber-700/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'INVENTARIO', 'MANTENIMIENTO', 'OPERACIONES', 'COMERCIAL', 'CONTABILIDAD'],
    },
    {
      id: 'purchases',
      nombre: 'Compras y Maquinaria Externa',
      descripcion: 'Órdenes de compra de insumos para bodega y períodos de renta de maquinaria de proveedores',
      icono: ShoppingBag,
      badgeColor: 'bg-amber-600 text-white shadow-md shadow-amber-600/20',
      cardHover: 'hover:border-amber-600/40 hover:shadow-lg hover:shadow-amber-600/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'CONTABILIDAD', 'OPERACIONES', 'MANTENIMIENTO', 'BODEGA', 'INVENTARIO', 'COMERCIAL'],
    },
    {
      id: 'insumos',
      nombre: 'Bodega de Insumos',
      descripcion: 'Existencias de lubricantes, filtros, consumibles y repuestos de taller',
      icono: Package,
      badgeColor: 'bg-emerald-700 text-white shadow-md shadow-emerald-700/20',
      cardHover: 'hover:border-emerald-700/40 hover:shadow-lg hover:shadow-emerald-700/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'INVENTARIO', 'MANTENIMIENTO', 'OPERACIONES', 'BODEGA', 'CONTABILIDAD'],
    },
    {
      id: 'promociones',
      nombre: 'Promociones y Combos',
      descripcion: 'Paquetes de maquinaria y tarifas promocionales para ofrecer en cotizaciones',
      icono: Sparkles,
      badgeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20',
      cardHover: 'hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'FACTURACION'],
    },
    {
      id: 'availability',
      nombre: 'Disponibilidad y Reservas',
      descripcion: 'Calendario de ocupación y reservas de equipos en tiempo real',
      icono: Calendar,
      badgeColor: 'bg-[#37474F] text-white shadow-md shadow-[#37474F]/20',
      cardHover: 'hover:border-[#37474F]/40 hover:shadow-lg hover:shadow-[#37474F]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'VENDEDOR', 'OPERACIONES', 'MANTENIMIENTO', 'BODEGA', 'LOGISTICA', 'SUPERVISOR'],
    },
    {
      id: 'quotations',
      nombre: 'Cotizaciones',
      descripcion: 'Presupuestos de renta comercial y autorizaciones de precio',
      icono: FileText,
      badgeColor: 'bg-[#C55500] text-white shadow-md shadow-[#C55500]/20',
      cardHover: 'hover:border-[#C55500]/40 hover:shadow-lg hover:shadow-[#C55500]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'VENDEDOR'],
    },
    {
      id: 'contracts',
      nombre: 'Contratos',
      descripcion: 'Formalización de contrato de arrendamiento y plan de cortes',
      icono: FileText,
      badgeColor: 'bg-[#37474F] text-white shadow-md shadow-[#37474F]/20',
      cardHover: 'hover:border-[#37474F]/40 hover:shadow-lg hover:shadow-[#37474F]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'VENDEDOR', 'FACTURACION', 'OPERACIONES'],
    },
    {
      id: 'operations',
      nombre: 'Operaciones (Despacho / Retorno)',
      descripcion: 'Despacho de equipos, inspección de salida, retornos y lecturas de horómetros',
      icono: Truck,
      badgeColor: 'bg-[#C55500] text-white shadow-md shadow-[#C55500]/20',
      cardHover: 'hover:border-[#C55500]/40 hover:shadow-lg hover:shadow-[#C55500]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'OPERACIONES', 'MANTENIMIENTO', 'LOGISTICA', 'BODEGA', 'SUPERVISOR'],
    },
    {
      id: 'billing',
      nombre: 'Facturación y Caja',
      descripcion: 'Emisión de facturas por cortes de contrato o cotizaciones y cobros',
      icono: Receipt,
      badgeColor: 'bg-[#C55500] text-white shadow-md shadow-[#C55500]/20',
      cardHover: 'hover:border-[#C55500]/40 hover:shadow-lg hover:shadow-[#C55500]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'FACTURACION', 'CONTABILIDAD'],
    },
    {
      id: 'cxc',
      nombre: 'Cuentas por Cobrar (CxC)',
      descripcion: 'Gestión de cartera, antigüedad de saldos, estado de cuenta, recibos con retenciones y acuerdos de pago',
      icono: CreditCard,
      badgeColor: 'bg-teal-600 text-white shadow-md shadow-teal-600/20',
      cardHover: 'hover:border-teal-600/40 hover:shadow-lg hover:shadow-teal-600/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'CONTABILIDAD', 'FACTURACION', 'COMERCIAL', 'VENDEDOR'],
    },
    {
      id: 'accounting',
      nombre: 'Contabilidad & Finanzas',
      descripcion: 'Balance General, Estado de Resultados, Cuentas por Cobrar y Pagar',
      icono: Calculator,
      badgeColor: 'bg-[#1B1D22] text-white shadow-md shadow-[#1B1D22]/20',
      cardHover: 'hover:border-[#1B1D22]/40 hover:shadow-lg hover:shadow-[#1B1D22]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'CONTABILIDAD'],
    },
    {
      id: 'maintenance',
      nombre: 'Taller y Mantenimiento',
      descripcion: 'Servicios preventivos, correctivos y registro de averías/repuestos',
      icono: Wrench,
      badgeColor: 'bg-[#37474F] text-white shadow-md shadow-[#37474F]/20',
      cardHover: 'hover:border-[#37474F]/40 hover:shadow-lg hover:shadow-[#37474F]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'MANTENIMIENTO', 'OPERACIONES', 'BODEGA'],
    },
    {
      id: 'audit',
      nombre: 'Bitácora de Auditoría',
      descripcion: 'Trazabilidad de actividades, cambios de datos e inicios de sesión',
      icono: Activity,
      badgeColor: 'bg-[#747780] text-white shadow-md shadow-[#747780]/20',
      cardHover: 'hover:border-[#747780]/40 hover:shadow-lg hover:shadow-[#747780]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'AUDITOR', 'CONTABILIDAD'],
    },
    {
      id: 'security',
      nombre: 'Seguridad y Roles',
      descripcion: 'Gestión de usuarios, permisos y credenciales de acceso',
      icono: Shield,
      badgeColor: 'bg-[#1B1D22] text-white shadow-md shadow-[#1B1D22]/20',
      cardHover: 'hover:border-[#1B1D22]/40 hover:shadow-lg hover:shadow-[#1B1D22]/5',
      allowedRoles: ['ADMIN'],
    },
    {
      id: 'commissions',
      nombre: 'Comisiones de Ventas',
      descripcion: 'Configuración de escalas de comisión comercial y simulador de liquidación',
      icono: Award,
      badgeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20',
      cardHover: 'hover:border-emerald-600/40 hover:shadow-lg hover:shadow-emerald-600/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'CONTABILIDAD', 'RRHH'],
    },
    {
      id: 'sales',
      nombre: 'Supervisión y Ranking de Ventas',
      descripcion: 'Ranking de asesores comerciales, cotizaciones consolidadas y métricas de efectividad',
      icono: Trophy,
      badgeColor: 'bg-amber-600 text-white shadow-md shadow-amber-600/20',
      cardHover: 'hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5',
      allowedRoles: ['ADMIN', 'GERENTE'],
    },
    {
      id: 'payroll',
      nombre: 'Nómina & Recursos Humanos',
      descripcion: 'Planilla quincenal de Nicaragua, cotizaciones INSS, retenciones IR Art. 23, horas extra y colillas de pago',
      icono: Banknote,
      badgeColor: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20',
      cardHover: 'hover:border-indigo-600/40 hover:shadow-lg hover:shadow-indigo-600/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'CONTABILIDAD', 'RRHH'],
    },
    {
      id: 'numbering',
      nombre: 'Series y Folios (Numeración)',
      descripcion: 'Configuración oficial de correlativos, rangos, series fiscales y folios de documentos',
      icono: Hash,
      badgeColor: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20',
      cardHover: 'hover:border-indigo-600/40 hover:shadow-lg hover:shadow-indigo-600/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'CONTABILIDAD'],
    },
    {
      id: 'reports',
      nombre: 'Centro de Reportes y Anulaciones',
      descripcion: 'Informes de todos los módulos con Excel dinámico y centro de anulación de documentos con impacto en inventario y contabilidad',
      icono: BarChart3,
      badgeColor: 'bg-slate-900 text-white shadow-md shadow-slate-900/20',
      cardHover: 'hover:border-slate-900/40 hover:shadow-lg hover:shadow-slate-900/10',
      allowedRoles: ['ADMIN', 'GERENTE', 'CONTABILIDAD', 'AUDITOR', 'FACTURACION', 'OPERACIONES', 'COMERCIAL', 'RRHH'],
    }
  ];

  const ROLE_LABELS_ES: Record<string, string> = {
    ADMIN: 'ADMINISTRADOR',
    GERENTE: 'GERENCIA GENERAL',
    COMERCIAL: 'ASESOR COMERCIAL',
    VENDEDOR: 'VENDEDOR',
    RRHH: 'RECURSOS HUMANOS',
    FACTURACION: 'FACTURACIÓN Y CAJA',
    OPERACIONES: 'OPERACIONES Y TRANSPORTE',
    CONTABILIDAD: 'CONTABILIDAD',
    MANTENIMIENTO: 'MANTENIMIENTO Y TALLER',
    BODEGA: 'BODEGA Y ALMACÉN',
    LOGISTICA: 'LOGÍSTICA Y FLETES',
    SUPERVISOR: 'SUPERVISIÓN DE CAMPO',
    AUDITOR: 'AUDITORÍA Y CONTROL',
  };

  const formatRoleBadge = (role: string) => ROLE_LABELS_ES[role.toUpperCase()] || role;

  // Normalizar los roles del usuario activo a un array en mayúsculas
  const userRoles: string[] = normalizeUserRoles(user?.roles);

  const isAdmin = userRoles.includes('ADMIN');
  const hasCustomModulePermissions = Boolean(user?.permisosModulosPersonalizados) && !isAdmin;

  const getModuleAccessLevel = (moduleId: string): ModuleAccessLevel =>
    resolveUserModuleAccess(user, moduleId);

  // Filtrar exclusivamente los módulos autorizados para el usuario (personalizado por módulo o por rol)
  const visibleApps = apps.filter((app) => getModuleAccessLevel(app.id) !== 'SIN_ACCESO');

  // Validar si el usuario tiene permiso para el módulo actualmente seleccionado
  const currentApp = apps.find((a) => a.id === currentModule);
  const currentModuleLevel: ModuleAccessLevel = currentModule
    ? getModuleAccessLevel(currentModule)
    : 'ESCRITURA';
  const isCurrentModuleReadOnly = currentModuleLevel === 'LECTURA';
  const isAuthorizedForCurrentModule =
    !currentModule || currentModuleLevel !== 'SIN_ACCESO';

  // Raiz con overflow-x-clip (no overflow-hidden): overflow-hidden crea un contenedor de scroll que no se desplaza y
  // el `sticky top-0` del <header> del modulo nunca se quedaba fijo. El `sticky` ya existia desde antes; lo que
  // cambio es este overflow. clip recorta el desborde horizontal igual, sin tocar el scroll vertical. Al imprimir
  // no influye: las vistas de impresion ocultan <header> con su propio @media print.
  return (
    <div className="min-h-screen bg-[#EFF3F8] text-[#1B1D22] flex flex-col font-sans relative overflow-x-clip">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-xl focus:bg-white focus:text-[#1A73E8] focus:text-sm focus:font-bold focus:shadow-lg"
      >
        Saltar al contenido
      </a>
      
      {/* --- RENDER DEL MÓDULO ACTIVO --- */}
      {currentModule ? (
        <div className="flex-1 flex flex-col min-w-0 z-10 bg-[#EFF3F8] animate-fadeIn">
          
          {/* Header del Módulo Precision - Limpio, Sin Pasos, Con Vista de Usuario Idéntica */}
          <header className="h-16 border-b border-[#E5E8EE] bg-white px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 shadow-sm z-20">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setCurrentModule(null)}
                className="p-2 rounded-xl bg-[#F4F6F9] border border-[#E5E8EE] hover:bg-[#E8F0FE] text-[#37474F] hover:text-[#1A73E8] transition-all flex items-center gap-2 group font-semibold text-xs cursor-pointer shadow-xs"
                title="Regresar al panel de módulos"
                aria-label="Regresar al panel de módulos"
              >
                <Grid aria-hidden="true" className="w-4 h-4 text-[#1A73E8] transition-transform group-hover:rotate-90" />
                <span className="font-bold hidden sm:inline">Mis Módulos</span>
              </button>

              <div className="h-6 w-[1px] bg-[#E5E8EE]" />
              
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm text-[#1B1D22] tracking-tight truncate max-w-[45vw] sm:max-w-none">{currentApp?.nombre || currentModule}</h1>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[#747780] text-xs">
                <MapPin className="w-4 h-4 text-[#1A73E8]" />
                <span className="font-semibold text-[#37474F]">Sucursal Managua</span>
              </div>
            </div>
            
            {/* Perfil del usuario / Cerrar sesión (EXACTAMENTE IGUAL AL LAUNCHER) */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F4F6F9] border border-[#E5E8EE] flex items-center justify-center text-[#1A73E8] font-bold shrink-0 shadow-xs">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-extrabold text-[#1B1D22]">{user.nombre} {user.apellido}</p>
                  <span className="text-[10px] font-extrabold text-[#C55500] tracking-wider block uppercase leading-none mt-0.5">
                    {userRoles.map(formatRoleBadge).join(' • ')}
                  </span>
                </div>
              </div>
              <div className="h-5 w-[1px] bg-[#E5E8EE]" />
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-xl text-[#747780] hover:text-[#C55500] hover:bg-[#FDF2E9] transition-all cursor-pointer"
                title="Cerrar Sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Contenedor Principal del Módulo con Validación de Acceso */}
          <main id="contenido-principal" tabIndex={-1} className="flex-1 p-4 sm:p-8 focus:outline-none">
            {!isAuthorizedForCurrentModule ? (
              <div className="bg-white border border-[#E5E8EE] rounded-3xl p-10 text-center max-w-xl mx-auto mt-16 shadow-xs space-y-4 animate-fadeIn">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                  <Shield className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-black text-[#1B1D22]">Acceso No Autorizado</h2>
                <p className="text-xs text-[#747780] max-w-md mx-auto leading-relaxed">
                  Tu perfil actual (<strong>{userRoles.join(', ')}</strong>) no cuenta con los permisos necesarios para gestionar el módulo de <strong>{currentApp?.nombre || currentModule}</strong>.
                </p>
                <button
                  onClick={() => setCurrentModule(null)}
                  className="btn-precision-primary text-xs py-2 px-5 mx-auto cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver a mis módulos disponibles
                </button>
              </div>
            ) : (
              <>
              {false && (
                <div
                  data-current={currentModule}
                  data-open={(stepId: string) => {
                    if (isAdmin) return true;
                    const stepApp = apps.find((app) => app.id === stepId);
                    return Boolean(stepApp?.allowedRoles.some((role) => userRoles.includes(role)));
                  }}
                  data-set={setCurrentModule}
                />
              )}
              <ErrorBoundary onReset={() => setCurrentModule(null)}>
                <ModuleAccessProvider moduleId={currentModule} level={currentModuleLevel}>
                  <ReadOnlyModuleGuard
                    readOnly={isCurrentModuleReadOnly}
                    moduleName={currentApp?.nombre || currentModule}
                  >
                <Suspense fallback={<ModuleLoadingFallback />}>
                  {currentModule === 'clients' ? (
                    <ClientsPage />
                  ) : currentModule === 'security' ? (
                    <SecurityPage />
                  ) : currentModule === 'quotations' ? (
                    <QuotationsPage />
                  ) : currentModule === 'billing' ? (
                    <BillingDashboard
                      canEditRepair={!isCurrentModuleReadOnly && (hasCustomModulePermissions || isAdmin || userRoles.includes('GERENTE'))}
                      canInvoiceDamage={!isCurrentModuleReadOnly && (hasCustomModulePermissions || isAdmin || userRoles.includes('GERENTE') || userRoles.includes('FACTURACION'))}
                    />
                  ) : currentModule === 'cxc' ? (
                    <CxcDashboard />
                  ) : currentModule === 'maintenance' ? (
                    <MaintenanceDashboard />
                  ) : currentModule === 'accounting' ? (
                    <AccountingDashboard />
                  ) : currentModule === 'availability' ? (
                    <AvailabilityPage />
                  ) : currentModule === 'inventory' ? (
                    <InventoryPage />
                  ) : currentModule === 'contracts' ? (
                    <ContractsPage />
                  ) : currentModule === 'operations' ? (
                    <OperationsPage />
                  ) : currentModule === 'commissions' ? (
                    <CommissionsPage />
                  ) : currentModule === 'payroll' ? (
                    <PayrollPage />
                  ) : currentModule === 'sales' ? (
                    <SalesDashboardPage />
                  ) : currentModule === 'audit' ? (
                    <AuditLogPage />
                  ) : currentModule === 'numbering' ? (
                    <NumberingSeriesPage canManage={!isCurrentModuleReadOnly && (hasCustomModulePermissions || isAdmin || userRoles.includes('GERENTE') || userRoles.includes('CONTABILIDAD'))} />
                  ) : currentModule === 'providers' ? (
                    <ProvidersPage />
                  ) : currentModule === 'purchases' ? (
                    <PurchasesPage />
                  ) : currentModule === 'insumos' ? (
                    <InsumosPage />
                  ) : currentModule === 'promociones' ? (
                    <PromotionsPage />
                  ) : currentModule === 'reports' ? (
                    <ReportsCenterPage />
                  ) : (
                    <div className="bg-white border border-[#E5E8EE] rounded-3xl p-12 text-center max-w-2xl mx-auto mt-16 shadow-md shadow-slate-200/50">
                      <div className="p-4 rounded-2xl bg-[#E8F0FE] inline-flex items-center justify-center text-[#1A73E8] mb-6 border border-[#1A73E8]/10">
                        <Grid className="w-10 h-10" />
                      </div>
                      <h2 className="text-xl font-black text-[#1B1D22] tracking-tight mb-2">
                        Módulo de {currentApp?.nombre || currentModule}
                      </h2>
                      <p className="text-xs text-[#747780] max-w-md mx-auto leading-relaxed mb-6">
                        Este módulo se encuentra en proceso de implementación y estará disponible próximamente en el sistema.
                      </p>
                      <button
                        onClick={() => setCurrentModule(null)}
                        className="btn-precision-primary cursor-pointer mx-auto"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Volver al Panel Principal
                      </button>
                    </div>
                  )}
                </Suspense>
                  </ReadOnlyModuleGuard>
                </ModuleAccessProvider>
              </ErrorBoundary>
              </>
            )}
          </main>
        </div>
      ) : (
        // --- APP LAUNCHER CENTRAL FILTRADO POR ROLES ---
        <div className="flex-1 flex flex-col min-w-0 z-10 animate-fadeIn">
          
          {/* Header del Launcher */}
          <header className="h-16 border-b border-[#E5E8EE] bg-white px-4 sm:px-8 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#1A73E8] flex items-center justify-center shadow-md shadow-[#1A73E8]/20">
                <Grid className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-black text-sm tracking-wide text-[#1B1D22]">BM CONSTRUCCIONES</h1>
                <span className="text-[10px] text-[#747780] font-semibold tracking-wider block uppercase leading-none">Sistema de Gestión ERP</span>
              </div>
            </div>

            {/* Perfil del usuario / Cerrar sesión */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#F4F6F9] border border-[#E5E8EE] flex items-center justify-center text-[#1A73E8] font-bold shrink-0 shadow-xs">
                  <User className="w-4 h-4" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-extrabold text-[#1B1D22]">{user.nombre} {user.apellido}</p>
                  <span className="text-[10px] font-extrabold text-[#C55500] tracking-wider block uppercase leading-none mt-0.5">
                    {userRoles.map(formatRoleBadge).join(' • ')}
                  </span>
                </div>
              </div>
              <div className="h-5 w-[1px] bg-[#E5E8EE]" />
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-xl text-[#747780] hover:text-[#C55500] hover:bg-[#FDF2E9] transition-all cursor-pointer"
                title="Cerrar Sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Launcher Grid Central Exclusivamente con Módulos Autorizados */}
          <main id="contenido-principal" tabIndex={-1} className="flex-1 flex flex-col justify-center items-center px-4 py-10 max-w-7xl mx-auto w-full focus:outline-none">
            <div className="text-center mb-8">
              <span className="px-3.5 py-1 bg-[#E8F0FE] text-[#1A73E8] text-[11px] font-black rounded-full tracking-wider uppercase inline-block mb-3 border border-[#1A73E8]/20">
                Rol: {userRoles.map(formatRoleBadge).join(' • ')}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#1B1D22] tracking-tight mb-1.5">
                {isAdmin ? 'Panel General de Módulos ERP' : 'Mis Módulos de Gestión'}
              </h2>
              <p className="text-xs text-[#747780] font-medium max-w-lg mx-auto">
                {isAdmin
                  ? `Acceso administrativo total a los ${visibleApps.length} módulos del sistema ERP`
                  : `Mostrando los ${visibleApps.length} módulos autorizados para tu perfil`}
              </p>
            </div>

            {/* Grid de Tarjetas de Aplicación Filtradas */}
            {visibleApps.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 w-full">
                {visibleApps.map((app) => {
                  const IconComponent = app.icono;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setCurrentModule(app.id)}
                      className={`flex flex-col items-start p-6 rounded-3xl border border-[#E5E8EE] bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1A73E8] ${app.cardHover}`}
                    >
                      {/* Icono de la App */}
                      <div className={`p-3 rounded-2xl mb-4 shrink-0 transition-transform group-hover:scale-105 ${app.badgeColor}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>

                      {/* Detalles */}
                      <div className="space-y-1 w-full text-left">
                        <div className="flex items-center justify-between">
                          <h3 className="font-extrabold text-[#1B1D22] text-sm tracking-tight group-hover:text-[#1A73E8] transition-colors">{app.nombre}</h3>
                          <ChevronRight className="w-4 h-4 text-[#747780] opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                        </div>
                        <p className="text-[11px] text-[#747780] leading-relaxed font-medium">{app.descripcion}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border border-[#E5E8EE] rounded-3xl p-12 text-center max-w-md mx-auto shadow-xs">
                <p className="text-xs text-[#747780] font-medium">No cuentas con módulos asignados para tu cuenta. Contacta al Administrador.</p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Aviso flotante cuando una acción es bloqueada por Solo Lectura o permisos */}
      {permissionNotice && (
        <div
          role="alert"
          className="fixed bottom-5 right-5 z-50 max-w-md bg-white border border-amber-300 shadow-xl rounded-2xl p-4 flex items-start gap-3 animate-fadeIn"
        >
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-slate-900">Acción restringida</p>
            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{permissionNotice}</p>
          </div>
          <button
            type="button"
            onClick={() => setPermissionNotice(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            aria-label="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
