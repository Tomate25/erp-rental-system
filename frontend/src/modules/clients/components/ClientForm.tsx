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

// Máscara inteligente para Cédula y RUC de Nicaragua (Ej. 001-111286-0060S)
const formatCedulaOrRuc = (val: string): string => {
  if (!val) return '';
  // Extraer únicamente alfanuméricos en mayúsculas
  const clean = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  
  if (clean.length < 3) {
    return clean;
  }
  if (clean.length === 3) {
    return `${clean}-`;
  }
  if (clean.length < 9) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  if (clean.length === 9) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}-`;
  }
  
  const part1 = clean.slice(0, 3);
  const part2 = clean.slice(3, 9);
  const part3 = clean.slice(9, 14); // Máximo 5 caracteres finales (4 números + 1 letra)
  return `${part1}-${part2}-${part3}`;
};

export const ClientForm: React.FC<ClientFormProps> = ({ initialData, onCancel, onSubmitSuccess }) => {
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isEditMode = !!initialData;

  const {
    register,
    handleSubmit,
    setValue,
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

  const cedulaRegister = register('cedula');
  const rfcRegister = register('rfc');

  const onSubmit = async (data: ClientFormValues) => {
    setIsLoading(true);
    setApiError(null);

    // Mapeo seguro y flexible (campos opcionales no estrictos)
    const rawLimite = data.limiteCredito;
    const parsedLimite =
      rawLimite !== '' && rawLimite !== null && rawLimite !== undefined && !isNaN(Number(rawLimite))
        ? Number(rawLimite)
        : undefined;

    const payload = {
      ...data,
      emailFacturacion: data.emailFacturacion === '' ? undefined : data.emailFacturacion,
      limiteCredito: parsedLimite,
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-6 rounded-3xl border border-[#E5E8EE] shadow-xs font-sans">
      <div className="border-b border-[#E5E8EE] pb-4 flex justify-between items-center">
        <div>
          <h3 className="text-base font-black text-[#1B1D22]">
            {isEditMode ? 'Editar Ficha de Cliente' : 'Registrar Nuevo Cliente'}
          </h3>
          <p className="text-xs text-[#747780] font-medium mt-0.5">
            Completa los datos del cliente comercial o particular.
          </p>
        </div>
      </div>

      {apiError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FDF2E9] border border-[#C55500]/20 text-[#C55500] text-xs">
          <AlertTriangle className="w-4 h-4 text-[#C55500] shrink-0 mt-0.5" />
          <span className="font-medium">{apiError}</span>
        </div>
      )}

      {/* Grid de Formulario */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {/* Nombre Comercial */}
        <div className="space-y-1.5 lg:col-span-2">
          <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
            Nombre / Razón Social <span className="text-[#C55500]">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#747780]">
              <Users className="w-4 h-4" />
            </div>
            <input
              type="text"
              {...register('nombre')}
              placeholder="Nombre del cliente o empresa"
              className={`precision-input pl-10 text-xs ${
                errors.nombre ? 'border-[#C55500] focus:ring-[#C55500]/10' : ''
              }`}
            />
          </div>
          {errors.nombre && <p className="text-[10px] text-[#C55500] font-medium mt-1">{errors.nombre.message}</p>}
        </div>

        {/* Cédula con Máscara Automática (ej. 001-111286-0060S) */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
            Cédula de Identidad
          </label>
          <input
            type="text"
            {...cedulaRegister}
            onChange={(e) => {
              const formatted = formatCedulaOrRuc(e.target.value);
              e.target.value = formatted;
              setValue('cedula', formatted, { shouldValidate: true });
              cedulaRegister.onChange(e);
            }}
            maxLength={16}
            placeholder="Ej. 001-111286-0060S"
            className="precision-input text-xs font-mono font-bold uppercase"
          />
          <span className="text-[9px] text-[#747780] block font-medium">Auto-formato: 001-XXXXXX-XXXXXL</span>
        </div>

        {/* RUC con Máscara Automática */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
            RUC Fiscal
          </label>
          <input
            type="text"
            {...rfcRegister}
            onChange={(e) => {
              const formatted = formatCedulaOrRuc(e.target.value);
              e.target.value = formatted;
              setValue('rfc', formatted, { shouldValidate: true });
              rfcRegister.onChange(e);
            }}
            maxLength={16}
            placeholder="Ej. J0310000000000 / 001-..."
            className="precision-input text-xs font-mono font-bold uppercase"
          />
        </div>

        {/* Correo */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
            Correo Facturación
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#747780]">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              {...register('emailFacturacion')}
              placeholder="cliente@empresa.com"
              className={`precision-input pl-10 text-xs ${
                errors.emailFacturacion ? 'border-[#C55500] focus:ring-[#C55500]/10' : ''
              }`}
            />
          </div>
          {errors.emailFacturacion && <p className="text-[10px] text-[#C55500] font-medium mt-1">{errors.emailFacturacion.message}</p>}
        </div>

        {/* Vendedor */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
            Vendedor Asignado
          </label>
          <input
            type="text"
            {...register('vendedor')}
            placeholder="Nombre del asesor"
            className="precision-input text-xs font-bold"
          />
        </div>

        {/* Dirección */}
        <div className="space-y-1.5 lg:col-span-3">
          <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
            Dirección Completa
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 pt-2.5 pointer-events-none text-[#747780]">
              <MapPin className="w-4 h-4" />
            </div>
            <textarea
              {...register('direccion')}
              rows={2}
              placeholder="Dirección fiscal o de entrega"
              className="precision-input pl-10 text-xs resize-none"
            />
          </div>
        </div>

        {/* Telf Movistar */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
            Telf. Movistar
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#747780]">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="text"
              {...register('telMovistar')}
              placeholder="8888-8888"
              className="precision-input pl-10 text-xs"
            />
          </div>
        </div>

        {/* Telf Claro */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
            Tel. Claro
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#747780]">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="text"
              {...register('telClaro')}
              placeholder="8888-8888"
              className="precision-input pl-10 text-xs"
            />
          </div>
        </div>

        {/* Telf Convencional */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
            Tel. Convencional
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#747780]">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="text"
              {...register('telConvencional')}
              placeholder="2222-2222"
              className="precision-input pl-10 text-xs"
            />
          </div>
        </div>

        {/* Límite de Crédito */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
            Límite de Crédito ($)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#747780]">
              <DollarSign className="w-4 h-4" />
            </div>
            <input
              type="number"
              step="any"
              {...register('limiteCredito')}
              placeholder="Ej. 5000"
              className="precision-input pl-10 text-xs font-bold text-[#C55500]"
            />
          </div>
        </div>

        {/* Condición de Pago */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-extrabold text-[#747780] uppercase tracking-wider">
            Condición de Pago
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#747780]">
              <CreditCard className="w-4 h-4" />
            </div>
            <input
              type="text"
              {...register('condicionPago')}
              placeholder="Ej. Contado / 30 Días"
              className="precision-input pl-10 text-xs font-bold"
            />
          </div>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="pt-6 border-t border-[#E5E8EE] flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="btn-precision-outline"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="btn-precision-primary min-w-[130px]"
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
