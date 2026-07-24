import { useState } from 'react';
import { LoginPage } from './modules/auth/pages/LoginPage';
import {
  Wrench,
  Users,
  FileText,
  Shield,
  Activity,
  Layers,
  Calendar,
  LogOut,
  User,
  MapPin,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Truck
} from 'lucide-react';

function App() {
  // Leer el usuario autenticado del localStorage para persistencia de sesión
  const [user, setUser] = useState<any>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (!user) {
    return <LoginPage onLoginSuccess={setUser} />;
  }

  // Dashboard de nivel profesional (Rich Aesthetics para el ERP)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans">
      
      {/* 1. Barra Lateral de Navegación (Sidebar) */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        {/* Encabezado Logo */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500 text-slate-950 font-bold">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wide text-white">RENTAL ERP</h1>
            <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Construction Suite</span>
          </div>
        </div>

        {/* Sección de Menú */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2">Módulos</span>
          
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-amber-500/10 text-amber-500 font-medium text-sm transition-all">
            <Activity className="w-4 h-4" />
            <span>Dashboard</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 font-medium text-sm transition-all">
            <Users className="w-4 h-4" />
            <span>Clientes</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 font-medium text-sm transition-all">
            <FileText className="w-4 h-4" />
            <span>Cotizaciones</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 font-medium text-sm transition-all">
            <Layers className="w-4 h-4" />
            <span>Inventario</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 font-medium text-sm transition-all">
            <Calendar className="w-4 h-4" />
            <span>Disponibilidad</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 font-medium text-sm transition-all">
            <Truck className="w-4 h-4" />
            <span>Operaciones</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 font-medium text-sm transition-all">
            <Wrench className="w-4 h-4" />
            <span>Mantenimiento</span>
          </a>

          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 pt-6 mb-2">Administración</span>
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-slate-100 font-medium text-sm transition-all">
            <Shield className="w-4 h-4" />
            <span>Seguridad (RBAC)</span>
          </a>
        </nav>

        {/* Info del usuario logueado en la parte inferior */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{user.nombre} {user.apellido}</p>
              <span className="text-[9px] font-bold text-amber-500 tracking-wider block truncate uppercase">{user.roles[0]}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* 2. Área de Contenido Principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Barra superior (Navbar) */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-8 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <MapPin className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-slate-300">Sucursal Central CDMX</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Base de Datos Conectada
            </div>
          </div>
        </header>

        {/* Panel de Control (Dashboard Main Content) */}
        <main className="flex-1 p-8 space-y-8">
          {/* Bienvenida */}
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">Panel de Control</h2>
            <p className="text-xs text-slate-400 mt-1">Bienvenido de nuevo, {user.nombre}. Resumen comercial y operativo del día.</p>
          </div>

          {/* Fila de Tarjetas de Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Tarjeta 1 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Equipos Rentados</span>
                <p className="text-2xl font-black text-white">42 / 50</p>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +12% esta semana
                </span>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl">
                <Truck className="w-6 h-6" />
              </div>
            </div>

            {/* Tarjeta 2 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Contratos Activos</span>
                <p className="text-2xl font-black text-white">18</p>
                <span className="text-[10px] text-slate-400 font-semibold block">5 en revisión comercial</span>
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
            </div>

            {/* Tarjeta 3 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">En Mantenimiento</span>
                <p className="text-2xl font-black text-white">4</p>
                <span className="text-[10px] text-red-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> 2 fallas correctivas
                </span>
              </div>
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                <Wrench className="w-6 h-6" />
              </div>
            </div>

            {/* Tarjeta 4 */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-lg">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Utilización Total</span>
                <p className="text-2xl font-black text-white">84%</p>
                <span className="text-[10px] text-emerald-400 font-semibold block">Meta mensual: 80%</span>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>

          </div>

          {/* Tabla de Equipos e Inventario */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-100 text-sm tracking-tight">Disponibilidad de Maquinaria Crítica</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Estado en tiempo real de los equipos más rentados de la sucursal.</p>
              </div>
              <button className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors">
                Ver Catálogo Completo
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
                    <th className="p-4">Equipo / Modelo</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">N/S</th>
                    <th className="p-4">Horómetro</th>
                    <th className="p-4">Precio Renta (Día)</th>
                    <th className="p-4 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 font-medium">
                  <tr>
                    <td className="p-4 font-bold text-slate-100">Excavadora Caterpillar 320D</td>
                    <td className="p-4">Excavación</td>
                    <td className="p-4 font-mono text-slate-500">CAT320D893</td>
                    <td className="p-4">1,450.5 hrs</td>
                    <td className="p-4 text-amber-500 font-bold">$3,500.00</td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold">RENTADO</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-slate-100">Retroexcavadora John Deere 310L</td>
                    <td className="p-4">Carga y Excavación</td>
                    <td className="p-4 font-mono text-slate-500">JD310L234</td>
                    <td className="p-4">840.2 hrs</td>
                    <td className="p-4 text-amber-500 font-bold">$2,800.00</td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">DISPONIBLE</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-slate-100">Compactador de Suelos Dynapac CA250</td>
                    <td className="p-4">Compactación</td>
                    <td className="p-4 font-mono text-slate-500">DYCA250112</td>
                    <td className="p-4">2,110.0 hrs</td>
                    <td className="p-4 text-amber-500 font-bold">$3,100.00</td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold">MANTENIMIENTO</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 font-bold text-slate-100">Plataforma de Tijera Genie GS-1930</td>
                    <td className="p-4">Elevación</td>
                    <td className="p-4 font-mono text-slate-500">GEGS193099</td>
                    <td className="p-4">320.0 hrs</td>
                    <td className="p-4 text-amber-500 font-bold">$1,200.00</td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">RESERVADO</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
