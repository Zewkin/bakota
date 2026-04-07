import api from './client';
import type { User } from '@/types';

export const getUsers = () =>
  api.get<User[]>('/users');

export const getUser = (id: number) =>
  api.get<User>(`/users/${id}`);

export const createUser = (data: { login: string; password: string; type: number; active?: number; service_ids?: number[] }) =>
  api.post<{ id: number }>('/users', data);

export const updateUser = (id: number, data: Partial<{ login: string; password: string; type: number; active: number; service_ids: number[] }>) =>
  api.put<{ id: number }>(`/users/${id}`, data);

export const toggleUserActive = (id: number, active: number) =>
  api.patch<{ id: number }>(`/users/${id}/active`, { active });
