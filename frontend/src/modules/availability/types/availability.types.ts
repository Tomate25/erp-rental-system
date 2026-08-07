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
