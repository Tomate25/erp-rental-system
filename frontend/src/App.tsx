import { useState } from 'react';
import { LoginPage } from './modules/auth/pages/LoginPage';
import { ClientsPage } from './modules/clients/pages/ClientsPage';
import { SecurityPage } from './modules/security/pages/SecurityPage';
import { InventoryPage } from './modules/inventory/pages/InventoryPage';
import { OperationsPage } from './modules/operations/pages/OperationsPage';
import { ContractsPage } from './modules/contracts/pages/ContractsPage';
import { QuotationsPage } from './modules/quotations/pages/QuotationsPage';
import { AvailabilityPage } from './modules/availability/pages/AvailabilityPage';
import { BillingDashboard } from './modules/billing/pages/BillingDashboard';
import { AccountingDashboard } from './modules/accounting/pages/AccountingDashboard';
import { PublicQuotationRequest } from './modules/quotations/pages/PublicQuotationRequest';
import { ForceChangePasswordPage } from './modules/security/pages/ForceChangePasswordPage';
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
  Calculator
} from 'lucide-react';

function App() {
  const [user, setUser] = useState<any>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [currentModule, setCurrentModule] = useState<string | null>(null);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentModule(null);
  };

  // Rutas públicas
  if (window.location.pathname === '/request-quote') {
    return <PublicQuotationRequest />;
  }

  if (!user) {
    return <LoginPage onLoginSuccess={setUser} />;
  }

  // Intercepta cambio de contraseña obligatorio si es temporal
  if (user.requiereCambioPassword) {
    return (
      <ForceChangePasswordPage
        onSuccess={() => {
          const updatedUser = { ...user, requiereCambioPassword: false };
          setUser(updatedUser);
        }}
      />
    );
  }

  // Módulos organizados en ESTRICTO ORDEN DE FLUJO OPERATIVO DE ALQUILER:
  // Control de Acceso Basado en Roles (RBAC): Cada módulo restringe su visibilidad a los roles autorizados.
  const apps = [
    {
      id: 'clients',
      paso: 'PASO 1',
      nombre: 'Clientes',
      descripcion: 'Directorio de empresas, contactos y registro de arrendatarios',
      icono: Users,
      badgeColor: 'bg-[#1A73E8] text-white shadow-md shadow-[#1A73E8]/20',
      cardHover: 'hover:border-[#1A73E8]/40 hover:shadow-lg hover:shadow-[#1A73E8]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'FACTURACION', 'OPERACIONES', 'CONTABILIDAD'],
    },
    {
      id: 'inventory',
      paso: 'PASO 2',
      nombre: 'Inventario y Maquinaria',
      descripcion: 'Control de maquinaria pesada, tarifas por hora/día, series y horómetros',
      icono: Layers,
      badgeColor: 'bg-[#1A73E8] text-white shadow-md shadow-[#1A73E8]/20',
      cardHover: 'hover:border-[#1A73E8]/40 hover:shadow-lg hover:shadow-[#1A73E8]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES', 'MANTENIMIENTO'],
    },
    {
      id: 'availability',
      paso: 'PASO 3',
      nombre: 'Disponibilidad y Reservas',
      descripcion: 'Calendario de ocupación y reservas de equipos en tiempo real',
      icono: Calendar,
      badgeColor: 'bg-[#37474F] text-white shadow-md shadow-[#37474F]/20',
      cardHover: 'hover:border-[#37474F]/40 hover:shadow-lg hover:shadow-[#37474F]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'OPERACIONES'],
    },
    {
      id: 'quotations',
      paso: 'PASO 4',
      nombre: 'Cotizaciones',
      descripcion: 'Presupuestos de renta comercial y autorizaciones de precio',
      icono: FileText,
      badgeColor: 'bg-[#C55500] text-white shadow-md shadow-[#C55500]/20',
      cardHover: 'hover:border-[#C55500]/40 hover:shadow-lg hover:shadow-[#C55500]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'COMERCIAL'],
    },
    {
      id: 'contracts',
      paso: 'PASO 5',
      nombre: 'Contratos',
      descripcion: 'Formalización de contrato de arrendamiento y plan de cortes',
      icono: FileText,
      badgeColor: 'bg-[#37474F] text-white shadow-md shadow-[#37474F]/20',
      cardHover: 'hover:border-[#37474F]/40 hover:shadow-lg hover:shadow-[#37474F]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'COMERCIAL', 'FACTURACION'],
    },
    {
      id: 'operations',
      paso: 'PASO 6',
      nombre: 'Operaciones (Despacho / Retorno)',
      descripcion: 'Despacho de equipos, inspección de salida, retornos y lecturas de horómetros',
      icono: Truck,
      badgeColor: 'bg-[#C55500] text-white shadow-md shadow-[#C55500]/20',
      cardHover: 'hover:border-[#C55500]/40 hover:shadow-lg hover:shadow-[#C55500]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'OPERACIONES', 'MANTENIMIENTO'],
    },
    {
      id: 'billing',
      paso: 'PASO 7',
      nombre: 'Facturación y Caja',
      descripcion: 'Emisión de facturas por cortes de contrato o cotizaciones y cobros',
      icono: Receipt,
      badgeColor: 'bg-[#C55500] text-white shadow-md shadow-[#C55500]/20',
      cardHover: 'hover:border-[#C55500]/40 hover:shadow-lg hover:shadow-[#C55500]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'FACTURACION', 'CONTABILIDAD'],
    },
    {
      id: 'accounting',
      paso: 'PASO 8',
      nombre: 'Contabilidad & Finanzas',
      descripcion: 'Balance General, Estado de Resultados, Cuentas por Cobrar y Pagar',
      icono: Calculator,
      badgeColor: 'bg-[#1B1D22] text-white shadow-md shadow-[#1B1D22]/20',
      cardHover: 'hover:border-[#1B1D22]/40 hover:shadow-lg hover:shadow-[#1B1D22]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'CONTABILIDAD'],
    },
    {
      id: 'maintenance',
      paso: 'PASO 9',
      nombre: 'Taller y Mantenimiento',
      descripcion: 'Servicios preventivos, correctivos y registro de averías/repuestos',
      icono: Wrench,
      badgeColor: 'bg-[#37474F] text-white shadow-md shadow-[#37474F]/20',
      cardHover: 'hover:border-[#37474F]/40 hover:shadow-lg hover:shadow-[#37474F]/5',
      allowedRoles: ['ADMIN', 'GERENTE', 'MANTENIMIENTO', 'OPERACIONES'],
    },
    {
      id: 'audit',
      paso: 'PASO 10',
      nombre: 'Bitácora de Auditoría',
      descripcion: 'Trazabilidad de actividades, cambios de datos e inicios de sesión',
      icono: Activity,
      badgeColor: 'bg-[#747780] text-white shadow-md shadow-[#747780]/20',
      cardHover: 'hover:border-[#747780]/40 hover:shadow-lg hover:shadow-[#747780]/5',
      allowedRoles: ['ADMIN', 'GERENTE'],
    },
    {
      id: 'security',
      paso: 'PASO 11',
      nombre: 'Seguridad y Roles',
      descripcion: 'Gestión de usuarios, permisos y credenciales de acceso',
      icono: Shield,
      badgeColor: 'bg-[#1B1D22] text-white shadow-md shadow-[#1B1D22]/20',
      cardHover: 'hover:border-[#1B1D22]/40 hover:shadow-lg hover:shadow-[#1B1D22]/5',
      allowedRoles: ['ADMIN'],
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

  return (
    <div className="min-h-screen bg-[#EFF3F8] text-[#1B1D22] flex flex-col font-sans relative overflow-hidden">
      
      {/* --- RENDER DEL MÓDULO ACTIVO --- */}
      {currentModule ? (
        <div className="flex-1 flex flex-col min-w-0 z-10 bg-[#EFF3F8] animate-fadeIn">
          
          {/* Header del Módulo Precision - Limpio, Sin Tabs Redundantes */}
          <header className="h-16 border-b border-[#E5E8EE] bg-white px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 shadow-sm z-20">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <button
                onClick={() => setCurrentModule(null)}
                className="p-2 rounded-xl bg-[#F4F6F9] border border-[#E5E8EE] hover:bg-[#E8F0FE] text-[#37474F] hover:text-[#1A73E8] transition-all flex items-center gap-2 group font-semibold text-xs cursor-pointer shrink-0 shadow-xs"
                title="Regresar al panel de módulos"
              >
                <Grid className="w-4 h-4 text-[#1A73E8] transition-transform group-hover:rotate-90" />
                <span className="font-bold hidden sm:inline">Mis Módulos</span>
              </button>

              <div className="h-6 w-[1px] bg-[#E5E8EE] shrink-0" />
              
              <div className="flex items-center gap-2.5 min-w-0">
                {currentApp && (
                  <div className={`p-2 rounded-xl ${currentApp.badgeColor} shrink-0 hidden sm:flex`}>
                    <currentApp.icono className="w-4 h-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-[#1B1D22] tracking-tight truncate">
                      {currentApp?.nombre || currentModule}
                    </span>
                    {currentApp?.paso && (
                      <span className="hidden md:inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-[#F4F6F9] text-[#747780] border border-[#E5E8EE]">
                        {currentApp.paso}
                      </span>
                    )}
                  </div>
                  {currentApp?.descripcion && (
                    <p className="text-[10px] text-[#747780] font-medium truncate hidden lg:block">
                      {currentApp.descripcion}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <div className="hidden md:flex items-center gap-2 text-[#747780] text-xs">
                <MapPin className="w-4 h-4 text-[#1A73E8]" />
                <span className="font-semibold text-[#37474F]">Sucursal Managua</span>
              </div>
              <div className="h-5 w-[1px] bg-[#E5E8EE] hidden md:block" />
              
              {/* Perfil del Usuario Activo */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#E8F0FE] text-[#1A73E8] flex items-center justify-center font-black text-xs border border-[#1A73E8]/20 shrink-0">
                  {user.nombre?.[0] || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-extrabold text-[#1B1D22] leading-tight">{user.nombre} {user.apellido}</p>
                  <span className="text-[9px] font-extrabold text-[#1A73E8] tracking-wider block uppercase leading-none mt-0.5">
                    {userRoles.map(formatRoleBadge).join(' • ')}
                  </span>
                </div>
              </div>

              <div className="h-5 w-[1px] bg-[#E5E8EE]" />

              {/* Botón de Cerrar Sesión Accesible en Todos los Módulos */}
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-[#747780] hover:text-[#C55500] hover:bg-[#FDF2E9] border border-transparent hover:border-[#C55500]/20 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline">Salir</span>
              </button>
            </div>
          </header>

          {/* Contenedor Principal del Módulo con Validación de Acceso */}
          <main className="flex-1 p-4 sm:p-8">
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
            ) : currentModule === 'clients' ? (
              <ClientsPage />
            ) : currentModule === 'security' ? (
              <SecurityPage />
            ) : currentModule === 'quotations' ? (
              <QuotationsPage />
            ) : currentModule === 'billing' ? (
              <BillingDashboard />
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
                  <span className="text-[9px] font-extrabold text-[#C55500] tracking-wider block uppercase leading-none mt-0.5">
                    {userRoles.map(formatRoleBadge).join(' • ')}
                  </span>
                </div>
              </div>
              <div className="h-5 w-[1px] bg-[#E5E8EE]" />
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-[#747780] hover:text-[#C55500] hover:bg-[#FDF2E9] transition-all cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Launcher Grid Central Exclusivamente con Módulos Autorizados */}
          <main className="flex-1 flex flex-col justify-center items-center px-4 py-10 max-w-7xl mx-auto w-full">
            <div className="text-center mb-8">
              <span className="px-3.5 py-1 bg-[#E8F0FE] text-[#1A73E8] text-[11px] font-black rounded-full tracking-wider uppercase inline-block mb-3 border border-[#1A73E8]/20">
                Rol: {userRoles.join(' • ')}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#1B1D22] tracking-tight mb-1.5">
                {isAdmin ? 'Panel General de Módulos ERP' : 'Mis Módulos de Gestión'}
              </h2>
              <p className="text-xs text-[#747780] font-medium max-w-lg mx-auto">
                {isAdmin
                  ? 'Acceso administrativo total a todos los procesos del flujo operativo de alquiler'
                  : `Mostrando los ${visibleApps.length} módulos autorizados para tu perfil operativo`}
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
                      onClick={() => setCurrentModule(app.id)}
                      className={`flex flex-col items-start p-6 rounded-3xl border border-[#E5E8EE] bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 group cursor-pointer ${app.cardHover}`}
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
