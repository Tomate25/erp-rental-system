import { Spinner } from './shared/components/Spinner';
import { useState, lazy, Suspense } from 'react';
import { LoginPage } from './modules/auth/pages/LoginPage';
import api from './shared/services/api';

// Code Splitting por módulos con carga diferida (lazy loading)
const ClientsPage = lazy(() => import('./modules/clients/pages/ClientsPage').then((m) => ({ default: m.ClientsPage })));
const SecurityPage = lazy(() => import('./modules/security/pages/SecurityPage').then((m) => ({ default: m.SecurityPage })));
const InventoryPage = lazy(() => import('./modules/inventory/pages/InventoryPage').then((m) => ({ default: m.InventoryPage })));
const OperationsPage = lazy(() => import('./modules/operations/pages/OperationsPage').then((m) => ({ default: m.OperationsPage })));
const ContractsPage = lazy(() => import('./modules/contracts/pages/ContractsPage').then((m) => ({ default: m.ContractsPage })));
const QuotationsPage = lazy(() => import('./modules/quotations/pages/QuotationsPage').then((m) => ({ default: m.QuotationsPage })));
const AvailabilityPage = lazy(() => import('./modules/availability/pages/AvailabilityPage').then((m) => ({ default: m.AvailabilityPage })));
const BillingDashboard = lazy(() => import('./modules/billing/pages/BillingDashboard').then((m) => ({ default: m.BillingDashboard })));
const MaintenanceDashboard = lazy(() => import('./modules/maintenance/pages/MaintenanceDashboard').then((m) => ({ default: m.MaintenanceDashboard })));
const AccountingDashboard = lazy(() => import('./modules/accounting/pages/AccountingDashboard').then((m) => ({ default: m.AccountingDashboard })));
const PublicQuotationRequest = lazy(() => import('./modules/quotations/pages/PublicQuotationRequest').then((m) => ({ default: m.PublicQuotationRequest })));
const PublicQuotationView = lazy(() => import('./modules/quotations/pages/PublicQuotationView').then((m) => ({ default: m.PublicQuotationView })));
const ForceChangePasswordPage = lazy(() => import('./modules/security/pages/ForceChangePasswordPage').then((m) => ({ default: m.ForceChangePasswordPage })));
const CommissionsPage = lazy(() => import('./modules/commissions/pages/CommissionsPage').then((m) => ({ default: m.CommissionsPage })));
const SalesDashboardPage = lazy(() => import('./modules/sales/pages/SalesDashboardPage').then((m) => ({ default: m.SalesDashboardPage })));
const AuditLogPage = lazy(() => import('./modules/auditoria/pages/AuditLogPage').then((m) => ({ default: m.AuditLogPage })));

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
  Trophy
} from 'lucide-react';

