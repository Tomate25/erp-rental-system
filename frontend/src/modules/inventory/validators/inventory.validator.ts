import { z } from 'zod';

export const equipmentSchema = z.object({
  codigo: z.string().optional().nullable(),
  modelo: z.string().min(1, { message: 'El producto o modelo es requerido' }),
  numeroSerie: z.string().optional().nullable(),
  categoriaId: z.string().min(1, { message: 'La categoría es requerida' }),
  subcategoriaId: z.string().optional().nullable(),
  marcaId: z.string().min(1, { message: 'La marca es requerida' }),
  precioRentaDia: z.number().min(0, { message: 'El precio por día no puede ser negativo' }),
  precioRentaHora: z.number().min(0).optional().nullable(),
  minimoHoras: z.number().min(0).optional().nullable(),
  modalidadRenta: z.enum(['SOLO_DIA', 'SOLO_HORA', 'DIA_Y_HORA']).optional(),
  tipoMedicionCombustible: z.enum(['BARRAS', 'PORCENTAJE', 'PULGADAS']).optional().nullable(),
  cantidadTotal: z.number().min(0, { message: 'La cantidad total no puede ser negativa' }),
  cantidadDisponible: z.number().min(0, { message: 'La cantidad disponible no puede ser negativa' }),
  horometro: z.number().min(0, { message: 'El horómetro no puede ser negativo' }),
  sucursalId: z.string().min(1, { message: 'La sucursal de asignación es requerida' }),
  descripcion: z.string().optional().nullable(),
  estado: z.enum(['DISPONIBLE', 'RESERVADO', 'RENTADO', 'RETORNO', 'MANTENIMIENTO', 'BAJA']),
});

export type EquipmentFormValues = z.infer<typeof equipmentSchema>;
