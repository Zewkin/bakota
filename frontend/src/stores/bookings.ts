import { create } from 'zustand';
import dayjs from 'dayjs';
import type { Booking, BlockedTime } from '@/types';
import { getBookings } from '@/api/bookings';
import { getBlockedTime } from '@/api/blocked-time';

interface BookingsState {
  date: string;
  bookings: Booking[];
  blockedTimes: BlockedTime[];
  loading: boolean;
  setDate: (date: string) => void;
  nextDay: () => void;
  prevDay: () => void;
  fetchBookings: (serviceId: number) => Promise<void>;
  fetchBlockedTime: (serviceId: number) => Promise<void>;
}

export const useBookingsStore = create<BookingsState>((set, get) => ({
  date: dayjs().format('YYYY-MM-DD'),
  bookings: [],
  blockedTimes: [],
  loading: false,
  setDate: (date) => set({ date }),
  nextDay: () => set((s) => ({ date: dayjs(s.date).add(1, 'day').format('YYYY-MM-DD') })),
  prevDay: () => set((s) => ({ date: dayjs(s.date).subtract(1, 'day').format('YYYY-MM-DD') })),
  fetchBookings: async (serviceId) => {
    const { date } = get();
    set({ loading: true });
    try {
      const res = await getBookings({ from: date, to: date, service_id: serviceId });
      set({ bookings: res.data });
    } finally {
      set({ loading: false });
    }
  },
  fetchBlockedTime: async (serviceId) => {
    const res = await getBlockedTime(serviceId);
    set({ blockedTimes: res.data });
  },
}));
