import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Form, Input, Picker, Selector, SpinLoading, Stepper, TextArea, Toast } from 'antd-mobile';
import { useServicesStore } from '@/stores/services';
import { createBooking, getBooking, updateBooking } from '@/api/bookings';
import { getCustomer, getCustomers, updateCustomer } from '@/api/customers';
import { ALLOWED_DISCOUNTS, CANAL_LABELS } from '@/types';
import { formatPrice, generateTimeSlots } from '@/utils/format';
import type { Customer } from '@/types';

const CUSTOMER_SOURCE_OPTIONS = [
  { label: 'Instagram', value: 'Instagram' },
  { label: 'Сайт', value: 'Сайт' },
  { label: 'Порадили', value: 'Порадили' },
  { label: 'Інше', value: 'Інше' },
];

const normalizeDate = (value: unknown) => String(value || '').slice(0, 10);
const normalizeTime = (value: unknown) => String(value || '').slice(0, 5);

export default function BookingFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [params] = useSearchParams();
  const { services, products, fetchServices, fetchProducts } = useServicesStore();

  const editBookingId = Number(id) || null;
  const isEdit = Boolean(editBookingId);
  const preServiceId = Number(params.get('service_id')) || null;
  const preDate = params.get('date') || '';
  const preTime = params.get('time') || '';

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [customerId, setCustomerId] = useState<number | null>(null);
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
  const [soldpriceInput, setSoldpriceInput] = useState('');
  const [priceManual, setPriceManual] = useState(false);
  const [canal, setCanal] = useState<number | undefined>(undefined);
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (services.length === 0) fetchServices();
    if (products.length === 0) fetchProducts();
  }, [services.length, products.length, fetchServices, fetchProducts]);

  useEffect(() => {
    if (!editBookingId) return;

    let active = true;
    const loadBooking = async () => {
      setInitialLoading(true);
      try {
        const bookingRes = await getBooking(editBookingId);
        const booking = bookingRes.data;
        if (!active) return;

        setCustomerId(booking.client_id);
        setTel(booking.customer_tel || '');
        setCustomerName(booking.customer_name || '');
        setServiceId(booking.service_id);
        setProductId(booking.product_id);
        setDateStart(normalizeDate(booking.date_start));
        setStartTime(normalizeTime(booking.start_time));
        setPax(Number(booking.pax || 1));
        setAvans(Number(booking.avans || 0));
        setDiscount(Number(booking.discount || 0));
        setSoldpriceInput(booking.soldprice != null ? String(Number(booking.soldprice).toFixed(0)) : '');
        setPriceManual(booking.soldprice != null);
        setCanal(booking.canal ?? undefined);
        setComments(booking.comments || '');

        const customerRes = await getCustomer(booking.client_id);
        if (!active) return;
        setCustomerComments(customerRes.data.comments || '');
        setRef(customerRes.data.ref || '');
        setGroupFlag(customerRes.data.group_flag);
      } catch {
        Toast.show({ content: 'Бронювання не знайдено', icon: 'fail' });
        navigate(editBookingId ? `/bookings/${editBookingId}` : '/', { replace: true });
      } finally {
        if (active) setInitialLoading(false);
      }
    };

    loadBooking();
    return () => { active = false; };
  }, [editBookingId, navigate]);

  const serviceProducts = useMemo(
    () => products.filter((product) => product.service_id === serviceId && (product.active || product.id === productId)),
    [products, serviceId, productId]
  );
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId) || null,
    [products, productId]
  );
  const calculatedPrice = useMemo(() => {
    if (!selectedProduct) return 0;
    return Number(selectedProduct.price || 0) * pax * (1 - discount / 100);
  }, [selectedProduct, pax, discount]);

  const activeService = services.find((service) => service.id === serviceId);
  const timeSlots = useMemo(
    () => activeService ? generateTimeSlots(activeService.start_time, activeService.end_time) : [],
    [activeService]
  );
  const maxPax = activeService?.maxpax || 99;

  useEffect(() => {
    if (pax > maxPax) {
      setPax(maxPax);
    }
  }, [maxPax, pax]);

  useEffect(() => {
    if (!selectedProduct) {
      if (!productId) {
        setSoldpriceInput('');
        setPriceManual(false);
      }
      return;
    }
    if (!priceManual) {
      setSoldpriceInput(String(calculatedPrice.toFixed(0)));
    }
  }, [selectedProduct, productId, calculatedPrice, priceManual]);

  const searchCustomer = async () => {
    if (isEdit || tel.length < 3) return;
    try {
      const res = await getCustomers(tel);
      if (res.data.length > 0) {
        const customer = res.data[0];
        setFoundCustomer(customer);
        setCustomerName(customer.name);
        setCustomerComments(customer.comments || '');
        setRef(customer.ref || '');
        setGroupFlag(customer.group_flag);
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
    const soldprice = soldpriceInput.trim() ? Number(soldpriceInput) : undefined;
    if (soldprice !== undefined && (!Number.isFinite(soldprice) || soldprice < 0)) {
      Toast.show({ content: 'Вкажіть ціну коректно', icon: 'fail' });
      return;
    }

    setLoading(true);
    try {
      const customerPayload = {
        tel: tel.trim(),
        name: customerName.trim(),
        comments: customerComments,
        ref,
        group_flag: groupFlag,
      };

      const bookingPayload = {
        service_id: serviceId,
        product_id: productId,
        date_start: dateStart,
        start_time: startTime,
        pax,
        avans,
        discount,
        soldprice,
        canal,
        comments,
      };

      if (isEdit && editBookingId) {
        if (!customerId) throw new Error('Customer is missing');
        await updateCustomer(customerId, customerPayload);
        await updateBooking(editBookingId, bookingPayload);
        Toast.show({ content: 'Бронювання збережено', icon: 'success' });
        navigate(`/bookings/${editBookingId}`, { replace: true });
      } else {
        await createBooking({
          customer: customerPayload,
          booking: bookingPayload,
        });
        Toast.show({ content: 'Бронювання створено', icon: 'success' });
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      Toast.show({ content: err.response?.data?.message || 'Помилка', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return <div style={{ textAlign: 'center', padding: 24 }}><SpinLoading /></div>;
  }

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      <h3 style={{ marginBottom: 16 }}>{isEdit ? 'Редагувати бронювання' : 'Нове бронювання'}</h3>

      <div style={{ background: '#eef8f3', border: '1px solid #d5eadf', borderRadius: 8, padding: '8px 0 4px', marginBottom: 12 }}>
        <Form layout="horizontal">
          <Form.Header>Клієнт</Form.Header>
          <Form.Item label="Ім'я">
            <Input value={customerName} onChange={setCustomerName} placeholder="Ім'я клієнта" />
          </Form.Item>
          <Form.Item label="Телефон">
            <Input value={tel} onChange={setTel} onBlur={searchCustomer} placeholder="+380..." />
          </Form.Item>
          {foundCustomer && (
            <div style={{ padding: '4px 12px', fontSize: 12, color: '#00b578' }}>
              Знайдено: {foundCustomer.name} ({foundCustomer.tel})
            </div>
          )}
          <Form.Item label="Коментар">
            <TextArea value={customerComments} onChange={setCustomerComments} rows={1} />
          </Form.Item>
          <Form.Item label="Джерело">
            <Picker
              columns={[CUSTOMER_SOURCE_OPTIONS]}
              value={ref ? [ref] : []}
              onConfirm={(value) => setRef(String(value[0] || ''))}
            >
              {(_, actions) => (
                <span onClick={actions.open} style={{ cursor: 'pointer' }}>
                  {ref || 'Оберіть джерело'}
                </span>
              )}
            </Picker>
          </Form.Item>
          <Form.Item label="Група">
            <Selector
              options={[{ label: 'Так', value: 1 }, { label: 'Ні', value: 0 }]}
              value={[groupFlag]}
              onChange={(value) => setGroupFlag(value[0] ?? 0)}
            />
          </Form.Item>
        </Form>
      </div>

      <Form layout="horizontal">
        <Form.Header>Бронювання</Form.Header>
        <Form.Item label="Сервіс">
          <Picker
            columns={[services.map((service) => ({ label: service.name, value: service.id }))]}
            value={serviceId ? [serviceId] : []}
            onConfirm={(value) => {
              setServiceId(value[0] as number);
              setProductId(null);
              setPriceManual(false);
            }}
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
            columns={[serviceProducts.map((product) => ({ label: `${product.name} (${product.price} грн)`, value: product.id }))]}
            value={productId ? [productId] : []}
            onConfirm={(value) => {
              setProductId(value[0] as number);
              setPriceManual(false);
            }}
          >
            {(_, actions) => (
              <span onClick={actions.open} style={{ cursor: 'pointer' }}>
                {serviceProducts.find((product) => product.id === productId)?.name || 'Оберіть продукт'}
              </span>
            )}
          </Picker>
        </Form.Item>
        {selectedProduct && (
          <Form.Item label="Ціна продукту">
            <span>{formatPrice(selectedProduct.price)} / pax</span>
          </Form.Item>
        )}
        <Form.Item label="Дата">
          <Input type="date" value={dateStart} onChange={setDateStart} />
        </Form.Item>
        <Form.Item label="Час">
          <Picker
            columns={[timeSlots.map((time) => ({ label: time, value: time }))]}
            value={startTime ? [startTime] : []}
            onConfirm={(value) => setStartTime(value[0] as string)}
          >
            {(_, actions) => (
              <span onClick={actions.open} style={{ cursor: 'pointer' }}>
                {startTime || 'Оберіть час'}
              </span>
            )}
          </Picker>
        </Form.Item>
        <Form.Item label="Кількість">
          <Stepper
            min={1}
            max={maxPax}
            value={pax}
            onChange={(value) => {
              setPax(value);
              setPriceManual(false);
            }}
          />
        </Form.Item>
        <Form.Item label="Аванс, грн">
          <Input type="number" value={String(avans)} onChange={(value) => setAvans(Number(value) || 0)} />
        </Form.Item>
        <Form.Item label="Знижка">
          <Selector
            options={ALLOWED_DISCOUNTS.map((value) => ({ label: value === 0 ? 'Без знижки' : `${value}%`, value }))}
            value={[discount]}
            onChange={(value) => {
              setDiscount(value[0] ?? 0);
              setPriceManual(false);
            }}
          />
        </Form.Item>
        <Form.Item label="Ціна">
          <Input
            type="number"
            value={soldpriceInput}
            onChange={(value) => {
              setSoldpriceInput(value);
              setPriceManual(true);
            }}
            placeholder="0"
          />
        </Form.Item>
        <Form.Item label="Канал">
          <Selector
            options={Object.entries(CANAL_LABELS).map(([key, value]) => ({ label: value, value: Number(key) }))}
            value={canal ? [canal] : []}
            onChange={(value) => setCanal(value[0])}
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
        {isEdit ? 'Зберегти' : 'Створити'}
      </Button>
    </div>
  );
}
