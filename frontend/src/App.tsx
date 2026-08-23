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
  // 1. Clientes -> 2. Inventario -> 3. Disponibilidad -> 4. Cotizaciones -> 5. Contratos -> 6. Operaciones -> 7. Facturación -> 8. Contabilidad -> 9. Mantenimiento -> 10. Auditoría -> 11. Seguridad
  const apps = [
    {
      id: 'clients',
      paso: 'PASO 1',
      nombre: 'Clientes',
      descripcion: 'Directorio de empresas, contactos y registro de arrendatarios',
      icono: Users,
      badgeColor: 'bg-[#1A73E8] text-white shadow-md shadow-[#1A73E8]/20',
      cardHover: 'hover:border-[#1A73E8]/40 hover:shadow-lg hover:shadow-[#1A73E8]/5'
    },
    {
      id: 'inventory',
      paso: 'PASO 2',
      nombre: 'Inventario',
      descripcion: 'Control de maquinaria pesada, tarifas por hora/día, series y horómetros',
      icono: Layers,
      badgeColor: 'bg-[#1A73E8] text-white shadow-md shadow-[#1A73E8]/20',
      cardHover: 'hover:border-[#1A73E8]/40 hover:shadow-lg hover:shadow-[#1A73E8]/5'
    },
    {
      id: 'availability',
      paso: 'PASO 3',
      nombre: 'Disponibilidad y Reservas',
      descripcion: 'Calendario de ocupación y reservas de equipos en tiempo real',
      icono: Calendar,
      badgeColor: 'bg-[#37474F] text-white shadow-md shadow-[#37474F]/20',
      cardHover: 'hover:border-[#37474F]/40 hover:shadow-lg hover:shadow-[#37474F]/5'
    },
    {
      id: 'quotations',
      paso: 'PASO 4',
      nombre: 'Cotizaciones',
      descripcion: 'Presupuestos de renta comercial y autorizaciones de precio',
      icono: FileText,
      badgeColor: 'bg-[#C55500] text-white shadow-md shadow-[#C55500]/20',
      cardHover: 'hover:border-[#C55500]/40 hover:shadow-lg hover:shadow-[#C55500]/5'
    },
    {
      id: 'contracts',
      paso: 'PASO 5',
      nombre: 'Contratos',
      descripcion: 'Formalización de contrato de arrendamiento y plan de cortes',
      icono: FileText,
      badgeColor: 'bg-[#37474F] text-white shadow-md shadow-[#37474F]/20',
      cardHover: 'hover:border-[#37474F]/40 hover:shadow-lg hover:shadow-[#37474F]/5'
    },
    {
      id: 'operations',
      paso: 'PASO 6',
      nombre: 'Operaciones (Despacho / Retorno)',
      descripcion: 'Despacho de equipos, inspección de salida, retornos y lecturas de horómetros',
      icono: Truck,
      badgeColor: 'bg-[#C55500] text-white shadow-md shadow-[#C55500]/20',
      cardHover: 'hover:border-[#C55500]/40 hover:shadow-lg hover:shadow-[#C55500]/5'
    },
    {
      id: 'billing',
      paso: 'PASO 7',
      nombre: 'Facturación',
      descripcion: 'Emisión de facturas por cortes de contrato o cotizaciones directas y cobros',
      icono: Receipt,
      badgeColor: 'bg-[#C55500] text-white shadow-md shadow-[#C55500]/20',
      cardHover: 'hover:border-[#C55500]/40 hover:shadow-lg hover:shadow-[#C55500]/5'
    },
    {
      id: 'accounting',
      paso: 'PASO 8',
      nombre: 'Contabilidad & Finanzas',
      descripcion: 'Balance General, Estado de Resultados, Cuentas por Cobrar y Pagar',
      icono: Calculator,
      badgeColor: 'bg-[#1B1D22] text-white shadow-md shadow-[#1B1D22]/20',
      cardHover: 'hover:border-[#1B1D22]/40 hover:shadow-lg hover:shadow-[#1B1D22]/5'
    },
    {
      id: 'maintenance',
      paso: 'PASO 9',
      nombre: 'Mantenimiento',
      descripcion: 'Servicios preventivos, correctivos y registro de averías/repuestos',
      icono: Wrench,
      badgeColor: 'bg-[#37474F] text-white shadow-md shadow-[#37474F]/20',
      cardHover: 'hover:border-[#37474F]/40 hover:shadow-lg hover:shadow-[#37474F]/5'
    },
    {
      id: 'audit',
      paso: 'PASO 10',
      nombre: 'Auditoría (Logs)',
      descripcion: 'Trazabilidad de actividades, cambios de datos e inicios de sesión',
      icono: Activity,
      badgeColor: 'bg-[#747780] text-white shadow-md shadow-[#747780]/20',
      cardHover: 'hover:border-[#747780]/40 hover:shadow-lg hover:shadow-[#747780]/5'
    },
    {
      id: 'security',
      paso: 'PASO 11',
      nombre: 'Seguridad y Roles',
      descripcion: 'Gestión de usuarios, permisos y credenciales de acceso',
      icono: Shield,
      badgeColor: 'bg-[#1B1D22] text-white shadow-md shadow-[#1B1D22]/20',
      cardHover: 'hover:border-[#1B1D22]/40 hover:shadow-lg hover:shadow-[#1B1D22]/5'
    }
  ];

  return (
    <div className="min-h-screen bg-[#EFF3F8] text-[#1B1D22] flex flex-col font-sans relative overflow-hidden">
      
      {/* --- RENDER DEL MÓDULO ACTIVO --- */}
      {currentModule ? (
        <div className="flex-1 flex flex-col min-w-0 z-10 bg-[#EFF3F8] animate-fadeIn">
          
          {/* Header del Módulo Precision */}
          <header className="h-16 border-b border-[#E5E8EE] bg-white px-4 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 shadow-sm z-20">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={() => setCurrentModule(null)}
                className="p-2 rounded-xl bg-[#F4F6F9] border border-[#E5E8EE] hover:bg-[#E8F0FE] text-[#37474F] hover:text-[#1A73E8] transition-all flex items-center gap-2 group font-semibold text-xs cursor-pointer"
                title="Regresar al panel de aplicaciones"
              >
                <Grid className="w-4 h-4 text-[#1A73E8] transition-transform group-hover:rotate-90" />
                <span className="font-bold">Aplicaciones</span>
              </button>

              <div className="h-6 w-[1px] bg-[#E5E8EE]" />
              
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-[#1B1D22] capitalize tracking-tight">{currentModule}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-[#747780] text-xs">
                <MapPin className="w-4 h-4 text-[#1A73E8]" />
                <span className="font-semibold text-[#37474F]">Sucursal Principal Managua</span>
              </div>
            </div>
          </header>

          {/* Contenedor Principal del Módulo */}
          <main className="flex-1 p-4 sm:p-8">
            {currentModule === 'clients' ? (
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
                <h2 className="text-xl font-black text-[#1B1D22] capitalize tracking-tight mb-2">
                  Módulo de {currentModule}
                </h2>
                <p className="text-xs text-[#747780] max-w-md mx-auto leading-relaxed mb-6">
                  El diseño Precision Enterprise está listo para recibir la implementación lógica y componentes avanzados de este módulo.
                </p>
                <button
                  onClick={() => setCurrentModule(null)}
                  className="btn-precision-primary cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver al Panel Principal
                </button>
              </div>
            )}
          </main>
        </div>
      ) : (
        // --- APP LAUNCHER CENTRAL (TEMA PRECISION ENTERPRISE EN ORDEN OPERATIVO) ---
        <div className="flex-1 flex flex-col min-w-0 z-10 animate-fadeIn">
          
          {/* Header del Launcher */}
          <header className="h-16 border-b border-[#E5E8EE] bg-white px-4 sm:px-8 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#1A73E8] flex items-center justify-center shadow-md shadow-[#1A73E8]/20">
                <Grid className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="font-black text-sm tracking-wide text-[#1B1D22]">BM CONSTRUCCIONES</h1>
                <span className="text-[10px] text-[#747780] font-semibold tracking-wider block uppercase leading-none">Precision Enterprise ERP</span>
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
                  <span className="text-[9px] font-extrabold text-[#C55500] tracking-wider block uppercase leading-none mt-0.5">{user.roles[0]}</span>
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

          {/* Launcher Grid Central Ordenado por Flujo Operativo */}
          <main className="flex-1 flex flex-col justify-center items-center px-4 py-10 max-w-7xl mx-auto w-full">
            <div className="text-center mb-8">
              <span className="px-3.5 py-1 bg-[#E8F0FE] text-[#1A73E8] text-[11px] font-black rounded-full tracking-wider uppercase inline-block mb-3 border border-[#1A73E8]/20">
                Flujo Operativo de Alquiler de Equipos
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#1B1D22] tracking-tight mb-1.5">Panel de Módulos</h2>
              <p className="text-xs text-[#747780] font-medium max-w-lg mx-auto">
                Los módulos están organizados en el orden secuencial del proceso operativo de arrendamiento
              </p>
            </div>

            {/* Grid de Tarjetas de Aplicación en Orden Operativo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 w-full">
              {apps.map((app) => {
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
          </main>
        </div>
      )}
    </div>
  );
}

export default App;
