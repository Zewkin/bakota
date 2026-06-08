import { useState, useEffect } from 'react';
import { Button, Dialog, Form, Input, List, Picker, Popup, SearchBar, Selector, SpinLoading, TextArea, Toast } from 'antd-mobile';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteCustomer, getCustomer, getCustomers, updateCustomer } from '@/api/customers';
import { getBookings } from '@/api/bookings';
import { useAuthStore } from '@/stores/auth';
import { isAdmin } from '@/utils/roles';
import type { Customer, Booking } from '@/types';

const CUSTOMER_SOURCE_OPTIONS = [
  { label: 'Instagram', value: 'Instagram' },
  { label: 'Сайт', value: 'Сайт' },
  { label: 'Порадили', value: 'Порадили' },
  { label: 'Інше', value: 'Інше' },
];

const formatClientBookingDate = (date: string) => {
  const [year, month, day] = String(date || '').slice(0, 10).split('-');
  return year && month && day ? `${year}-${day}-${month}` : date;
};

export default function ClientsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const [editVisible, setEditVisible] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTel, setEditTel] = useState('');
  const [editComments, setEditComments] = useState('');
  const [editRef, setEditRef] = useState('');
  const [editGroupFlag, setEditGroupFlag] = useState(0);

  const doSearch = async (q: string) => {
    setLoading(true);
    try {
      const term = q.trim();
      const res = await getCustomers(term || undefined);
      setCustomers(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) return;
    const timer = setTimeout(() => doSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search, id]);

  useEffect(() => {
    if (!id) {
      setSelectedCustomer(null);
      setCustomerBookings([]);
      return;
    }

    let active = true;
    const loadCustomer = async () => {
      setDetailLoading(true);
      setSelectedCustomer(null);
      setCustomerBookings([]);
      try {
        const res = await getCustomer(Number(id));
        if (!active) return;
        setSelectedCustomer(res.data);
        const bookingsRes = await getBookings({ customer_tel: res.data.tel });
        if (!active) return;
        setCustomerBookings(bookingsRes.data);
      } catch {
        Toast.show({ content: 'Клієнта не знайдено', icon: 'fail' });
        navigate('/clients', { replace: true });
      } finally {
        if (active) setDetailLoading(false);
      }
    };

    loadCustomer();
    return () => { active = false; };
  }, [id, navigate]);

  const handleSelectCustomer = (customer: Customer) => {
    navigate(`/clients/${customer.id}`);
  };

  const openEditCustomer = () => {
    if (!selectedCustomer) return;
    setEditName(selectedCustomer.name);
    setEditTel(selectedCustomer.tel);
    setEditComments(selectedCustomer.comments || '');
    setEditRef(selectedCustomer.ref || '');
    setEditGroupFlag(selectedCustomer.group_flag);
    setEditVisible(true);
  };

  const handleSaveCustomer = async () => {
    if (!selectedCustomer || !editName.trim() || editTel.trim().length < 3) {
      Toast.show({ content: 'Заповніть ім\'я та телефон', icon: 'fail' });
      return;
    }

    setEditLoading(true);
    try {
      await updateCustomer(selectedCustomer.id, {
        name: editName.trim(),
        tel: editTel.trim(),
        comments: editComments,
        ref: editRef,
        group_flag: editGroupFlag,
      });
      const res = await getCustomer(selectedCustomer.id);
      setSelectedCustomer(res.data);
      const bookingsRes = await getBookings({ customer_tel: res.data.tel });
      setCustomerBookings(bookingsRes.data);
      setCustomers((items) => items.map((item) => item.id === res.data.id ? res.data : item));
      Toast.show({ content: 'Клієнта збережено', icon: 'success' });
      setEditVisible(false);
    } catch (err: any) {
      Toast.show({ content: err.response?.data?.message || 'Не вдалося зберегти', icon: 'fail' });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;

    const ok = await Dialog.confirm({
      content: `Видалити клієнта ${selectedCustomer.name}? Будуть видалені всі бронювання цього клієнта.`,
      confirmText: 'Видалити',
      cancelText: 'Скасувати',
    });
    if (!ok) return;

    try {
      await deleteCustomer(selectedCustomer.id);
      setCustomers((items) => items.filter((item) => item.id !== selectedCustomer.id));
      Toast.show({ content: 'Клієнта видалено', icon: 'success' });
      navigate('/clients', { replace: true });
    } catch (err: any) {
      Toast.show({ content: err.response?.data?.message || 'Не вдалося видалити', icon: 'fail' });
    }
  };

  if (id && !selectedCustomer) {
    return <div style={{ textAlign: 'center', padding: 24 }}><SpinLoading /></div>;
  }

  if (selectedCustomer) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
          <h3>{selectedCustomer.name}</h3>
          <span style={{ cursor: 'pointer', color: '#1677ff' }} onClick={() => navigate('/clients')}>
            Назад
          </span>
        </div>

        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><SpinLoading /></div>
        ) : (
          <>
            <div style={{ fontSize: 14, lineHeight: 2 }}>
              <div><b>Телефон:</b> <a href={`tel:${selectedCustomer.tel}`}>{selectedCustomer.tel}</a></div>
              {selectedCustomer.comments && <div><b>Коментар:</b> {selectedCustomer.comments}</div>}
              {selectedCustomer.ref && <div><b>Джерело:</b> {selectedCustomer.ref}</div>}
            </div>

            <Button block color="primary" fill="outline" onClick={openEditCustomer} style={{ marginTop: 12 }}>
              Редагувати клієнта
            </Button>
            {user && isAdmin(user.type) && (
              <Button block color="danger" fill="outline" onClick={handleDeleteCustomer} style={{ marginTop: 8 }}>
                Видалити клієнта
              </Button>
            )}

            <h4 style={{ marginTop: 16, marginBottom: 8 }}>Бронювання ({customerBookings.length})</h4>
            <List>
              {customerBookings.map((booking) => (
                <List.Item
                  key={booking.id}
                  onClick={() => navigate(`/bookings/${booking.id}`)}
                  description={formatClientBookingDate(booking.date_start)}
                  extra={booking.product_name}
                >
                  #{booking.id} - {booking.customer_name}
                </List.Item>
              ))}
              {customerBookings.length === 0 && (
                <List.Item>Немає бронювань</List.Item>
              )}
            </List>
          </>
        )}

        <Popup visible={editVisible} onMaskClick={() => setEditVisible(false)} bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
          <div style={{ padding: 16 }}>
            <h4 style={{ marginBottom: 12 }}>Редагувати клієнта</h4>
            <Form layout="horizontal">
              <Form.Item label="Ім'я">
                <Input value={editName} onChange={setEditName} placeholder="Ім'я клієнта" />
              </Form.Item>
              <Form.Item label="Телефон">
                <Input value={editTel} onChange={setEditTel} placeholder="+380..." />
              </Form.Item>
              <Form.Item label="Коментар">
                <TextArea value={editComments} onChange={setEditComments} rows={2} />
              </Form.Item>
              <Form.Item label="Джерело">
                <Picker
                  columns={[CUSTOMER_SOURCE_OPTIONS]}
                  value={editRef ? [editRef] : []}
                  onConfirm={(value) => setEditRef(String(value[0] || ''))}
                >
                  {(_, actions) => (
                    <span onClick={actions.open} style={{ cursor: 'pointer' }}>
                      {editRef || 'Оберіть джерело'}
                    </span>
                  )}
                </Picker>
              </Form.Item>
              <Form.Item label="Група">
                <Selector
                  options={[{ label: 'Так', value: 1 }, { label: 'Ні', value: 0 }]}
                  value={[editGroupFlag]}
                  onChange={(value) => setEditGroupFlag(value[0] ?? 0)}
                />
              </Form.Item>
            </Form>
            <Button block color="primary" loading={editLoading} onClick={handleSaveCustomer} style={{ marginTop: 12 }}>
              Зберегти
            </Button>
          </div>
        </Popup>
      </div>
    );
  }

  const countLabel = search.trim() ? 'Знайдено' : 'Загальна кількість';

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Клієнти</h3>
      <SearchBar
        placeholder="Пошук за ім'ям або телефоном"
        value={search}
        onChange={setSearch}
        style={{ marginBottom: 8 }}
      />
      <div style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>
        {countLabel}: {customers.length}
      </div>
      {loading && <div style={{ textAlign: 'center', padding: 24 }}><SpinLoading /></div>}
      <List>
        {customers.map((customer) => (
          <List.Item
            key={customer.id}
            onClick={() => handleSelectCustomer(customer)}
            description={customer.tel}
          >
            {customer.name}
          </List.Item>
        ))}
        {!loading && customers.length === 0 && (
          <List.Item>Клієнтів не знайдено</List.Item>
        )}
      </List>
    </div>
  );
}
