import api from './client';
import type { Service } from '@/types';

export const getServices = (includeInactive?: boolean) =>
  api.get<Service[]>('/services', { params: includeInactive ? { include_inactive: '1' } : {} });

export const getService = (id: number) =>
  api.get<Service & { manager_ids: number[] }>(`/services/${id}`);

export const createService = (data: Partial<Service> & { manager_ids?: number[] }) =>
  api.post<{ id: number }>('/services', data);

export const updateService = (id: number, data: Partial<Service> & { manager_ids?: number[] }) =>
  api.put<{ id: number }>(`/services/${id}`, data);

export const deleteService = (id: number) =>
  api.delete<{ id: number }>(`/services/${id}`);

export const toggleServiceActive = (id: number, active: number) =>
  api.patch<{ id: number }>(`/services/${id}/active`, { active });
