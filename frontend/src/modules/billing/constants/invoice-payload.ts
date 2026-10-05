import type { CreateInvoicePayload } from '../types/billing.types';

/**
 * Cuerpo con el que se factura un corte de contrato a crédito de 30 días (`POST /billing/invoice-corte/:corteId`).
 * Es EXACTAMENTE lo que acepta `CreateInvoiceDto`: el backend responde 400 ante propiedades que no estén en el DTO.
 * Lo comparten `BillingDashboard` y `ContractCortesModal`; usarlo como `{ ...FACTURA_CORTE_CREDITO_30 }`.
 */
export const FACTURA_CORTE_CREDITO_30: Readonly<CreateInvoicePayload> = {
  tipoFactura: 'ESTANDAR',
  condicionPago: 'CREDITO',
  plazoCreditoDias: 30,
  estado: 'PENDIENTE',
};