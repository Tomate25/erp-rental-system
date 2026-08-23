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
    <div className="min-h-screen flex items-center justify-center bg-[#EFF3F8] text-[#1B1D22] relative overflow-hidden px-4 font-sans">
      
      {/* Container de Login */}
      <div className="w-full max-w-md z-10">
        
        {/* Encabezado Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 rounded-2xl bg-[#1A73E8] text-white shadow-lg shadow-[#1A73E8]/20 mb-3">
            <Wrench className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-[#1B1D22]">
            BM CONSTRUCCIONES
          </h1>
          <p className="text-xs text-[#747780] font-semibold mt-1 uppercase tracking-wider">
            Precision Enterprise System
          </p>
        </div>

        {/* Tarjeta de Formulario (Precision Enterprise Theme) */}
        <div className="bg-white border border-[#E5E8EE] rounded-3xl p-8 shadow-xl shadow-slate-200/50">
          <h2 className="text-lg font-extrabold text-[#1B1D22] mb-6">
            Acceso al Portal
          </h2>

          {/* Alerta de Error */}
          {apiError && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FDF2E9] border border-[#C55500]/20 text-[#C55500] text-xs mb-6">
              <AlertTriangle className="w-4.5 h-4.5 text-[#C55500] shrink-0 mt-0.5" />
              <span className="font-medium">{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Input Correo */}
            <div>
              <label className="block text-[11px] font-extrabold text-[#747780] mb-1.5 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#747780]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="ejemplo@rental.com"
                  className={`w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border rounded-xl text-[#1B1D22] placeholder-[#747780] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8] transition-all text-sm ${
                    errors.email ? 'border-[#C55500] focus:ring-[#C55500]/10' : 'border-[#E5E8EE]'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-[#C55500] font-medium mt-1.5 ml-1">{errors.email.message}</p>
              )}
            </div>

            {/* Input Contraseña */}
            <div>
              <label className="block text-[11px] font-extrabold text-[#747780] mb-1.5 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#747780]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-2.5 bg-[#F8FAFC] border rounded-xl text-[#1B1D22] placeholder-[#747780] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8] transition-all text-sm ${
                    errors.password ? 'border-[#C55500] focus:ring-[#C55500]/10' : 'border-[#E5E8EE]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#747780] hover:text-[#1B1D22] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-[#C55500] font-medium mt-1.5 ml-1">{errors.password.message}</p>
              )}
            </div>

            {/* Recordar datos */}
            <div className="flex items-center justify-between text-xs text-[#747780] pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  className="rounded border-[#E5E8EE] text-[#1A73E8] focus:ring-0 focus:ring-offset-0"
                />
                <span>Recordarme en este equipo</span>
              </label>
            </div>

            {/* Botón de Enviar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-[#1A73E8] hover:bg-[#1557B0] active:bg-[#10458C] text-white font-bold rounded-xl shadow-lg shadow-[#1A73E8]/20 flex items-center justify-center gap-2 transition-all hover:gap-3 disabled:opacity-50 disabled:cursor-not-allowed group text-sm"
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
        <p className="text-center text-[11px] text-[#747780] font-medium mt-8">
          © {new Date().getFullYear()} BM Construcciones. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
};
