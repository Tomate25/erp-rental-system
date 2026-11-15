import api from '../../../shared/services/api';
import type { LoginFormValues } from '../validators/login.validator';

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    nombre: string;
    apellido: string;
    empresaId: string;
    sucursalId?: string | null;
    roles: string[];
  };
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken?: string;
}

export const loginUser = async (data: LoginFormValues): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/auth/login', data);
  return response.data;
};

export const getCurrentUser = async (): Promise<LoginResponse['user']> => {
  const response = await api.get<{ data?: LoginResponse['user'] } | LoginResponse['user']>('/auth/me');
  const payload = response.data;
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data) {
    return payload.data;
  }
  return payload as LoginResponse['user'];
};

export const refreshAuthToken = async (refreshToken: string): Promise<RefreshTokenResponse> => {
  const response = await api.post<RefreshTokenResponse>('/auth/refresh', { refreshToken });
  return response.data;
};

