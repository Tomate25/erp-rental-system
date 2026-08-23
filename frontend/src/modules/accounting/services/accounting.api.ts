import api from '../../../shared/services/api';

const extractObject = <T>(resData: any): T => {
  if (resData && resData.data !== undefined && !Array.isArray(resData.data)) return resData.data;
  return resData;
};

export const getCuentasPorCobrar = async (): Promise<any> => {
  const response = await api.get('/accounting/cxc');
  return extractObject<any>(response.data);
};

export const getCuentasPorPagar = async (): Promise<any> => {
  const response = await api.get('/accounting/cxp');
  return extractObject<any>(response.data);
};

export const getEstadoResultados = async (): Promise<any> => {
  const response = await api.get('/accounting/estado-resultados');
  return extractObject<any>(response.data);
};

export const getBalanceGeneral = async (): Promise<any> => {
  const response = await api.get('/accounting/balance-general');
  return extractObject<any>(response.data);
};
