export interface Maintenance {
  id: string;
  equipoId: string;
  tipo: 'PREVENTIVO' | 'CORRECTIVO';
  estado: 'PROGRAMADO' | 'EN_PROCESO' | 'COMPLETADO' | 'CANCELADO';
  fechaProgramacion: string;
  fechaEjecucion?: string | null;
  horometroServicio: number;
  descripcion: string;
  costo: number;
  insumosUtilizados?: string | null;
  createdAt: string;
  updatedAt: string;
  equipo?: {
    id: string;
    modelo: string;
    numeroSerie?: string | null;
    codigo?: string | null;
    categoria?: { nombre: string };
    subcategoria?: { nombre: string } | null;
    marca?: { nombre: string };
  };
}
