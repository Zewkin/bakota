import api from './client';
import type { Product } from '@/types';

export const getProducts = (params?: { service_id?: number; type?: number; active?: number }) =>
  api.get<Product[]>('/products', { params });

export const getProduct = (id: number) =>
  api.get<Product>(`/products/${id}`);

export const createProduct = (data: Partial<Product>) =>
  api.post<{ id: number }>('/products', data);

export const updateProduct = (id: number, data: Partial<Product>) =>
  api.put<{ id: number }>(`/products/${id}`, data);

export const deleteProduct = (id: number) =>
  api.delete<{ id: number }>(`/products/${id}`);

export const toggleProductActive = (id: number, active: number) =>
  api.patch<{ id: number }>(`/products/${id}/active`, { active });
