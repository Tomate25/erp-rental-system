import { useState } from 'react';
import { LoginPage } from './modules/auth/pages/LoginPage';
import { ClientsPage } from './modules/clients/pages/ClientsPage';
import { SecurityPage } from './modules/security/pages/SecurityPage';
import { InventoryPage } from './modules/inventory/pages/InventoryPage';
import { OperationsPage } from './modules/operations/pages/OperationsPage';
import { QuotationsPage } from './modules/quotations/pages/QuotationsPage';
import { AvailabilityPage } from './modules/availability/pages/AvailabilityPage';
import { BillingDashboard } from './modules/billing/pages/BillingDashboard';
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
  Receipt
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

  // Rutas públicas simples sin react-router
  if (window.location.pathname === '/request-quote') {
    return <PublicQuotationRequest />;
  }

  if (!user) {
    return <LoginPage onLoginSuccess={setUser} />;
  }

  // Interceptar cambio de contraseña obligatorio si es temporal
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

  // Definición de las aplicaciones con alto contraste visual (al estilo Odoo)
  // Cada módulo tiene un icono con color de fondo sólido brillante y un hover que colorea suavemente la tarjeta
  const apps = [
    {
      id: 'clients',
      nombre: 'Clientes',
      descripcion: 'Directorio de empresas, contactos y facturación',
      icono: Users,
      color: 'bg-blue-600 text-white shadow-md shadow-blue-500/20',
      cardHover: 'hover:border-blue-400 hover:shadow-blue-500/10 hover:bg-blue-50/10'
    },
    {
      id: 'quotations',
      nombre: 'Cotizaciones',
      descripcion: 'Presupuestos de renta y autorizaciones comerciales',
      icono: FileText,
      color: 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30',
      cardHover: 'hover:border-amber-400 hover:shadow-amber-500/10 hover:bg-amber-50/10'
    },
    {
      id: 'contracts',
      nombre: 'Contratos',
      descripcion: 'Generación, firma y control de contratos de renta',
      icono: FileText,
      color: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20',
      cardHover: 'hover:border-emerald-400 hover:shadow-emerald-500/10 hover:bg-emerald-50/10'
    },
    {
      id: 'inventory',
      nombre: 'Inventario',
      descripcion: 'Control de maquinaria pesada, series y horómetros',
      icono: Layers,
      color: 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20',
      cardHover: 'hover:border-indigo-400 hover:shadow-indigo-500/10 hover:bg-indigo-50/10'
    },
    {
      id: 'availability',
      nombre: 'Disponibilidad',
      descripcion: 'Calendario y reservas en tiempo real',
      icono: Calendar,
      color: 'bg-purple-600 text-white shadow-md shadow-purple-500/20',
      cardHover: 'hover:border-purple-400 hover:shadow-purple-500/10 hover:bg-purple-50/10'
    },
    {
      id: 'billing',
      nombre: 'Facturación',
      descripcion: 'Cortes, pagos y notas de crédito',
      icono: Receipt,
      color: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20',
      cardHover: 'hover:border-emerald-400 hover:shadow-emerald-500/10 hover:bg-emerald-50/10'
    },
    {
      id: 'operations',
      nombre: 'Operaciones',
      descripcion: 'Despacho de equipos, retornos e inspección de daños',
      icono: Truck,
      color: 'bg-rose-600 text-white shadow-md shadow-rose-500/20',
      cardHover: 'hover:border-rose-400 hover:shadow-rose-500/10 hover:bg-rose-50/10'
    },
    {
      id: 'maintenance',
      nombre: 'Mantenimiento',
      descripcion: 'Servicios preventivos, correctivos y consumibles',
      icono: Wrench,
      color: 'bg-teal-600 text-white shadow-md shadow-teal-500/20',
      cardHover: 'hover:border-teal-400 hover:shadow-teal-500/10 hover:bg-teal-50/10'
    },
    {
      id: 'audit',
      nombre: 'Auditoría (Logs)',
      descripcion: 'Registro de actividades de usuarios, cambios e inicios de sesión',
      icono: Activity,
      color: 'bg-orange-600 text-white shadow-md shadow-orange-500/20',
      cardHover: 'hover:border-orange-400 hover:shadow-orange-500/10 hover:bg-orange-50/10'
    },
    {
      id: 'security',
      nombre: 'Seguridad y Roles',
      descripcion: 'Gestión de usuarios, permisos y accesos',
      icono: Shield,
      color: 'bg-slate-700 text-white shadow-md shadow-slate-500/20',
      cardHover: 'hover:border-slate-400 hover:shadow-slate-500/10 hover:bg-slate-50/10'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans relative overflow-hidden">
      
      {/* Sutiles brillos decorativos claros */}
      <div className="absolute top-[-30%] left-[10%] w-[800px] h-[800px] rounded-full bg-blue-100/30 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-30%] right-[10%] w-[800px] h-[800px] rounded-full bg-slate-200/40 blur-[120px] pointer-events-none" />

      {/* --- RENDER DEL MÓDULO ACTIVO --- */}
      {currentModule ? (
        <div className="flex-1 flex flex-col min-w-0 z-10 bg-white animate-fadeIn">
          
          {/* Header del Módulo Claro */}
          <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 shadow-sm shadow-slate-100/50">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => setCurrentModule(null)}
                className="p-1.5 sm:p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all flex items-center gap-1.5 sm:gap-2 group"
                title="Regresar al menú de aplicaciones"
              >
                <Grid className="w-4 h-4 sm:w-4.5 sm:h-4.5 transition-transform group-hover:rotate-90" />
                <span className="text-xs font-bold pr-0.5">Apps</span>
              </button>

              <div className="h-6 w-[1px] bg-slate-200" />
              
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <span className="font-extrabold text-slate-800 capitalize">{currentModule}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-slate-500 text-xs">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-700">Sucursal Principal</span>
              </div>
            </div>
          </header>

          {/* Contenedor del Módulo Limpio (Tema Claro) */}
          <main className="flex-1 p-4 sm:p-8">
            {currentModule === 'clients' ? (
              <ClientsPage />
            ) : currentModule === 'security' ? (
              <SecurityPage />
            ) : currentModule === 'quotations' ? (
              <QuotationsPage />
            ) : currentModule === 'billing' ? (
              <BillingDashboard />
            ) : currentModule === 'availability' ? (
              <AvailabilityPage />
            ) : currentModule === 'inventory' ? (
              <InventoryPage />
            ) : currentModule === 'operations' ? (
              <OperationsPage />
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-2xl mx-auto mt-16 shadow-lg shadow-slate-200/50">
                <div className="p-4 rounded-full bg-slate-50 inline-flex items-center justify-center text-slate-400 mb-6 border border-slate-100">
                  <Grid className="w-9 h-9" />
                </div>
                <h2 className="text-xl font-black text-slate-900 capitalize tracking-tight mb-2">
                  Módulo de {currentModule}
                </h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mb-6">
                  El esqueleto de la aplicación está listo. El frontend está esperando que integremos los componentes y servicios locales para este módulo.
                </p>
                <button
                  onClick={() => setCurrentModule(null)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al Menú Principal
                </button>
              </div>
            )}
          </main>
        </div>
      ) : (
        // --- RENDER DEL APP LAUNCHER CENTRAL (TEMA CLARO TIPO ODOO) ---
        <div className="flex-1 flex flex-col min-w-0 z-10 animate-fadeIn">
          
          {/* Header del Launcher */}
          <header className="h-16 border-b border-slate-200 bg-white px-4 sm:px-8 flex items-center justify-between shrink-0 shadow-sm shadow-slate-100/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-sm">
                <Grid className="w-3.5 h-3.5 text-white" />
              </div>
              <h1 className="font-extrabold text-xs sm:text-sm tracking-wider text-slate-800">BM CONSTRUCCIONES</h1>
            </div>

            {/* Perfil del usuario / Cerrar sesión */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-slate-800">{user.nombre} {user.apellido}</p>
                  <span className="text-[9px] font-bold text-blue-600 tracking-wider block uppercase leading-none mt-0.5">{user.roles[0]}</span>
                </div>
              </div>
              <div className="h-5 w-[1px] bg-slate-200" />
              <button
                onClick={handleLogout}
                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Launcher Central Grid */}
          <main className="flex-1 flex flex-col justify-center items-center px-4 py-12 max-w-6xl mx-auto w-full">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Panel de Aplicaciones</h2>
              <p className="text-xs text-slate-500 font-medium">Selecciona el módulo del ERP al que deseas acceder</p>
            </div>

            {/* Grid de Aplicaciones (Tema Claro Odoo-style) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
              {apps.map((app) => {
                const IconComponent = app.icono;
                return (
                  <button
                    key={app.id}
                    onClick={() => setCurrentModule(app.id)}
                    className={`flex flex-col items-start p-6 rounded-3xl border border-slate-200/80 bg-white shadow-sm transition-all hover:scale-[1.03] hover:shadow-lg duration-300 group ${app.cardHover}`}
                  >
                    {/* Icono de la App con fondo de color distintivo vibrante */}
                    <div className={`p-4 rounded-2xl mb-4 shrink-0 transition-transform group-hover:-translate-y-1 ${app.color}`}>
                      <IconComponent className="w-6 h-6" />
                    </div>
                    {/* Contenido */}
                    <div className="space-y-1.5 w-full text-left">
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">{app.nombre}</h3>
                        <ChevronRight className="w-4 h-4 text-slate-400 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-normal">{app.descripcion}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
