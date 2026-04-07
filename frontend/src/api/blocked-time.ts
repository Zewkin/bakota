import api from './client';
import type { BlockedTime } from '@/types';

export const getBlockedTime = (service_id: number) =>
  api.get<BlockedTime[]>('/blocked-time', { params: { service_id } });

export const createBlockedTime = (data: { service_id: number; start: string; blocked_hours: number; comments?: string }) =>
  api.post<{ id: number }>('/blocked-time', data);

export const deleteBlockedTime = (id: number) =>
  api.delete(`/blocked-time/${id}`);
