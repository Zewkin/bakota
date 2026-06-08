import api from './client';
import type { Customer } from '@/types';

export const getCustomers = (search?: string) =>
  api.get<Customer[]>('/customers', { params: search ? { search } : {} });

export const getCustomer = (id: number) =>
  api.get<Customer>(`/customers/${id}`);

export const updateCustomer = (id: number, data: Partial<Customer>) =>
  api.put<{ id: number }>(`/customers/${id}`, data);

export const deleteCustomer = (id: number) =>
  api.delete<{ id: number }>(`/customers/${id}`);
