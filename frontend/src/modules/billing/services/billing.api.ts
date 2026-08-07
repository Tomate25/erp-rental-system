import api from '../../../shared/services/api';
import type { Factura } from '../types/billing.types';
import type { Cotizacion } from '../../quotations/types/quotation.types';

export const getPendingQuotations = async (): Promise<Cotizacion[]> => {
  const response = await api.get('/billing/pending-quotations');
  return response.data;
};

export const invoiceQuotation = async (id: string, payload: any): Promise<Factura> => {
  const response = await api.post(`/billing/invoice-quote/${id}`, payload);
  return response.data;
};

export const getInvoices = async (): Promise<Factura[]> => {
  const response = await api.get('/billing/invoices');
  return response.data;
};

export const markInvoiceAsPaid = async (id: string): Promise<Factura> => {
  const response = await api.post(`/billing/invoices/${id}/pay`);
  return response.data;
};