function App() {
  const [user, setUser] = useState<any>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [currentModule, setCurrentModule] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Error al cerrar sesión en el servidor:', e);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setCurrentModule(null);
    }
  };

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

  if (!user) {
    return <LoginPage onLoginSuccess={setUser} />;
  }

  // Intercepta cambio de contraseña obligatorio si es temporal
  if (user.requiereCambioPassword) {
    return (
      <Suspense fallback={<ModuleLoadingFallback />}>
        <ForceChangePasswordPage
          onSuccess={() => {
            const updatedUser = { ...user, requiereCambioPassword: false };
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
      allowedRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'FACTURACION', 'OPERACIONES', 'CONTABILIDAD'],
    },
    {
      id: 'inventory',
      nombre: 'Inventario y Maquinaria',
      descripcion: 'Control de maquinaria pesada, tarifas por hora/día, series y horómetros',
      icono: Layers,
      badgeColor: 'bg-[#1A73E8] text-white shadow-md shadow-[#1A73E8]/20',
      cardHover: 'hover:border-[#1A73E8]/40 hover:shadow-lg hover:shadow-[#1A73E8]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'MANTENIMIENTO'],
    },
    {
      id: 'availability',
      nombre: 'Disponibilidad y Reservas',
      descripcion: 'Calendario de ocupación y reservas de equipos en tiempo real',
      icono: Calendar,
      badgeColor: 'bg-[#37474F] text-white shadow-md shadow-[#37474F]/20',
      cardHover: 'hover:border-[#37474F]/40 hover:shadow-lg hover:shadow-[#37474F]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES'],
    },
    {
      id: 'quotations',
      nombre: 'Cotizaciones',
      descripcion: 'Presupuestos de renta comercial y autorizaciones de precio',
      icono: FileText,
      badgeColor: 'bg-[#C55500] text-white shadow-md shadow-[#C55500]/20',
      cardHover: 'hover:border-[#C55500]/40 hover:shadow-lg hover:shadow-[#C55500]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'COMERCIAL'],
    },
    {
      id: 'contracts',
      nombre: 'Contratos',
      descripcion: 'Formalización de contrato de arrendamiento y plan de cortes',
      icono: FileText,
      badgeColor: 'bg-[#37474F] text-white shadow-md shadow-[#37474F]/20',
      cardHover: 'hover:border-[#37474F]/40 hover:shadow-lg hover:shadow-[#37474F]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'FACTURACION'],
    },
    {
      id: 'operations',
      nombre: 'Operaciones (Despacho / Retorno)',
      descripcion: 'Despacho de equipos, inspección de salida, retornos y lecturas de horómetros',
      icono: Truck,
      badgeColor: 'bg-[#C55500] text-white shadow-md shadow-[#C55500]/20',
      cardHover: 'hover:border-[#C55500]/40 hover:shadow-lg hover:shadow-[#C55500]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'OPERACIONES', 'MANTENIMIENTO'],
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
      allowedRoles: ['ADMIN', 'GERENTE', 'MANTENIMIENTO', 'OPERACIONES'],
    },
    {
      id: 'audit',
      nombre: 'Bitácora de Auditoría',
      descripcion: 'Trazabilidad de actividades, cambios de datos e inicios de sesión',
      icono: Activity,
      badgeColor: 'bg-[#747780] text-white shadow-md shadow-[#747780]/20',
      cardHover: 'hover:border-[#747780]/40 hover:shadow-lg hover:shadow-[#747780]/5',
      allowedRoles: ['ADMIN'],
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
      allowedRoles: ['ADMIN'],
    },
    {
      id: 'sales',
      nombre: 'Supervisión y Ranking de Ventas',
      descripcion: 'Ranking de asesores comerciales, cotizaciones consolidadas y métricas de efectividad',
      icono: Trophy,
      badgeColor: 'bg-amber-600 text-white shadow-md shadow-amber-600/20',
      cardHover: 'hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5',
      allowedRoles: ['ADMIN', 'GERENTE'],
    }
  ];

  const ROLE_LABELS_ES: Record<string, string> = {
    ADMIN: 'ADMINISTRADOR',
    GERENTE: 'GERENCIA GENERAL',
    COMERCIAL: 'ASESOR COMERCIAL',
    FACTURACION: 'FACTURACIÓN Y CAJA',
    OPERACIONES: 'OPERACIONES Y TRANSPORTE',
    CONTABILIDAD: 'CONTABILIDAD',
    MANTENIMIENTO: 'MANTENIMIENTO Y TALLER',
  };

  const formatRoleBadge = (role: string) => ROLE_LABELS_ES[role.toUpperCase()] || role;

  // Normalizar los roles del usuario activo a un array en mayúsculas
  const userRoles: string[] = (user?.roles || []).map((r: any) => {
    if (typeof r === 'string') return r.toUpperCase();
    if (r?.nombre) return r.nombre.toUpperCase();
    if (r?.rol?.nombre) return r.rol.nombre.toUpperCase();
    return String(r).toUpperCase();
  });

  const isAdmin = userRoles.includes('ADMIN');

  // Filtrar exclusivamente los módulos autorizados para el rol del usuario conectado
  const visibleApps = apps.filter((app) => {
    if (isAdmin) return true;
    return app.allowedRoles.some((role) => userRoles.includes(role));
  });

  // Validar si el usuario tiene permiso para el módulo actualmente seleccionado
  const currentApp = apps.find((a) => a.id === currentModule);
  const isAuthorizedForCurrentModule =
    !currentModule ||
    isAdmin ||
    (currentApp && currentApp.allowedRoles.some((role) => userRoles.includes(role)));

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
              <Suspense fallback={<ModuleLoadingFallback />}>
                {currentModule === 'clients' ? (
                  <ClientsPage />
                ) : currentModule === 'security' ? (
                  <SecurityPage />
                ) : currentModule === 'quotations' ? (
                  <QuotationsPage />
                ) : currentModule === 'billing' ? (
                  <BillingDashboard canEditRepair={isAdmin || userRoles.includes('GERENTE')} canInvoiceDamage={isAdmin || userRoles.includes('GERENTE') || userRoles.includes('FACTURACION')} />
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
                ) : currentModule === 'sales' ? (
                  <SalesDashboardPage />
                ) : currentModule === 'audit' ? (
                  <AuditLogPage />
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
                  ? 'Acceso administrativo total a todos los módulos del sistema ERP'
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
                <p className="text-xs text-[#747780] font-medium">No cuentas con módulos asignados para tu rol. Contacta al Administrador.</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
