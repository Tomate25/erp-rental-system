export interface AdvisorSalesStat {
  posicion: number;
  asesorId: string;
  nombre: string;
  email: string;
  totalCotizaciones: number;
  cotizacionesAprobadas: number;
  cotizacionesPendientes: number;
  cotizacionesRechazadas: number;
  montoTotalCotizado: number;
  montoTotalVendido: number;
  ticketPromedio: number;
  tasaConversion: number;
  contratosGenerados: number;
}

export interface GlobalSalesTotals {
  totalCotizaciones: number;
  totalAprobadas: number;
  totalPendientes: number;
  montoGlobalCotizado: number;
  montoGlobalVendido: number;
  tasaConversionPromedio: number;
}

export interface SalesRankingResponse {
  ranking: AdvisorSalesStat[];
  globalTotals: GlobalSalesTotals;
}

export interface SeedSalesResult {
  createdQuotesCount: number;
  createdContractsCount: number;
  advisorsSeeded: number;
}
