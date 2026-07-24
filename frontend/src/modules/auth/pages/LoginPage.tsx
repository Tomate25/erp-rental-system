import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormValues } from '../validators/login.validator';
import { loginUser } from '../services/auth.api';
import { Mail, Lock, Eye, EyeOff, Wrench, AlertTriangle, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setApiError(null);

    try {
      const response = await loginUser(data);
      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      onLoginSuccess(response.user);
    } catch (error: any) {
      if (error.response?.data?.message) {
        // En NestJS la estructura del error suele ser un array o string
        const errMsg = error.response.data.message;
        setApiError(Array.isArray(errMsg) ? errMsg[0] : errMsg);
      } else {
        setApiError('Ocurrió un error al intentar iniciar sesión. Por favor verifica tu conexión.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden px-4">
      {/* Elementos Decorativos de Fondo (Efecto brillo de gradiente industrial) */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-slate-500/10 blur-[120px] pointer-events-none" />

      {/* Caja de Login principal */}
      <div className="w-full max-w-md z-10">
        {/* Encabezado Logo del ERP */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 mb-4 animate-pulse">
            <Wrench className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            ERP RENTAL SYSTEM
          </h1>
          <p className="text-sm text-slate-400">
            Control de Maquinaria y Equipos de Construcción
          </p>
        </div>

        {/* Tarjeta de Formulario (Glassmorphism Premium) */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-slate-100 mb-6">
            Iniciar Sesión
          </h2>

          {/* Alerta de Error de la API */}
          {apiError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm mb-6 animate-shake">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Input Correo */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-5 h-5" />
                </div>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="ejemplo@rental.com"
                  className={`w-full pl-10 pr-4 py-3 bg-slate-950/60 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all ${
                    errors.email ? 'border-red-500/60 focus:ring-red-500/30' : 'border-slate-800'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 mt-1.5 ml-1">{errors.email.message}</p>
              )}
            </div>

            {/* Input Contraseña */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-3 bg-slate-950/60 border rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all ${
                    errors.password ? 'border-red-500/60 focus:ring-red-500/30' : 'border-slate-800'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1.5 ml-1">{errors.password.message}</p>
              )}
            </div>

            {/* Recordar datos / Contraseña perdida (Decorativo) */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0 focus:ring-offset-0"
                />
                <span>Recordarme</span>
              </label>
              <a href="#" className="hover:text-amber-500 transition-colors">
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Botón de Enviar con microanimación y estado cargando */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 transition-all hover:gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-5 h-5 shrink-0 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer legal */}
        <p className="text-center text-xs text-slate-600 mt-8">
          © {new Date().getFullYear()} Rental Machinery System. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
};
