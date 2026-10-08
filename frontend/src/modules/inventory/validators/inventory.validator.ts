import { z } from 'zod';
import { maxLen, money, qty } from '../../../shared/validation/helpers';
import { LIMITS } from '../../../shared/validation/limits';
import { EQUIPMENT_EDITABLE_STATES } from '../constants/equipment-status';

const L = LIMITS.equipo;

/**
 * Esquema de escritura de equipos.
 * - `modalidadRenta` NO se envía al backend, por eso no forma parte de este esquema.
 * - `estado` solo acepta los estados que se eligen a mano; RESERVADO, DESPACHADO y EN_MANTENIMIENTO
 *   los fijan los flujos del sistema. Es opcional: si el equipo está en un estado de sistema, en BAJA
 *   (terminal) o en un estado heredado, el formulario no envía `estado`.
 */
export const equipmentSchema = z.object({
  codigo: z.string().max(L.codigo, maxLen('El código', L.codigo)).optional().nullable(),
  modelo: z
    .string()
    .min(1, { message: 'El producto o modelo es requerido' })
    .max(L.modelo, maxLen('El producto o modelo', L.modelo)),
  numeroSerie: z.string().max(L.numeroSerie, maxLen('El número de serie', L.numeroSerie)).optional().nullable(),
  categoriaId: z.string().min(1, { message: 'La categoría es requerida' }),
  subcategoriaId: z.string().optional().nullable(),
  marcaId: z.string().min(1, { message: 'La marca es requerida' }),
  precioRentaDia: money({ max: L.precioRentaDia.max, decimals: L.precioRentaDia.decimales, label: 'El precio por día' }),
  precioDiaB: money({ max: L.precioRentaDia.max, decimals: L.precioRentaDia.decimales, label: 'El precio por día B' })
    .optional()
    .nullable(),
  precioDiaC: money({ max: L.precioRentaDia.max, decimals: L.precioRentaDia.decimales, label: 'El precio por día C' })
    .optional()
    .nullable(),
  precioRentaHora: money({ max: L.precioRentaHora.max, decimals: L.precioRentaHora.decimales, label: 'El precio por hora' })
    .optional()
    .nullable(),
  precioHoraB: money({ max: L.precioRentaHora.max, decimals: L.precioRentaHora.decimales, label: 'El precio por hora B' })
    .optional()
    .nullable(),
  precioHoraC: money({ max: L.precioRentaHora.max, decimals: L.precioRentaHora.decimales, label: 'El precio por hora C' })
    .optional()
    .nullable(),
  minimoHoras: money({ max: L.minimoHoras.max, decimals: L.minimoHoras.decimales, label: 'El mínimo de horas' })
    .optional()
    .nullable(),
  tipoMedicionCombustible: z.enum(['BARRAS', 'PORCENTAJE', 'PULGADAS']).optional().nullable(),
  cantidadTotal: qty({ min: L.cantidadTotal.min, max: L.cantidadTotal.max, label: 'La cantidad total' }),
  cantidadDisponible: qty({ min: L.cantidadDisponible.min, max: L.cantidadDisponible.max, label: 'La cantidad disponible' }),
  horometro: money({ max: L.horometro.max, decimals: null, label: 'El horómetro' }),
  tieneHorometro: z.boolean().optional(),
  sucursalId: z.string().min(1, { message: 'La sucursal de asignación es requerida' }),
  descripcion: z.string().max(L.descripcion, maxLen('La descripción', L.descripcion)).optional().nullable(),
  estado: z
    .enum(EQUIPMENT_EDITABLE_STATES, {
      message: 'Estado no permitido: solo puedes elegir Disponible, Fuera de servicio o Dada de baja',
    })
    .optional(),
});

export type EquipmentFormValues = z.infer<typeof equipmentSchema>;
