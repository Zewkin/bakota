import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Form, Input, Picker, Stepper, TextArea, Toast, Selector } from 'antd-mobile';
import { useServicesStore } from '@/stores/services';
import { createBooking } from '@/api/bookings';
import { getCustomers } from '@/api/customers';
import { ALLOWED_DISCOUNTS, CANAL_LABELS } from '@/types';
import { generateTimeSlots, formatTime } from '@/utils/format';
import type { Customer } from '@/types';

export default function BookingFormPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { services, products, fetchServices, fetchProducts } = useServicesStore();

  const preServiceId = Number(params.get('service_id')) || null;
  const preDate = params.get('date') || '';
  const preTime = params.get('time') || '';

  const [loading, setLoading] = useState(false);
  const [tel, setTel] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerComments, setCustomerComments] = useState('');
  const [ref, setRef] = useState('');
  const [groupFlag, setGroupFlag] = useState(0);

  const [serviceId, setServiceId] = useState<number | null>(preServiceId);
  const [productId, setProductId] = useState<number | null>(null);
  const [dateStart, setDateStart] = useState(preDate);
  const [startTime, setStartTime] = useState(preTime);
  const [pax, setPax] = useState(1);
  const [avans, setAvans] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [canal, setCanal] = useState<number | undefined>(undefined);
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (services.length === 0) fetchServices();
    if (products.length === 0) fetchProducts();
  }, []);

  const serviceProducts = useMemo(
    () => products.filter((p) => p.service_id === serviceId && p.active),
    [products, serviceId]
  );

  const activeService = services.find((s) => s.id === serviceId);
  const timeSlots = useMemo(
    () => activeService ? generateTimeSlots(activeService.start_time, activeService.end_time) : [],
    [activeService]
  );

  const searchCustomer = async () => {
    if (tel.length < 3) return;
    try {
      const res = await getCustomers(tel);
      if (res.data.length > 0) {
        const c = res.data[0];
        setFoundCustomer(c);
        setCustomerName(c.name);
        setCustomerComments(c.comments || '');
        setRef(c.ref || '');
        setGroupFlag(c.group_flag);
      } else {
        setFoundCustomer(null);
      }
    } catch { /* ignore */ }
  };

  const handleSubmit = async () => {
    if (!tel || !customerName || !serviceId || !productId || !dateStart || !startTime) {
      Toast.show({ content: 'Заповніть всі обов\'язкові поля', icon: 'fail' });
      return;
    }
    setLoading(true);
    try {
      await createBooking({
        customer: {
          tel,
          name: customerName,
          comments: customerComments || undefined,
          ref: ref || undefined,
          group_flag: groupFlag,
        },
        booking: {
          service_id: serviceId,
          product_id: productId,
          date_start: dateStart,
          start_time: startTime,
          pax,
          avans,
          discount,
          canal,
          comments: comments || undefined,
        },
      });
      Toast.show({ content: 'Бронювання створено', icon: 'success' });
      navigate('/', { replace: true });
    } catch (err: any) {
      Toast.show({ content: err.response?.data?.message || 'Помилка', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      <h3 style={{ marginBottom: 16 }}>Нове бронювання</h3>

      {/* Customer */}
      <Form layout="horizontal">
        <Form.Header>Клієнт</Form.Header>
        <Form.Item label="Телефон">
          <Input value={tel} onChange={setTel} onBlur={searchCustomer} placeholder="+380..." />
        </Form.Item>
        {foundCustomer && (
          <div style={{ padding: '4px 12px', fontSize: 12, color: '#00b578' }}>
            Знайдено: {foundCustomer.name} ({foundCustomer.tel})
          </div>
        )}
        <Form.Item label="Ім'я">
          <Input value={customerName} onChange={setCustomerName} placeholder="Ім'я клієнта" />
        </Form.Item>
        <Form.Item label="Коментар">
          <TextArea value={customerComments} onChange={setCustomerComments} rows={1} />
        </Form.Item>
        <Form.Item label="Джерело">
          <Input value={ref} onChange={setRef} placeholder="Instagram, Google..." />
        </Form.Item>
        <Form.Item label="Група">
          <Selector
            options={[{ label: 'Так', value: 1 }, { label: 'Ні', value: 0 }]}
            value={[groupFlag]}
            onChange={(v) => setGroupFlag(v[0] ?? 0)}
          />
        </Form.Item>
      </Form>

      {/* Booking */}
      <Form layout="horizontal">
        <Form.Header>Бронювання</Form.Header>
        <Form.Item label="Сервіс">
          <Picker
            columns={[services.map((s) => ({ label: s.name, value: s.id }))]}
            value={serviceId ? [serviceId] : []}
            onConfirm={(v) => { setServiceId(v[0] as number); setProductId(null); }}
          >
            {(_, actions) => (
              <span onClick={actions.open} style={{ cursor: 'pointer' }}>
                {activeService?.name || 'Оберіть сервіс'}
              </span>
            )}
          </Picker>
        </Form.Item>
        <Form.Item label="Продукт">
          <Picker
            columns={[serviceProducts.map((p) => ({ label: `${p.name} (${p.price} грн)`, value: p.id }))]}
            value={productId ? [productId] : []}
            onConfirm={(v) => setProductId(v[0] as number)}
          >
            {(_, actions) => (
              <span onClick={actions.open} style={{ cursor: 'pointer' }}>
                {serviceProducts.find((p) => p.id === productId)?.name || 'Оберіть продукт'}
              </span>
            )}
          </Picker>
        </Form.Item>
        <Form.Item label="Дата">
          <Input type="date" value={dateStart} onChange={setDateStart} />
        </Form.Item>
        <Form.Item label="Час">
          <Picker
            columns={[timeSlots.map((t) => ({ label: t, value: t }))]}
            value={startTime ? [startTime] : []}
            onConfirm={(v) => setStartTime(v[0] as string)}
          >
            {(_, actions) => (
              <span onClick={actions.open} style={{ cursor: 'pointer' }}>
                {startTime || 'Оберіть час'}
              </span>
            )}
          </Picker>
        </Form.Item>
        <Form.Item label="Кількість">
          <Stepper min={1} max={99} value={pax} onChange={setPax} />
        </Form.Item>
        <Form.Item label="Аванс, грн">
          <Input type="number" value={String(avans)} onChange={(v) => setAvans(Number(v) || 0)} />
        </Form.Item>
        <Form.Item label="Знижка">
          <Selector
            options={ALLOWED_DISCOUNTS.map((d) => ({ label: d === 0 ? 'Без знижки' : `${d}%`, value: d }))}
            value={[discount]}
            onChange={(v) => setDiscount(v[0] ?? 0)}
          />
        </Form.Item>
        <Form.Item label="Канал">
          <Selector
            options={Object.entries(CANAL_LABELS).map(([k, v]) => ({ label: v, value: Number(k) }))}
            value={canal ? [canal] : []}
            onChange={(v) => setCanal(v[0])}
          />
        </Form.Item>
        <Form.Item label="Коментар">
          <TextArea value={comments} onChange={setComments} rows={2} />
        </Form.Item>
      </Form>

      <Button
        block
        color="primary"
        size="large"
        loading={loading}
        onClick={handleSubmit}
        style={{ marginTop: 16 }}
      >
        Створити
      </Button>
    </div>
  );
}
