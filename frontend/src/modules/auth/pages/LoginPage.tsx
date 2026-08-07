import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../validators/login.validator';
import type { LoginFormValues } from '../validators/login.validator';
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-100 via-blue-50/20 to-slate-50 relative overflow-hidden px-4">
      {/* Sutiles decoraciones de fondo claras */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-100/30 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-slate-200/40 blur-[100px] pointer-events-none" />

      {/* Caja de Login principal */}
      <div className="w-full max-w-md z-10">
        
        {/* Encabezado Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-600/10 border border-blue-600/20 text-blue-600 mb-3">
            <Wrench className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            BM CONSTRUCCIONES
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Gestión Integral de Maquinaria y Equipos
          </p>
        </div>

        {/* Tarjeta de Formulario (Limpia y Clara) */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
          <h2 className="text-lg font-bold text-slate-800 mb-6">
            Acceso al Portal
          </h2>

          {/* Alerta de Error */}
          {apiError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs mb-6">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Input Correo */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4.5 h-4.5" />
                </div>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="ejemplo@bmconstrucciones.com"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                    errors.email ? 'border-red-300 focus:ring-red-500/10' : 'border-slate-200'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-600 mt-1.5 ml-1">{errors.email.message}</p>
              )}
            </div>

            {/* Input Contraseña */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-2.5 bg-slate-50/50 border rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                    errors.password ? 'border-red-300 focus:ring-red-500/10' : 'border-slate-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600 mt-1.5 ml-1">{errors.password.message}</p>
              )}
            </div>

            {/* Recordar datos */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-blue-600 focus:ring-0 focus:ring-offset-0"
                />
                <span>Recordarme en este equipo</span>
              </label>
            </div>

            {/* Botón de Enviar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 transition-all hover:gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4.5 h-4.5 shrink-0 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400 mt-8">
          © {new Date().getFullYear()} BM Construcciones. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
};
