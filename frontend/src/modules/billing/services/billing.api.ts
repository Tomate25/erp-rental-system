import api from '../../../shared/services/api';
import type { Factura, CorteFacturacionResumen, RetornoConDanos, GastoReparacion } from '../types/billing.types';
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

export const getContractCortes = async (): Promise<CorteFacturacionResumen[]> => {
  const response = await api.get('/billing/contract-cortes');
  return extractArray<CorteFacturacionResumen>(response.data);
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

export const getDamageReturns = async (): Promise<RetornoConDanos[]> => {
  const response = await api.get('/billing/damage-returns');
  return extractArray<RetornoConDanos>(response.data);
};

export const saveRepair = async (id: string, gastos: GastoReparacion[]): Promise<void> => {
  await api.put(`/maintenance/${id}`, { estado: 'COMPLETADO', gastos });
};

export const invoiceDamageReturn = async (id: string): Promise<Factura> => {
  const response = await api.post(`/billing/damage-returns/${id}/invoice`);
  return extractObject<Factura>(response.data);
};

export const markInvoiceAsPaid = async (id: string): Promise<Factura> => {
  const response = await api.post(`/billing/invoices/${id}/pay`);
  return extractObject<Factura>(response.data);
};

export const registerInvoicePayment = async (
  id: string,
  payload: { monto: number; metodo?: string; referencia?: string; banco?: string; comprobanteUrl?: string }
): Promise<any> => {
  const response = await api.post(`/billing/invoices/${id}/payment`, payload);
  return extractObject<any>(response.data);
};
