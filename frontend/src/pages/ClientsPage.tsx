import { useState, useEffect } from 'react';
import { List, SearchBar, SpinLoading } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { getCustomers } from '@/api/customers';
import { getBookings } from '@/api/bookings';
import type { Customer, Booking } from '@/types';

export default function ClientsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);

  const doSearch = async (q: string) => {
    if (q.length < 2) { setCustomers([]); return; }
    setLoading(true);
    try {
      const res = await getCustomers(q);
      setCustomers(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => doSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSelectCustomer = async (c: Customer) => {
    setSelectedCustomer(c);
    const res = await getBookings({ customer_tel: c.tel });
    setCustomerBookings(res.data);
  };

  if (selectedCustomer) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3>{selectedCustomer.name}</h3>
          <span style={{ cursor: 'pointer', color: '#1677ff' }} onClick={() => setSelectedCustomer(null)}>
            Назад
          </span>
        </div>
        <div style={{ fontSize: 14, lineHeight: 2 }}>
          <div><b>Телефон:</b> <a href={`tel:${selectedCustomer.tel}`}>{selectedCustomer.tel}</a></div>
          {selectedCustomer.comments && <div><b>Коментар:</b> {selectedCustomer.comments}</div>}
          {selectedCustomer.ref && <div><b>Джерело:</b> {selectedCustomer.ref}</div>}
        </div>
        <h4 style={{ marginTop: 16, marginBottom: 8 }}>Бронювання ({customerBookings.length})</h4>
        <List>
          {customerBookings.map((b) => (
            <List.Item
              key={b.id}
              onClick={() => navigate(`/bookings/${b.id}`)}
              description={`${b.service_name} — ${b.product_name}`}
              extra={b.date_start}
            >
              #{b.id} — {b.customer_name}
            </List.Item>
          ))}
          {customerBookings.length === 0 && (
            <List.Item>Немає бронювань</List.Item>
          )}
        </List>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Клієнти</h3>
      <SearchBar
        placeholder="Пошук за ім'ям або телефоном"
        value={search}
        onChange={setSearch}
        style={{ marginBottom: 12 }}
      />
      {loading && <div style={{ textAlign: 'center', padding: 24 }}><SpinLoading /></div>}
      <List>
        {customers.map((c) => (
          <List.Item
            key={c.id}
            onClick={() => handleSelectCustomer(c)}
            description={c.tel}
          >
            {c.name}
          </List.Item>
        ))}
      </List>
    </div>
  );
}
