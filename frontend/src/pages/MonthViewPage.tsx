import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { SpinLoading } from 'antd-mobile';
import { getBookings } from '@/api/bookings';
import { getBlockedTime } from '@/api/blocked-time';
import { useBookingsStore } from '@/stores/bookings';
import { useServicesStore } from '@/stores/services';
import ServiceTabs from '@/components/calendar/ServiceTabs';
import type { BlockedTime, Booking, Product } from '@/types';
import { BOOKING_STATUS } from '@/types';

const SLOT_MINUTES = 30;

const timeToMinutes = (time: string) => {
  const [hours = '0', minutes = '0'] = time.slice(0, 5).split(':');
  return Number(hours) * 60 + Number(minutes);
};

const getDurationSlots = (product?: Product) => Math.max(1, Math.ceil((product?.hours || 1) * 2));

type DayStatus = 'none' | 'booked' | 'full';

export default function MonthViewPage() {
  const navigate = useNavigate();
  const { date, setDate } = useBookingsStore();
  const { activeServiceId, services, products, fetchServices, fetchProducts } = useServicesStore();
  const activeService = services.find((s) => s.id === activeServiceId);

  const [bookings, setBookingsData] = useState<Booking[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(dayjs(date));

  const from = month.startOf('month').format('YYYY-MM-DD');
  const to = month.endOf('month').format('YYYY-MM-DD');

  useEffect(() => {
    if (services.length === 0) fetchServices();
    if (products.length === 0) fetchProducts();
  }, [services.length, products.length, fetchServices, fetchProducts]);

  useEffect(() => {
    if (!activeServiceId) {
      setBookingsData([]);
      setBlockedTimes([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    Promise.all([
      getBookings({ from, to, service_id: activeServiceId }),
      getBlockedTime(activeServiceId),
    ])
      .then(([bookingsRes, blockedRes]) => {
        if (!active) return;
        setBookingsData(bookingsRes.data);
        setBlockedTimes(blockedRes.data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [from, to, activeServiceId]);

  const productMap = useMemo(() => Object.fromEntries(products.map((product) => [product.id, product])), [products]);

  const dayStatusMap = useMemo(() => {
    const map: Record<string, DayStatus> = {};
    if (!activeService) return map;

    const grouped: Record<string, Booking[]> = {};
    for (const booking of bookings) {
      if (booking.status === BOOKING_STATUS.canceled) continue;
      const day = String(booking.date_start).slice(0, 10);
      grouped[day] = grouped[day] || [];
      grouped[day].push(booking);
    }

    const blockedByDay: Record<string, BlockedTime[]> = {};
    for (const block of blockedTimes) {
      if (block.service_id !== activeService.id) continue;
      const day = dayjs(block.start).format('YYYY-MM-DD');
      if (day < from || day > to) continue;
      blockedByDay[day] = blockedByDay[day] || [];
      blockedByDay[day].push(block);
    }

    const serviceStartSlot = Math.floor(timeToMinutes(activeService.start_time) / SLOT_MINUTES);
    const serviceEndSlot = Math.floor(timeToMinutes(activeService.end_time) / SLOT_MINUTES);
    const serviceSlots = Array.from(
      { length: Math.max(serviceEndSlot - serviceStartSlot, 0) },
      (_, index) => serviceStartSlot + index
    );
    const capacity = Math.max(activeService.maxpax || 1, 1);
    const daysWithActivity = new Set([...Object.keys(grouped), ...Object.keys(blockedByDay)]);

    for (const day of daysWithActivity) {
      const slotLoad = new Map<number, number>();
      const dayBookings = grouped[day] || [];
      const dayBlocks = blockedByDay[day] || [];

      for (const booking of dayBookings) {
        const startSlot = Math.floor(timeToMinutes(booking.start_time) / SLOT_MINUTES);
        const durationSlots = getDurationSlots(productMap[booking.product_id]);

        for (let slot = 0; slot < durationSlots; slot++) {
          const key = startSlot + slot;
          slotLoad.set(key, (slotLoad.get(key) || 0) + booking.pax);
        }
      }

      for (const block of dayBlocks) {
        const startSlot = Math.floor(timeToMinutes(dayjs(block.start).format('HH:mm')) / SLOT_MINUTES);
        const durationSlots = Math.max(1, Math.ceil(Number(block.blocked_hours || 1) * 2));

        for (let slot = 0; slot < durationSlots; slot++) {
          const key = startSlot + slot;
          slotLoad.set(key, capacity);
        }
      }

      const isFull = serviceSlots.length > 0 && serviceSlots.every((slot) => (slotLoad.get(slot) || 0) >= capacity);
      if (isFull) {
        map[day] = 'full';
      } else if (dayBookings.length > 0) {
        map[day] = 'booked';
      }
    }

    return map;
  }, [activeService, blockedTimes, bookings, from, productMap, to]);

  const days = useMemo(() => {
    const arr = [];
    let d = month.startOf('month');
    while (d.month() === month.month()) {
      arr.push(d.format('YYYY-MM-DD'));
      d = d.add(1, 'day');
    }
    return arr;
  }, [month]);

  const firstDayOfWeek = (dayjs(days[0]).day() + 6) % 7; // Monday = 0

  const handleDayClick = (day: string) => {
    setDate(day);
    navigate('/');
  };

  const getDotColor = (status: DayStatus) => {
    if (status === 'full') return '#ff3141';
    if (status === 'booked') return '#00b578';
    return 'transparent';
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      <ServiceTabs />

      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ cursor: 'pointer', fontSize: 18 }} onClick={() => setMonth((current) => current.subtract(1, 'month'))}>◀</span>
          <h3>{month.format('MMMM YYYY')}</h3>
          <span style={{ cursor: 'pointer', fontSize: 18 }} onClick={() => setMonth((current) => current.add(1, 'month'))}>▶</span>
        </div>

        {!activeService && !loading && (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>Немає активного сервісу</div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: 40 }}><SpinLoading /></div>}

        {!loading && activeService && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center', fontSize: 12, color: '#999', marginBottom: 4 }}>
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map((dayName) => <div key={dayName}>{dayName}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {Array.from({ length: firstDayOfWeek }, (_, index) => <div key={`e${index}`} />)}
              {days.map((day) => {
                const status = dayStatusMap[day] || 'none';
                const isToday = day === dayjs().format('YYYY-MM-DD');
                return (
                  <div
                    key={day}
                    onClick={() => handleDayClick(day)}
                    style={{
                      minHeight: 52,
                      padding: '8px 4px 6px',
                      textAlign: 'center',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: isToday ? '#f0f6ff' : '#fafafa',
                      border: isToday ? '2px solid #1677ff' : '1px solid #eee',
                      fontSize: 14,
                    }}
                  >
                    <div>{dayjs(day).date()}</div>
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: getDotColor(status),
                        margin: '6px auto 0',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
