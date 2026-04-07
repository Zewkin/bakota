import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Dialog, Toast, Tag, Divider } from 'antd-mobile';
import { getBooking, markBookingRead, setBookingStatus, closeBooking, getBookingMessage } from '@/api/bookings';
import { useAuthStore } from '@/stores/auth';
import { canSeeFinancials, canCreateBooking } from '@/utils/roles';
import { formatDateFull, formatTime, formatPrice } from '@/utils/format';
import { STATUS_LABELS, CANAL_LABELS, BOOKING_STATUS } from '@/types';
import type { Booking } from '@/types';
import type { CloseBookingPayload } from '@/api/bookings';
import CloseBookingForm from '@/components/booking/CloseBookingForm';
import BookingMessage from '@/components/booking/BookingMessage';

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [showClose, setShowClose] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getBooking(Number(id));
      setBooking(res.data);
      markBookingRead(Number(id)).catch(() => {});
    } catch {
      Toast.show({ content: 'Бронювання не знайдено', icon: 'fail' });
      navigate('/', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleCancel = async () => {
    const confirmed = await Dialog.confirm({ content: 'Скасувати бронювання?' });
    if (!confirmed || !booking) return;
    await setBookingStatus(booking.id, BOOKING_STATUS.canceled);
    Toast.show({ content: 'Скасовано', icon: 'success' });
    load();
  };

  const handleClose = async (data: CloseBookingPayload) => {
    if (!booking) return;
    await closeBooking(booking.id, data);
    Toast.show({ content: 'Закрито', icon: 'success' });
    setShowClose(false);
    load();
  };

  const handleGetMessage = async () => {
    if (!booking) return;
    const res = await getBookingMessage(booking.id);
    setMessage(res.data.message);
    setShowMessage(true);
  };

  if (loading || !booking) return <div style={{ padding: 24, textAlign: 'center' }}>Завантаження...</div>;

  const showFinancials = user && canSeeFinancials(user.type);
  const canEdit = user && canCreateBooking(user.type);
  const isOpen = booking.status === BOOKING_STATUS.booked;

  const statusColor = booking.status === 1 ? '#1677ff' : booking.status === 2 ? '#ff3141' : '#00b578';

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3>Бронювання #{booking.id}</h3>
        <Tag color={statusColor}>{STATUS_LABELS[booking.status] || booking.status}</Tag>
      </div>

      <div style={{ fontSize: 14, lineHeight: 2 }}>
        <div><b>Клієнт:</b> {booking.customer_name}</div>
        <div><b>Телефон:</b> <a href={`tel:${booking.customer_tel}`}>{booking.customer_tel}</a></div>
        <div><b>Сервіс:</b> {booking.service_name}</div>
        <div><b>Продукт:</b> {booking.product_name}</div>
        <div><b>Дата:</b> {formatDateFull(booking.date_start)}</div>
        <div><b>Час:</b> {formatTime(booking.start_time)}</div>
        <div><b>Кількість:</b> {booking.pax} ос.</div>
        {booking.canal && <div><b>Канал:</b> {CANAL_LABELS[booking.canal] || booking.canal}</div>}
        {booking.comments && <div><b>Коментар:</b> {booking.comments}</div>}
        {booking.instructor && <div><b>Інструктор:</b> {booking.instructor}</div>}

        {showFinancials && (
          <>
            <Divider />
            {booking.avans !== undefined && <div><b>Аванс:</b> {formatPrice(booking.avans)}</div>}
            {booking.discount !== undefined && <div><b>Знижка:</b> {booking.discount}%</div>}
            {booking.soldprice != null && <div><b>Сума:</b> {formatPrice(booking.soldprice)}</div>}
          </>
        )}
      </div>

      <Divider />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Button block onClick={handleGetMessage}>SMS повідомлення</Button>

        {canEdit && isOpen && (
          <>
            <Button block color="success" onClick={() => setShowClose(true)}>Закрити</Button>
            <Button block color="danger" onClick={handleCancel}>Скасувати</Button>
          </>
        )}
      </div>

      {showClose && (
        <CloseBookingForm
          visible={showClose}
          onClose={() => setShowClose(false)}
          onSubmit={handleClose}
          currentDiscount={booking.discount}
        />
      )}

      {showMessage && (
        <BookingMessage
          visible={showMessage}
          message={message}
          onClose={() => setShowMessage(false)}
        />
      )}
    </div>
  );
}
