import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../../shared/services/api';
import { Lock, Eye, EyeOff, ShieldAlert, Check } from 'lucide-react';

const changePasswordSchema = z
  .object({
    password: z.string().min(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' }),
    confirmPassword: z.string().min(6, { message: 'La confirmación es requerida' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

interface ForceChangePasswordPageProps {
  onSuccess: () => void;
}

export const ForceChangePasswordPage: React.FC<ForceChangePasswordPageProps> = ({ onSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setIsLoading(true);
    setApiError(null);
    try {
      await api.post('/users/change-password', { newPassword: data.password });
      
      // Actualizar el estado de usuario en localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      user.requiereCambioPassword = false;
      localStorage.setItem('user', JSON.stringify(user));

      onSuccess();
    } catch (err: any) {
      setApiError(err.response?.data?.message || 'Error al intentar actualizar la contraseña. Reintenta.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden px-4">
      {/* Luces decorativas */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-100/30 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-slate-200/40 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        
        {/* Encabezado */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-600 mb-3 shadow-sm">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
            Cambio Obligatorio de Contraseña
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
            Iniciaste sesión con una contraseña temporal de administrador. Por seguridad, debes actualizarla para poder entrar al sistema.
          </p>
        </div>

        {/* Tarjeta */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/50 space-y-6">
          
          {apiError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[11px]">
              <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Contraseña Nueva */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Nueva Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="Mínimo 6 caracteres"
                  className={`w-full pl-9 pr-10 py-2 bg-slate-50/50 border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                    errors.password ? 'border-red-300' : 'border-slate-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[10px] text-red-600 mt-1">{errors.password.message}</p>}
            </div>

            {/* Confirmar Contraseña */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Confirmar Nueva Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  placeholder="Repite la contraseña"
                  className={`w-full pl-9 pr-10 py-2 bg-slate-50/50 border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                    errors.confirmPassword ? 'border-red-300' : 'border-slate-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-[10px] text-red-600 mt-1">{errors.confirmPassword.message}</p>}
            </div>

            {/* Botón de Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Establecer Contraseña</span>
                </>
              )}
            </button>

          </form>

        </div>

      </div>
    </div>
  );
};
