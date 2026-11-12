export type OrigenEquipo = 'PROPIO' | 'PROVEEDOR';

/** Estado de los campos de origen en alta y edición. El precio se guarda como texto para permitir vacío. */
export interface OrigenEquipoFormState {
  origenEquipo: OrigenEquipo;
  proveedorId?: string | null;
  proveedorNombre: string;
  precioProveedor: string;
  disponibleParaRenta: boolean;
}

export interface OrigenEquipoFieldErrors {
  proveedorNombre?: string;
  precioProveedor?: string;
}

/** Payload que entiende el DTO de equipos. PROPIO limpia proveedor y precio. */
export interface OrigenEquipoWrite {
  origenEquipo: OrigenEquipo;
  proveedorId?: string | null;
  proveedorNombre: string | null;
  precioProveedor: number | null;
  disponibleParaRenta: boolean;
}

export const emptyOrigenEquipoForm = (): OrigenEquipoFormState => ({
  origenEquipo: 'PROPIO',
  proveedorNombre: '',
  precioProveedor: '',
  disponibleParaRenta: true,
});

export const origenEquipoFormFromUnit = (unit: {
  origenEquipo?: OrigenEquipo | null;
  proveedorNombre?: string | null;
  precioProveedor?: number | null;
  disponibleParaRenta?: boolean | null;
}): OrigenEquipoFormState => ({
  origenEquipo: unit.origenEquipo === 'PROVEEDOR' ? 'PROVEEDOR' : 'PROPIO',
  proveedorNombre: unit.proveedorNombre ?? '',
  precioProveedor: unit.precioProveedor != null && Number.isFinite(Number(unit.precioProveedor))
    ? String(unit.precioProveedor)
    : '',
  disponibleParaRenta: unit.disponibleParaRenta !== false,
});

/**
 * PROVEEDOR exige nombre y el precio en córdobas que el proveedor cobra a BM.
 * PROPIO no valida esos campos: se ocultan y se limpian al guardar.
 */
export const validateOrigenEquipoForm = (state: OrigenEquipoFormState): OrigenEquipoFieldErrors => {
  if (state.origenEquipo !== 'PROVEEDOR') return {};

  const errors: OrigenEquipoFieldErrors = {};
  if (!state.proveedorNombre.trim()) {
    errors.proveedorNombre = 'El proveedor es requerido para equipos en subalquiler.';
  }

  const raw = state.precioProveedor.trim();
  if (!raw) {
    errors.precioProveedor = 'Indique el precio que cobra el proveedor.';
  } else {
    const precio = Number(raw);
    if (!Number.isFinite(precio)) {
      errors.precioProveedor = 'Indique el precio que cobra el proveedor.';
    } else if (precio < 0) {
      errors.precioProveedor = 'El precio del proveedor no puede ser negativo.';
    }
  }

  return errors;
};

export const origenEquipoFormHasErrors = (errors: OrigenEquipoFieldErrors): boolean =>
  Boolean(errors.proveedorNombre || errors.precioProveedor);

export const toOrigenEquipoWrite = (state: OrigenEquipoFormState): OrigenEquipoWrite => {
  if (state.origenEquipo !== 'PROVEEDOR') {
    return {
      origenEquipo: 'PROPIO',
      proveedorNombre: null,
      precioProveedor: null,
      disponibleParaRenta: state.disponibleParaRenta,
    };
  }

  const write: OrigenEquipoWrite = {
    origenEquipo: 'PROVEEDOR',
    proveedorNombre: state.proveedorNombre.trim(),
    precioProveedor: Number(state.precioProveedor),
    disponibleParaRenta: state.disponibleParaRenta,
  };
  if (state.proveedorId) {
    write.proveedorId = state.proveedorId;
  }
  return write;
};
