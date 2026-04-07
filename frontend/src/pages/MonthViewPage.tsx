import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { SpinLoading } from 'antd-mobile';
import { getBookings } from '@/api/bookings';
import { useBookingsStore } from '@/stores/bookings';
import { useServicesStore } from '@/stores/services';
import type { Booking } from '@/types';
import { BOOKING_STATUS } from '@/types';

export default function MonthViewPage() {
  const navigate = useNavigate();
  const { setDate } = useBookingsStore();
  const activeServiceId = useServicesStore((s) => s.activeServiceId);
  const services = useServicesStore((s) => s.services);
  const activeService = services.find((s) => s.id === activeServiceId);

  const [bookings, setBookingsData] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(dayjs());

  const from = month.startOf('month').format('YYYY-MM-DD');
  const to = month.endOf('month').format('YYYY-MM-DD');

  useEffect(() => {
    setLoading(true);
    const params: any = { from, to };
    if (activeServiceId) params.service_id = activeServiceId;
    getBookings(params)
      .then((res) => setBookingsData(res.data))
      .finally(() => setLoading(false));
  }, [from, to, activeServiceId]);

  // Count active bookings per day (exclude canceled)
  const dayMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of bookings) {
      if (b.status !== BOOKING_STATUS.canceled) {
        map[b.date_start] = (map[b.date_start] || 0) + 1;
      }
    }
    return map;
  }, [bookings]);

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
