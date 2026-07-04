import api from './client';
import type { Booking } from '@/types';

export interface BookingFilters {
  from?: string;
  to?: string;
  manager_id?: number;
  service_id?: number;
  status?: number;
  product_id?: number;
  customer_tel?: string;
  unread_only?: '1';
}

export interface CreateBookingPayload {
  customer: {
    tel: string;
    name: string;
    comments?: string;
    ref?: string;
    group_flag?: number;
  };
  booking: {
    service_id: number;
    product_id: number;
    date_start: string;
    start_time: string;
    pax?: number;
    avans?: number;
    discount?: number;
    soldprice?: number;
    canal?: number;
    comments?: string;
  };
}

export interface CloseBookingPayload {
  soldprice?: number;
  soldprice_type: number;
  instructor: string;
  discount?: number;
}

export const getBookings = (filters: BookingFilters) =>
  api.get<Booking[]>('/bookings', { params: filters });

export const getBooking = (id: number) =>
  api.get<Booking>(`/bookings/${id}`);

export const createBooking = (data: CreateBookingPayload) =>
  api.post<{ id: number }>('/bookings', data);

export const updateBooking = (id: number, data: Partial<CreateBookingPayload['booking']>) =>
  api.put<{ id: number }>(`/bookings/${id}`, data);

export const setBookingStatus = (id: number, status: number) =>
  api.patch<{ id: number }>(`/bookings/${id}/status`, { status });

export const closeBooking = (id: number, data: CloseBookingPayload) =>
  api.patch<{ id: number }>(`/bookings/${id}/close`, data);

export const markBookingRead = (id: number) =>
  api.post<{ id: number }>(`/bookings/${id}/read`);

export const markServiceBookingsRead = (serviceId: number) =>
  api.post<{ count: number }>('/bookings/read-service', { service_id: serviceId });

export const getBookingMessage = (id: number) =>
  api.get<{ message: string }>(`/bookings/${id}/message`);
