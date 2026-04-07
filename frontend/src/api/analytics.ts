import api from './client';
import type { ManagerAnalytics, ServiceAnalytics } from '@/types';

interface AnalyticsFilters {
  from?: string;
  to?: string;
  product_id?: number;
  status?: number;
  compare?: '1';
}

interface CompareResult<T> {
  current: T[];
  previous: T[];
}

export const getManagerAnalytics = (filters: AnalyticsFilters) =>
  api.get<ManagerAnalytics[] | CompareResult<ManagerAnalytics>>('/analytics/managers', { params: filters });

export const getServiceAnalytics = (filters: AnalyticsFilters) =>
  api.get<ServiceAnalytics[] | CompareResult<ServiceAnalytics>>('/analytics/services', { params: filters });
