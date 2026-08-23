import api from '../../../shared/services/api';
import type { Equipment, Category, Subcategory, Brand, Product } from '../types/inventory.types';
import type { EquipmentFormValues } from '../validators/inventory.validator';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// --- PRODUCTOS COMERCIALES (CATÁLOGO / MODELOS) ---

export const getProducts = async (
  categoriaId?: string,
  subcategoriaId?: string,
  marcaId?: string
): Promise<Product[]> => {
  const params: any = {};
  if (categoriaId) params.categoriaId = categoriaId;
  if (subcategoriaId) params.subcategoriaId = subcategoriaId;
  if (marcaId) params.marcaId = marcaId;

  const response = await api.get<ApiResponse<Product[]>>('/inventory/products', { params });
  return response.data.data;
};

export const getProductById = async (id: string): Promise<Product> => {
  const response = await api.get<ApiResponse<Product>>(`/inventory/products/${id}`);
  return response.data.data;
};

export const createProduct = async (data: Partial<Product>): Promise<Product> => {
  const response = await api.post<ApiResponse<Product>>('/inventory/products', data);
  return response.data.data;
};

export const updateProduct = async (id: string, data: Partial<Product>): Promise<Product> => {
  const response = await api.put<ApiResponse<Product>>(`/inventory/products/${id}`, data);
  return response.data.data;
};

export const deleteProduct = async (id: string): Promise<{ success: boolean; message?: string }> => {
  const response = await api.delete<ApiResponse<any>>(`/inventory/products/${id}`);
  return response.data;
};

// --- UNIDADES FÍSICAS / EQUIPOS ---

export const getEquipments = async (
  sucursalId?: string,
  categoriaId?: string,
  subcategoriaId?: string,
  estado?: string
): Promise<Equipment[]> => {
  const params: any = {};
  if (sucursalId) params.sucursalId = sucursalId;
  if (categoriaId) params.categoriaId = categoriaId;
  if (subcategoriaId) params.subcategoriaId = subcategoriaId;
  if (estado) params.estado = estado;

  const response = await api.get<ApiResponse<Equipment[]>>('/inventory', { params });
  return response.data.data;
};

export const getEquipmentById = async (id: string): Promise<Equipment> => {
  const response = await api.get<ApiResponse<Equipment>>(`/inventory/${id}`);
  return response.data.data;
};

export const createEquipment = async (data: EquipmentFormValues): Promise<Equipment> => {
  const response = await api.post<ApiResponse<Equipment>>('/inventory', data);
  return response.data.data;
};

export const updateEquipment = async (id: string, data: Partial<EquipmentFormValues>): Promise<Equipment> => {
  const response = await api.put<ApiResponse<Equipment>>(`/inventory/${id}`, data);
  return response.data.data;
};

export const deleteEquipment = async (id: string): Promise<{ success: boolean; message?: string; bajaAutomatica?: boolean }> => {
  const response = await api.delete<ApiResponse<any>>(`/inventory/${id}`);
  return response.data;
};

// --- CATÁLOGOS AUXILIARES Y TAXONOMÍA ---

export const getCategories = async (): Promise<Category[]> => {
  const response = await api.get<ApiResponse<Category[]>>('/inventory/categories');
  return response.data.data;
};

export const getSubcategories = async (categoriaId?: string): Promise<Subcategory[]> => {
  const params: any = {};
  if (categoriaId) params.categoriaId = categoriaId;
  const response = await api.get<ApiResponse<Subcategory[]>>('/inventory/subcategories', { params });
  return response.data.data;
};

export const createCategory = async (nombre: string, descripcion?: string): Promise<Category> => {
  const response = await api.post<ApiResponse<Category>>('/inventory/categories', { nombre, descripcion });
  return response.data.data;
};

export const createSubcategory = async (categoriaId: string, nombre: string): Promise<Subcategory> => {
  const response = await api.post<ApiResponse<Subcategory>>('/inventory/subcategories', { categoriaId, nombre });
  return response.data.data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await api.delete(`/inventory/categories/${id}`);
};

export const deleteSubcategory = async (id: string): Promise<void> => {
  await api.delete(`/inventory/subcategories/${id}`);
};

export const getBrands = async (): Promise<Brand[]> => {
  const response = await api.get<ApiResponse<Brand[]>>('/inventory/brands');
  return response.data.data;
};

export const createBrand = async (nombre: string): Promise<Brand> => {
  const response = await api.post<ApiResponse<Brand>>('/inventory/brands', { nombre });
  return response.data.data;
};

export const deleteBrand = async (id: string): Promise<void> => {
  await api.delete(`/inventory/brands/${id}`);
};
