import { z } from 'zod';

export const UnitStateSchema = z.enum([
  'DISPONIBLE',
  'ALQUILADO',
  'RESERVADO',
  'EN_REPARACION',
  'BAJA',
]);

export type UnitState = z.infer<typeof UnitStateSchema>;

export const TarifaTypeSchema = z.enum(['HORA', 'DIA']);
export type TarifaType = z.infer<typeof TarifaTypeSchema>;

export const TipoControlSchema = z.enum(['SERIALIZADO', 'POR_CANTIDAD']);
export type TipoControl = z.infer<typeof TipoControlSchema>;

export const StatusCountsSchema = z.object({
  DISPONIBLE: z.number().nonnegative(),
  ALQUILADO: z.number().nonnegative(),
  RESERVADO: z.number().nonnegative(),
  EN_REPARACION: z.number().nonnegative(),
  BAJA: z.number().nonnegative(),
});
export type StatusCounts = z.infer<typeof StatusCountsSchema>;

export const InventorySummarySchema = z.object({
  totalUnidades: z.number().nonnegative(),
  porcentajeOcupacion: z.number().min(0).max(100),
  unidadesDisponibles: z.number().nonnegative(),
  unidadesAlquiladas: z.number().nonnegative(),
  unidadesReservadas: z.number().nonnegative(),
  unidadesEnReparacion: z.number().nonnegative(),
  unidadesBaja: z.number().nonnegative(),
});
export type InventorySummary = z.infer<typeof InventorySummarySchema>;

export const GroupedProductSchema = z.object({
  productoId: z.string().min(1),
  nombre: z.string().min(1),
  familia: z.string().min(1),
  marca: z.string().default('N/D'),
  tarifa: TarifaTypeSchema,
  tipoControl: TipoControlSchema,
  total: z.number().nonnegative(),
  porEstado: StatusCountsSchema,
  porcentajeRentado: z.number().min(0).max(100),
  porcentajeOcupacion: z.number().min(0).max(100),
  precioDiaA: z.number().optional(),
  precioDiaB: z.number().nullable().optional(),
  precioDiaC: z.number().nullable().optional(),
  precioHoraA: z.number().nullable().optional(),
  precioHoraB: z.number().nullable().optional(),
  precioHoraC: z.number().nullable().optional(),
  equipoIds: z.array(z.string()).optional(),
});
export type GroupedProduct = z.infer<typeof GroupedProductSchema>;

export const GroupedInventoryResponseSchema = z.object({
  items: z.array(GroupedProductSchema),
  total: z.number().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});
export type GroupedInventoryResponse = z.infer<typeof GroupedInventoryResponseSchema>;

export const SerialUnitItemSchema = z.object({
  id: z.string().min(1),
  codigo: z.string().min(1),
  marca: z.string(),
  modelo: z.string(),
  serie: z.string().default('S/N'),
  estado: UnitStateSchema,
  clienteAsignado: z.string().nullable().optional(),
  contratoNumero: z.string().nullable().optional(),
  fechaDevolucion: z.string().nullable().optional(),
  horometro: z.number().nullable().optional(),
});
export type SerialUnitItem = z.infer<typeof SerialUnitItemSchema>;

export const QuantityClientBreakdownSchema = z.object({
  clienteNombre: z.string().min(1),
  contratoNumero: z.string().min(1),
  cantidad: z.number().positive(),
  estado: UnitStateSchema,
  fechaDevolucion: z.string().nullable().optional(),
});
export type QuantityClientBreakdown = z.infer<typeof QuantityClientBreakdownSchema>;

export const QuantityProductBreakdownSchema = z.object({
  porEstado: StatusCountsSchema,
  porCliente: z.array(QuantityClientBreakdownSchema),
});
export type QuantityProductBreakdown = z.infer<typeof QuantityProductBreakdownSchema>;

export const ProductUnitsResponseSchema = z.discriminatedUnion('tipoControl', [
  z.object({
    tipoControl: z.literal('SERIALIZADO'),
    unidades: z.array(SerialUnitItemSchema),
  }),
  z.object({
    tipoControl: z.literal('POR_CANTIDAD'),
    desglose: QuantityProductBreakdownSchema,
  }),
]);
export type ProductUnitsResponse = z.infer<typeof ProductUnitsResponseSchema>;

export const MaintenanceHistoryItemSchema = z.object({
  id: z.string().min(1),
  fecha: z.string().min(1),
  tipo: z.enum(['PREVENTIVO', 'CORRECTIVO']),
  descripcion: z.string().min(1),
  tecnicoResponsable: z.string().nullable().optional(),
  costo: z.number().nullable().optional(),
});
export type MaintenanceHistoryItem = z.infer<typeof MaintenanceHistoryItemSchema>;

export const UnitDetailSchema = z.object({
  id: z.string().min(1),
  codigo: z.string().min(1),
  productoNombre: z.string().min(1),
  marca: z.string(),
  modelo: z.string(),
  serie: z.string().default('S/N'),
  estado: UnitStateSchema,
  tipoControl: TipoControlSchema,
  horometro: z.number().nullable().optional(),
  clienteActual: z
    .object({
      id: z.string(),
      nombre: z.string(),
      telefono: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  contratoActual: z
    .object({
      id: z.string(),
      numero: z.string(),
      fechaInicio: z.string(),
      fechaDevolucionPrevista: z.string(),
    })
    .nullable()
    .optional(),
  historialMantenimiento: z.array(MaintenanceHistoryItemSchema).default([]),
});
export type UnitDetail = z.infer<typeof UnitDetailSchema>;

/** Cálculo robusto de ocupación sin división por cero */
export function calculateOccupancy(counts: StatusCounts): {
  ocupacionTotalPorcentaje: number;
  rentadoPorcentaje: number;
} {
  const { ALQUILADO, RESERVADO, DISPONIBLE, EN_REPARACION } = counts;
  const totalSinBaja = ALQUILADO + RESERVADO + DISPONIBLE + EN_REPARACION;
  if (totalSinBaja <= 0) {
    return { ocupacionTotalPorcentaje: 0, rentadoPorcentaje: 0 };
  }
  const ocupacion = ((ALQUILADO + RESERVADO) / totalSinBaja) * 100;
  const rentado = (ALQUILADO / totalSinBaja) * 100;
  return {
    ocupacionTotalPorcentaje: Math.round(ocupacion * 10) / 10,
    rentadoPorcentaje: Math.round(rentado * 10) / 10,
  };
}
