import type { Client } from '../../clients/types/client.types';
import type { Equipment } from '../../inventory/types/inventory.types';

export type EstadoReserva = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA';

export interface Reserva {
  id: string;
  contratoId: string;
  equipoId: string;
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoReserva;
  
  equipo?: Equipment;
  contrato?: {
    codigo: string;
    cliente: Client;
  };
}

export interface EquipmentPeriodStatus {
  id: string;
  estadoEquipo?: 'MANTENIMIENTO' | 'EN_MANTENIMIENTO' | 'FUERA_DE_SERVICIO' | 'BAJA';
  codigo?: string | null;
  descripcion: string;
  modelo: string;
  numeroSerie: string | null;
  categoriaId: string;
  categoriaNombre?: string;
  marcaNombre?: string;
  tipoControl: 'SERIALIZADO' | 'POR_CANTIDAD';
  cantidadTotal: number;
  cantidadDisponibleActual: number;
  cantidadDisponiblePeriodo: number;
  isAvailable: boolean;
  statusPeriodo: 'DISPONIBLE' | 'OCUPADO' | 'PARCIAL' | 'MANTENIMIENTO';
  fechaEstimadaLiberacion: string | null;
  motivoOcupacion: string | null;
  precioRentaDia: number;
  precioRentaHora: number;
}
