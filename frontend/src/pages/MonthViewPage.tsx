import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { SpinLoading } from 'antd-mobile';
import { getBookings } from '@/api/bookings';
import { useBookingsStore } from '@/stores/bookings';
import { useServicesStore } from '@/stores/services';
import ServiceTabs from '@/components/calendar/ServiceTabs';
import type { Booking } from '@/types';
import { BOOKING_STATUS } from '@/types';

type DayStatus = 'none' | 'past' | 'booked' | 'unread';

export default function MonthViewPage() {
  const navigate = useNavigate();
  const { date, setDate } = useBookingsStore();
  const { activeServiceId, services, fetchServices } = useServicesStore();
  const activeService = services.find((s) => s.id === activeServiceId);

  const [bookings, setBookingsData] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(dayjs(date));

  const from = month.startOf('month').format('YYYY-MM-DD');
  const to = month.endOf('month').format('YYYY-MM-DD');

  useEffect(() => {
    if (services.length === 0) fetchServices();
  }, [services.length, fetchServices]);

  useEffect(() => {
    if (!activeServiceId) {
      setBookingsData([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    getBookings({ from, to, service_id: activeServiceId })
      .then((bookingsRes) => {
        if (!active) return;
        setBookingsData(bookingsRes.data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [from, to, activeServiceId]);

  const dayStatusMap = useMemo(() => {
    const map: Record<string, DayStatus> = {};

    const grouped: Record<string, Booking[]> = {};
    for (const booking of bookings) {
      if (booking.status === BOOKING_STATUS.canceled) continue;
      const day = String(booking.date_start).slice(0, 10);
      grouped[day] = grouped[day] || [];
      grouped[day].push(booking);
    }

    const today = dayjs().format('YYYY-MM-DD');
    for (const day of Object.keys(grouped)) {
      const dayBookings = grouped[day] || [];
      if (dayBookings.some((booking) => !booking.is_read)) {
        map[day] = 'unread';
      } else if (day < today) {
        map[day] = 'past';
      } else {
        map[day] = 'booked';
      }
    }

    return map;
  }, [bookings]);

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
    if (status === 'unread') return '#2aa8ff';
    if (status === 'past') return '#b8bec6';
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
