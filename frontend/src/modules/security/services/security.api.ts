import api from '../../../shared/services/api';
import type { Role, Permission, UserDetail } from '../types/security.types';
import type { UserFormValues } from '../validators/user.validator';
import type {
  ErpModuleId,
  StoredModuleAccessLevel,
  UserModulePermissionsMap,
} from '../../../shared/constants/modules';

export interface ModulePermissionPayloadItem {
  modulo: ErpModuleId;
  nivel: StoredModuleAccessLevel;
}

export interface CreateUserPayload extends UserFormValues {
  permisosModulosPersonalizados?: boolean;
  permisosModulos?: ModulePermissionPayloadItem[];
}

export interface UpdateUserModulePermissionsPayload {
  personalizado: boolean;
  permisosModulos: ModulePermissionPayloadItem[];
  rolIds?: string[];
}

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

export const createUser = async (data: CreateUserPayload): Promise<UserDetail> => {
  const response = await api.post<ApiResponse<UserDetail>>('/users', data);
  return response.data.data;
};

export const updateUserRoles = async (userId: string, rolIds: string[]): Promise<void> => {
  await api.put(`/users/${userId}/roles`, { rolIds });
};

export const updateUserModulePermissions = async (
  userId: string,
  payload: UpdateUserModulePermissionsPayload,
): Promise<{
  permisosModulosPersonalizados: boolean;
  permisosModulos: UserModulePermissionsMap;
}> => {
  const response = await api.put<
    ApiResponse<{
      permisosModulosPersonalizados: boolean;
      permisosModulos: UserModulePermissionsMap;
    }>
  >(`/users/${userId}/permisos-modulos`, payload);
  return response.data.data;
};

export const toggleUserStatus = async (userId: string): Promise<boolean> => {
  const response = await api.patch<ApiResponse<{ activo: boolean }>>(`/users/${userId}/status`);
  return response.data.data.activo;
};

export const unlockUser = async (userId: string): Promise<{ tempPassword: string }> => {
  const response = await api.post<ApiResponse<{ tempPassword: string }>>(`/users/${userId}/unlock`);
  return response.data.data;
};

export const syncVendedores = async (): Promise<{ totalSincronizados: number }> => {
  const response = await api.post<ApiResponse<{ totalSincronizados: number }>>('/users/sync-vendedores');
  return response.data?.data || (response.data as any);
};
