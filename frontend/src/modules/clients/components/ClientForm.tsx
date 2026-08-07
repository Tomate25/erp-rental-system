import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { clientSchema } from '../validators/client.validator';
import type { ClientFormValues } from '../validators/client.validator';
import type { Client } from '../types/client.types';
import { createClient, updateClient } from '../services/clients.api';
import { Users, Phone, MapPin, Mail, AlertTriangle, CreditCard, DollarSign } from 'lucide-react';

interface ClientFormProps {
  initialData?: Client | null;
  onCancel: () => void;
  onSubmitSuccess: () => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({ initialData, onCancel, onSubmitSuccess }) => {
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isEditMode = !!initialData;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      numeroCliente: initialData?.numeroCliente || '',
      nombre: initialData?.nombre || '',
      cedula: initialData?.cedula || '',
      rfc: initialData?.rfc || '',
      vendedor: initialData?.vendedor || '',
      direccion: initialData?.direccion || '',
      emailFacturacion: initialData?.emailFacturacion || '',
      telMovistar: initialData?.telMovistar || '',
      telClaro: initialData?.telClaro || '',
      telConvencional: initialData?.telConvencional || '',
      limiteCredito: initialData?.limiteCredito || null,
      condicionPago: initialData?.condicionPago || '',
      whatsappHabilitado: initialData?.whatsappHabilitado || false,
    },
  });

  const onSubmit = async (data: ClientFormValues) => {
    setIsLoading(true);
    setApiError(null);

    // Mapeo seguro
    const payload = {
      ...data,
      emailFacturacion: data.emailFacturacion === '' ? undefined : data.emailFacturacion,
    };

    try {
      if (isEditMode && initialData) {
        await updateClient(initialData.id, payload);
      } else {
        await createClient(payload);
      }
      onSubmitSuccess();
    } catch (error: any) {
      if (error.response?.data?.message) {
        const errMsg = error.response.data.message;
        setApiError(Array.isArray(errMsg) ? errMsg[0] : errMsg);
      } else {
        setApiError('Ocurrió un error al procesar el cliente. Por favor verifica los datos.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200">
      <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {isEditMode ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Completa los datos del cliente según el formato requerido.
          </p>
        </div>
      </div>

      {apiError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span>{apiError}</span>
        </div>
      )}

      {/* Grid de Formulario */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Nombre Comercial */}
        <div className="space-y-1.5 lg:col-span-2">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Nombre <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Users className="w-4 h-4" />
            </div>
            <input
              type="text"
              {...register('nombre')}
              placeholder="Nombre del cliente"
              className={`w-full pl-9 pr-4 py-2 bg-white border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                errors.nombre ? 'border-red-300 focus:ring-red-500/10' : 'border-slate-200'
              }`}
            />
          </div>
          {errors.nombre && <p className="text-[10px] text-red-600 mt-1">{errors.nombre.message}</p>}
        </div>

        {/* Cédula */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Cédula
          </label>
          <input
            type="text"
            {...register('cedula')}
            placeholder="Cédula de identidad"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
          />
        </div>

        {/* RUC */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Ruc
          </label>
          <input
            type="text"
            {...register('rfc')}
            placeholder="RUC"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
          />
        </div>

        {/* Correo */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Correo
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              {...register('emailFacturacion')}
              placeholder="Opcional"
              className={`w-full pl-9 pr-4 py-2 bg-white border rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                errors.emailFacturacion ? 'border-red-300 focus:ring-red-500/10' : 'border-slate-200'
              }`}
            />
          </div>
          {errors.emailFacturacion && <p className="text-[10px] text-red-600 mt-1">{errors.emailFacturacion.message}</p>}
        </div>

        {/* Vendedor */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Vendedor
          </label>
          <input
            type="text"
            {...register('vendedor')}
            placeholder="Nombre del vendedor"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
          />
        </div>

        {/* Dirección */}
        <div className="space-y-1.5 lg:col-span-3">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Dirección
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 pt-2.5 pointer-events-none text-slate-400">
              <MapPin className="w-4 h-4" />
            </div>
            <textarea
              {...register('direccion')}
              rows={2}
              placeholder="Dirección completa"
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all resize-none"
            />
          </div>
        </div>

        {/* Telf Movistar */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Telf. Movistar
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="text"
              {...register('telMovistar')}
              placeholder="Movistar"
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>
        </div>

        {/* Telf Claro */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Tel. Claro
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="text"
              {...register('telClaro')}
              placeholder="Claro"
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>
        </div>

        {/* Telf Convencional */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Tel. Convencional
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="text"
              {...register('telConvencional')}
              placeholder="Convencional"
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>
        </div>

        {/* Límite de Crédito */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Límite de Crédito
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <input
              type="number"
              step="any"
              {...register('limiteCredito')}
              placeholder="Monto"
              className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>
        </div>

        {/* Condición de Pago */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Condición de Pago
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <input
              type="text"
              {...register('condicionPago')}
              placeholder="Ej. 30 Días"
              className="w-full pl-9 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isEditMode ? (
            'Guardar Cambios'
          ) : (
            'Registrar Cliente'
          )}
        </button>
      </div>
    </form>
  );
};
