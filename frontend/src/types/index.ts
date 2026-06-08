export const ROLE = { admin: 0, manager: 1, instructor: 2 } as const;
export type RoleType = (typeof ROLE)[keyof typeof ROLE];

export const ALLOWED_DISCOUNTS = [0, 5, 10, 20, 35, 50, 100] as const;

export const BOOKING_STATUS = { booked: 1, canceled: 2, paid: 3 } as const;
export type BookingStatusType = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const STATUS_LABELS: Record<number, string> = {
  1: 'Заброньовано',
  2: 'Скасовано',
  3: 'Надано',
};

export const CANAL_LABELS: Record<number, string> = {
  1: 'Instagram',
  2: 'Telegram',
  3: 'Viber',
  4: 'WhatsApp',
  5: 'Facebook',
};

export const PRODUCT_TYPE_LABELS: Record<number, string> = {
  1: 'Оренда',
  2: 'Тур',
  3: 'Інше',
};

export interface User {
  id: number;
  login: string;
  type: RoleType;
  active: number;
  created_at: string;
  service_ids?: number[];
}

export interface Service {
  id: number;
  name: string;
  maxpax: number;
  start_time: string;
  end_time: string;
  icon: string | null;
  color: string | null;
  template_html: string | null;
  active: number;
  manager_ids?: number[];
}

export interface Product {
  id: number;
  name: string;
  service_id: number;
  hours: number;
  price: number;
  type: number;
  booking_color: string | null;
  active: number;
}

export interface Customer {
  id: number;
  tel: string;
  name: string;
  comments: string | null;
  ref: string | null;
  group_flag: number;
  created_at: string;
}

export interface Booking {
  id: number;
  client_id: number;
  service_id: number;
  product_id: number;
  date_start: string;
  start_time: string;
  pax: number;
  avans?: number;
  discount?: number;
  soldprice?: number | null;
  soldprice_type?: number | null;
  product_price?: number;
  canal?: number | null;
  instructor?: string | null;
  comments: string | null;
  manager_id: number;
  manager_name?: string | null;
  status: number;
  closed_by?: number | null;
  is_read?: boolean;
  created_at: string;
  customer_tel: string;
  customer_name: string;
  product_name: string;
  service_name: string;
}

export interface BlockedTime {
  id: number;
  service_id: number;
  start: string;
  blocked_hours: number;
  comments: string | null;
}

export interface Commission {
  id: number;
  user_id: number;
  product_id: number;
  commission: number;
}

export interface ManagerAnalytics {
  manager_id: number;
  total_count: number;
  total_amount: number;
  total_commission: number;
}

export interface ServiceAnalytics {
  service_id: number;
  total_count: number;
  total_pax: number;
  total_amount: number;
  total_rent: number;
  total_tour: number;
}
