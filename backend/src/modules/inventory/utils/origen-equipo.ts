import { BadRequestException } from '@nestjs/common';
import { OrigenEquipo } from '@prisma/client';

export interface OrigenEquipoInput {
  origenEquipo?: OrigenEquipo | null;
  proveedorId?: string | null;
  proveedorNombre?: string | null;
  precioProveedor?: number | null;
  disponibleParaRenta?: boolean | null;
}

export interface OrigenEquipoResolved {
  origenEquipo: OrigenEquipo;
  proveedorId?: string | null;
  proveedorNombre: string | null;
  precioProveedor: number | null;
  disponibleParaRenta: boolean;
}

/**
 * Normaliza el origen del equipo.
 * PROPIO limpia proveedor y precio (no aplican).
 * PROVEEDOR exige nombre y el precio que cobra el proveedor.
 * En edición, los campos omitidos se heredan del registro actual.
 */
export function resolveOrigenEquipo(
  input: OrigenEquipoInput,
  actual?: OrigenEquipoResolved | null,
): OrigenEquipoResolved {
  const origen = input.origenEquipo ?? actual?.origenEquipo ?? OrigenEquipo.PROPIO;
  const disponibleParaRenta =
    input.disponibleParaRenta ?? actual?.disponibleParaRenta ?? true;

  if (origen === OrigenEquipo.PROVEEDOR) {
    const nombreRaw =
      input.proveedorNombre !== undefined
        ? input.proveedorNombre
        : actual?.proveedorNombre;
    const proveedorNombre = (nombreRaw ?? '').trim();
    const precio =
      input.precioProveedor !== undefined
        ? input.precioProveedor
        : actual?.precioProveedor;

    if (!proveedorNombre) {
      throw new BadRequestException(
        'Indique el proveedor del equipo en subalquiler.',
      );
    }
    if (precio === null || precio === undefined || Number.isNaN(Number(precio))) {
      throw new BadRequestException('Indique el precio que cobra el proveedor.');
    }
    if (Number(precio) < 0) {
      throw new BadRequestException('El precio del proveedor no puede ser negativo.');
    }

    const resolved: OrigenEquipoResolved = {
      origenEquipo: OrigenEquipo.PROVEEDOR,
      proveedorNombre,
      precioProveedor: Number(precio),
      disponibleParaRenta,
    };

    if (input.proveedorId !== undefined || actual?.proveedorId !== undefined) {
      resolved.proveedorId =
        input.proveedorId !== undefined
          ? input.proveedorId
          : actual?.proveedorId ?? null;
    }

    return resolved;
  }

  const resolved: OrigenEquipoResolved = {
    origenEquipo: OrigenEquipo.PROPIO,
    proveedorNombre: null,
    precioProveedor: null,
    disponibleParaRenta,
  };

  if (input.proveedorId !== undefined || actual?.proveedorId !== undefined) {
    resolved.proveedorId = null;
  }

  return resolved;
}

/** Impide cotizar o contratar un equipo marcado como no promovible. */
export function assertPromovibleParaRenta(equipo: {
  disponibleParaRenta?: boolean | null;
  modelo?: string | null;
  descripcion?: string | null;
}): void {
  if (equipo.disponibleParaRenta === false) {
    const nombre = equipo.descripcion || equipo.modelo || 'seleccionado';
    throw new BadRequestException(
      `El equipo ${nombre} no está habilitado para promover ni rentar.`,
    );
  }
}
