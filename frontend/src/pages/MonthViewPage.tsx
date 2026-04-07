import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { SpinLoading } from 'antd-mobile';
import { getBookings } from '@/api/bookings';
import { useBookingsStore } from '@/stores/bookings';
import { useServicesStore } from '@/stores/services';
import type { Booking, Product } from '@/types';
import { BOOKING_STATUS } from '@/types';

const SLOT_MINUTES = 30;

const timeToMinutes = (time: string) => {
  const [hours = '0', minutes = '0'] = time.slice(0, 5).split(':');
  return Number(hours) * 60 + Number(minutes);
};

const getDurationSlots = (product?: Product) => Math.max(1, Math.ceil((product?.hours || 1) * 2));

export default function MonthViewPage() {
  const navigate = useNavigate();
  const { setDate } = useBookingsStore();
  const { activeServiceId, services, products, fetchServices, fetchProducts } = useServicesStore();
  const activeService = services.find((s) => s.id === activeServiceId);

  const [bookings, setBookingsData] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(dayjs());

  const from = month.startOf('month').format('YYYY-MM-DD');
  const to = month.endOf('month').format('YYYY-MM-DD');

  useEffect(() => {
    if (services.length === 0) fetchServices();
    if (products.length === 0) fetchProducts();
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: any = { from, to };
    if (activeServiceId) params.service_id = activeServiceId;
    getBookings(params)
      .then((res) => setBookingsData(res.data))
      .finally(() => setLoading(false));
  }, [from, to, activeServiceId]);

  const productMap = useMemo(() => Object.fromEntries(products.map((product) => [product.id, product])), [products]);

  // Peak simultaneous load per day (exclude canceled)
  const dayMap = useMemo(() => {
    const map: Record<string, number> = {};

    const grouped: Record<string, Booking[]> = {};
    for (const booking of bookings) {
      if (booking.status === BOOKING_STATUS.canceled) continue;
      grouped[booking.date_start] = grouped[booking.date_start] || [];
      grouped[booking.date_start].push(booking);
    }

    for (const [day, dayBookings] of Object.entries(grouped)) {
      const slotLoad = new Map<number, number>();

      for (const booking of dayBookings) {
        const startSlot = Math.floor(timeToMinutes(booking.start_time) / SLOT_MINUTES);
        const durationSlots = getDurationSlots(productMap[booking.product_id]);

        for (let slot = 0; slot < durationSlots; slot++) {
          const key = startSlot + slot;
          slotLoad.set(key, (slotLoad.get(key) || 0) + booking.pax);
        }
      }

      map[day] = Math.max(0, ...slotLoad.values());
    }

    return map;
  }, [bookings, productMap]);

  const maxpax = activeService?.maxpax || 1;

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

  const getDayStyle = (count: number, isToday: boolean) => {
    if (count === 0) {
      return { background: isToday ? '#f0f6ff' : '#fafafa' };
    }
    if (count >= maxpax) {
      return { background: '#ffebee' }; // red - full
    }
    return { background: '#e6f4ea' }; // green - has space
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ cursor: 'pointer', fontSize: 18 }} onClick={() => setMonth((m) => m.subtract(1, 'month'))}>◀</span>
        <h3>{month.format('MMMM YYYY')}</h3>
        <span style={{ cursor: 'pointer', fontSize: 18 }} onClick={() => setMonth((m) => m.add(1, 'month'))}>▶</span>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40 }}><SpinLoading /></div>}

      {!loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center', fontSize: 12, color: '#999', marginBottom: 4 }}>
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map((d) => <div key={d}>{d}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {Array.from({ length: firstDayOfWeek }, (_, i) => <div key={`e${i}`} />)}
            {days.map((day) => {
              const count = dayMap[day] || 0;
              const isToday = day === dayjs().format('YYYY-MM-DD');
              const colorStyle = getDayStyle(count, isToday);
              const countColor = count >= maxpax ? '#ff3141' : '#00b578';
              return (
                <div
                  key={day}
                  onClick={() => handleDayClick(day)}
                  style={{
                    padding: 8,
                    textAlign: 'center',
                    borderRadius: 8,
                    cursor: 'pointer',
                    ...colorStyle,
                    border: isToday ? '2px solid #1677ff' : '1px solid #eee',
                    fontSize: 14,
                  }}
                >
                  <div>{dayjs(day).date()}</div>
                  {count > 0 && <div style={{ fontSize: 10, color: countColor }}>{count}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
