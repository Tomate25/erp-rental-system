import React, { useState } from 'react';
import { X, Building2 } from 'lucide-react';
import type { Provider, CreateProviderPayload, TipoProveedor } from '../types/provider.types';
import { createProvider, updateProvider } from '../services/providers.api';

interface ProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  providerToEdit?: Provider | null;
}

export const ProviderModal: React.FC<ProviderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  providerToEdit,
}) => {
  const isEditing = Boolean(providerToEdit);

  const [formData, setFormData] = useState<CreateProviderPayload>({
    nombre: providerToEdit?.nombre || '',
    razonSocial: providerToEdit?.razonSocial || '',
    identificacion: providerToEdit?.identificacion || '',
    telefono: providerToEdit?.telefono || '',
    email: providerToEdit?.email || '',
    direccion: providerToEdit?.direccion || '',
    contacto: providerToEdit?.contacto || '',
    tipo: providerToEdit?.tipo || 'MAQUINARIA_EXTERNA',
    condicionPago: providerToEdit?.condicionPago || 'CONTADO',
    plazoCreditoDias: providerToEdit?.plazoCreditoDias || 0,
    notas: providerToEdit?.notas || '',
    activo: providerToEdit?.activo ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setError('El nombre comercial del proveedor es requerido.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditing && providerToEdit) {
        await updateProvider(providerToEdit.id, formData);
      } else {
        await createProvider(formData);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar el proveedor.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-900 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                {isEditing ? 'Editar Proveedor' : 'Registrar Nuevo Proveedor'}
              </h2>
              <p className="text-xs text-slate-500">
                Gestión de proveedores para maquinaria externa, insumos y talleres
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Nombre Comercial <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej. Maquinter S.A., Ferretería Jenny, Taller El Amigo"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Razón Social / Nombre Legal
              </label>
              <input
                type="text"
                value={formData.razonSocial || ''}
                onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                placeholder="Ej. Maquinarias Internacionales S.A."
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Identificación Fiscal (RUC o Cédula)
              </label>
              <input
                type="text"
                value={formData.identificacion || ''}
                onChange={(e) => setFormData({ ...formData, identificacion: e.target.value })}
                placeholder="Ej. J0310000123456"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Tipo de Proveedor <span className="text-rose-600">*</span>
              </label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoProveedor })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="MAQUINARIA_EXTERNA">Maquinaria Externa (Subalquiler / Préstamo)</option>
                <option value="INSUMOS_Y_REPUESTOS">Insumos y Repuestos (Aceites, filtros, partes)</option>
                <option value="SERVICIOS_TALLER">Servicios de Taller (Torno, mecánica externa)</option>
                <option value="GENERAL">General / Varios</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Persona de Contacto
              </label>
              <input
                type="text"
                value={formData.contacto || ''}
                onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                placeholder="Ej. Ing. Carlos Mendoza"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Teléfono de Contacto
              </label>
              <input
                type="text"
                value={formData.telefono || ''}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="Ej. 8888-8888 / 2222-2222"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ventas@proveedor.com"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Dirección Física
              </label>
              <input
                type="text"
                value={formData.direccion || ''}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                placeholder="Ej. Km 7.5 Carretera Norte, Managua"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Condición de Pago
              </label>
              <select
                value={formData.condicionPago || 'CONTADO'}
                onChange={(e) => setFormData({ ...formData, condicionPago: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="CONTADO">Contado</option>
                <option value="CREDITO">Crédito</option>
              </select>
            </div>

            {formData.condicionPago === 'CREDITO' && (
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Plazo de Crédito (Días)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.plazoCreditoDias || 0}
                  onChange={(e) => setFormData({ ...formData, plazoCreditoDias: Number(e.target.value) })}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Notas / Observaciones
              </label>
              <textarea
                rows={2}
                value={formData.notas || ''}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Condiciones comerciales especiales, cuentas bancarias, etc."
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="rounded text-blue-600 w-4 h-4"
                />
                Proveedor Activo en el Sistema
              </label>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Registrar Proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
