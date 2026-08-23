import api from '../../../shared/services/api';
import type { Factura } from '../types/billing.types';
import type { Cotizacion } from '../../quotations/types/quotation.types';

const extractArray = <T>(resData: any): T[] => {
  if (Array.isArray(resData)) return resData;
  if (resData && Array.isArray(resData.data)) return resData.data;
  return [];
};

const extractObject = <T>(resData: any): T => {
  if (resData && resData.data !== undefined && !Array.isArray(resData.data)) return resData.data;
  return resData;
};

export const getPendingQuotations = async (): Promise<Cotizacion[]> => {
  const response = await api.get('/billing/pending-quotations');
  return extractArray<Cotizacion>(response.data);
};

export const getPendingCortes = async (): Promise<any[]> => {
  const response = await api.get('/billing/pending-cortes');
  return extractArray<any>(response.data);
};

export const invoiceQuotation = async (id: string, payload: any): Promise<Factura> => {
  const response = await api.post(`/billing/invoice-quote/${id}`, payload);
  return extractObject<Factura>(response.data);
};

export const invoiceCorte = async (corteId: string, payload: any): Promise<Factura> => {
  const response = await api.post(`/billing/invoice-corte/${corteId}`, payload);
  return extractObject<Factura>(response.data);
};

export const getInvoices = async (): Promise<Factura[]> => {
  const response = await api.get('/billing/invoices');
  return extractArray<Factura>(response.data);
};

export const markInvoiceAsPaid = async (id: string): Promise<Factura> => {
  const response = await api.post(`/billing/invoices/${id}/pay`);
  return extractObject<Factura>(response.data);
};
