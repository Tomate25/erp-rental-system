import React from 'react';
import type { OrigenEquipoFieldErrors, OrigenEquipoFormState } from '../utils/origen-equipo-form';

interface OrigenEquipoFieldsProps {
  value: OrigenEquipoFormState;
  onChange: (next: OrigenEquipoFormState) => void;
  errors?: OrigenEquipoFieldErrors;
}

/** Campos densos de origen. Proveedor y precio solo se muestran en subalquiler. */
export const OrigenEquipoFields: React.FC<OrigenEquipoFieldsProps> = ({ value, onChange, errors }) => {
  const esProveedor = value.origenEquipo === 'PROVEEDOR';

  return (
    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
      <div>
        <span className="text-[11px] font-extrabold uppercase text-slate-700 block">Origen del equipo</span>
        <p className="text-[10px] text-slate-500 mt-0.5">
          Proveedor: préstamo o subalquiler. El precio es lo que el proveedor cobra a BM, en córdobas. No es la tarifa A, B o C al cliente.
        </p>
      </div>

      <div className={`grid grid-cols-1 ${esProveedor ? 'sm:grid-cols-2' : ''} gap-3`}>
        <div className={esProveedor ? 'sm:col-span-2' : undefined}>
          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Origen</label>
          <select
            value={value.origenEquipo}
            onChange={(e) => {
              const origenEquipo = e.target.value === 'PROVEEDOR' ? 'PROVEEDOR' : 'PROPIO';
              onChange({
                ...value,
                origenEquipo,
                proveedorNombre: origenEquipo === 'PROPIO' ? '' : value.proveedorNombre,
                precioProveedor: origenEquipo === 'PROPIO' ? '' : value.precioProveedor,
              });
            }}
            className="w-full text-xs px-2.5 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="PROPIO">Propio (flota BM)</option>
            <option value="PROVEEDOR">Proveedor (préstamo / subalquiler)</option>
          </select>
        </div>

        {esProveedor && (
          <>
            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Proveedor <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={value.proveedorNombre}
                onChange={(e) => onChange({ ...value, proveedorNombre: e.target.value })}
                placeholder="Nombre del proveedor"
                className={`w-full text-xs px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  errors?.proveedorNombre ? 'border-rose-400' : 'border-slate-300'
                }`}
              />
              {errors?.proveedorNombre && (
                <p className="text-[10px] text-rose-600 mt-1">{errors.proveedorNombre}</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                Precio del proveedor (C$) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={value.precioProveedor}
                onChange={(e) => onChange({ ...value, precioProveedor: e.target.value })}
                placeholder="0.00"
                className={`w-full font-mono text-xs px-3 py-2 rounded-xl border bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  errors?.precioProveedor ? 'border-rose-400' : 'border-slate-300'
                }`}
              />
              {errors?.precioProveedor && (
                <p className="text-[10px] text-rose-600 mt-1">{errors.precioProveedor}</p>
              )}
            </div>

          </>
        )}

        <div className={esProveedor ? 'sm:col-span-2' : undefined}>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <input
              type="checkbox"
              checked={value.disponibleParaRenta}
              onChange={(e) => onChange({ ...value, disponibleParaRenta: e.target.checked })}
              className="rounded text-blue-600 w-3.5 h-3.5"
            />
            Disponible para rentar
          </label>
          <p className="text-[10px] text-slate-500 mt-1">
            Si se desmarca, el equipo queda en inventario pero no entra a cotización ni contrato.
          </p>
        </div>
      </div>
    </div>
  );
};

interface OrigenProveedorNotaProps {
  origenEquipo?: 'PROPIO' | 'PROVEEDOR' | null;
  proveedorNombre?: string | null;
  precioProveedor?: number | null;
  disponibleParaRenta?: boolean | null;
  className?: string;
}

/** Línea densa para el expandido y la ficha. Solo cuando el origen es de proveedor. */
export const OrigenProveedorNota: React.FC<OrigenProveedorNotaProps> = ({
  origenEquipo,
  proveedorNombre,
  precioProveedor,
  disponibleParaRenta,
  className,
}) => {
  if (origenEquipo !== 'PROVEEDOR') return null;
  const precio =
    precioProveedor != null && Number.isFinite(Number(precioProveedor))
      ? `C$ ${Number(precioProveedor).toLocaleString('es-NI')}`
      : 'Sin precio';
  const renta = disponibleParaRenta === false ? 'No disponible para rentar' : 'Disponible para rentar';
  const nombre = proveedorNombre?.trim() || 'Sin nombre';

  return (
    <span className={className ?? 'block text-[10px] leading-tight text-slate-600'}>
      <span className="font-bold text-slate-800">Proveedor · {nombre}</span>
      <span className="block">
        {precio} · {renta}
      </span>
    </span>
  );
};
