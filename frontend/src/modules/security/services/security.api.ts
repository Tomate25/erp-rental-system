import api from '../../../shared/services/api';
import type { Role, Permission, UserDetail } from '../types/security.types';
import type { UserFormValues } from '../validators/user.validator';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// --- ROLES Y PERMISOS ---

export const getRoles = async (): Promise<Role[]> => {
  const response = await api.get<ApiResponse<Role[]>>('/roles');
  return response.data.data;
};

export const createRole = async (data: { nombre: string; descripcion?: string }): Promise<Role> => {
  const response = await api.post<ApiResponse<Role>>('/roles', data);
  return response.data.data;
};

export const deleteRole = async (id: string): Promise<void> => {
  await api.delete(`/roles/${id}`);
};

export const getPermissions = async (): Promise<Permission[]> => {
  const response = await api.get<ApiResponse<Permission[]>>('/roles/permisos');
  return response.data.data;
};

export const updateRolePermissions = async (roleId: string, permisoIds: string[]): Promise<void> => {
  await api.put(`/roles/${roleId}/permisos`, { permisoIds });
};

// --- USUARIOS ---

export const getUsers = async (): Promise<UserDetail[]> => {
  const response = await api.get<ApiResponse<UserDetail[]>>('/users');
  return response.data.data;
};

export const createUser = async (data: UserFormValues): Promise<UserDetail> => {
  const response = await api.post<ApiResponse<UserDetail>>('/users', data);
  return response.data.data;
};

export const updateUserRoles = async (userId: string, rolIds: string[]): Promise<void> => {
  await api.put(`/users/${userId}/roles`, { rolIds });
};

export const toggleUserStatus = async (userId: string): Promise<boolean> => {
  const response = await api.patch<ApiResponse<{ activo: boolean }>>(`/users/${userId}/status`);
  return response.data.data.activo;
};

export const unlockUser = async (userId: string): Promise<{ tempPassword: string }> => {
  const response = await api.post<ApiResponse<{ tempPassword: string }>>(`/users/${userId}/unlock`);
  return response.data.data;
};
