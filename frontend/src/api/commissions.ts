import api from './client';
import type { Commission } from '@/types';

export const getCommissions = (params?: { user_id?: number; product_id?: number }) =>
  api.get<Commission[]>('/commissions', { params });

export const upsertCommission = (data: { user_id: number; product_id: number; commission: number }) =>
  api.post<{ id: number }>('/commissions', data);

export const updateCommission = (id: number, commission: number) =>
  api.put<{ id: number }>(`/commissions/${id}`, { commission });

export const deleteCommission = (id: number) =>
  api.delete<{ id: number }>(`/commissions/${id}`);
