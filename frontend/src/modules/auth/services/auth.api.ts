import api from '../../../shared/services/api';
import type { LoginFormValues } from '../validators/login.validator';

export interface LoginResponse {
  accessToken: string;
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

export const loginUser = async (data: LoginFormValues): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/auth/login', data);
  return response.data;
};
