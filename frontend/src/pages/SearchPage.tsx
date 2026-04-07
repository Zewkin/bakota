import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchBar, List, SpinLoading } from 'antd-mobile';
import { getBookings } from '@/api/bookings';
import type { Booking } from '@/types';
import { formatDateFull, formatTime } from '@/utils/format';
import { STATUS_LABELS } from '@/types';

export default function SearchPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.length < 3) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await getBookings({ customer_tel: search });
        setResults(res.data);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div style={{ padding: 16 }}>
      <SearchBar
        placeholder="Пошук за номером телефону"
        value={search}
        onChange={setSearch}
        autoFocus
        style={{ marginBottom: 12 }}
      />
      {loading && <div style={{ textAlign: 'center', padding: 24 }}><SpinLoading /></div>}
      <List>
        {results.map((b) => (
          <List.Item
            key={b.id}
            onClick={() => navigate(`/bookings/${b.id}`)}
            description={`${b.service_name} | ${formatTime(b.start_time)} | ${STATUS_LABELS[b.status]}`}
            extra={formatDateFull(b.date_start)}
          >
            {b.customer_name} ({b.customer_tel})
          </List.Item>
        ))}
        {!loading && search.length >= 3 && results.length === 0 && (
          <List.Item>Нічого не знайдено</List.Item>
        )}
      </List>
    </div>
  );
}
