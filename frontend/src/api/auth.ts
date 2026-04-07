import api from './client';

export const login = (login: string, password: string) =>
  api.post<{ token: string; user: { id: number; login: string; type: number } }>('/auth/login', { login, password });

export const bootstrap = (login: string, password: string) =>
  api.post('/auth/bootstrap', { login, password });
