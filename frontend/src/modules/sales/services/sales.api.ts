import api from '../../../shared/services/api';
import type { Cotizacion } from '../../quotations/types/quotation.types';
import type { SalesRankingResponse, SeedSalesResult } from '../types/sales.types';

const extractArray = <T>(resData: any): T[] => {
  if (Array.isArray(resData)) return resData;
  if (resData && Array.isArray(resData.data)) return resData.data;
  return [];
};

const extractObject = <T>(resData: any): T => {
  if (resData && resData.data !== undefined && !Array.isArray(resData.data)) return resData.data;
  return resData;
};

export const getSalesRanking = async (): Promise<SalesRankingResponse> => {
  const response = await api.get('/quotations/sales-ranking');
  return extractObject<SalesRankingResponse>(response.data);
};

export const getAllQuotations = async (): Promise<Cotizacion[]> => {
  const response = await api.get('/quotations?all=true');
  return extractArray<Cotizacion>(response.data);
};

export const seedSalesTestData = async (): Promise<SeedSalesResult> => {
  const response = await api.post('/quotations/seed-sales-data');
  return extractObject<SeedSalesResult>(response.data);
};
