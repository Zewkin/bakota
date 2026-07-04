import dayjs from 'dayjs';
import type { Booking, Product } from '@/types';
import { BOOKING_STATUS } from '@/types';

interface Props {
  booking: Booking;
  product?: Product;
  onClick: (booking: Booking) => void;
}

export default function BookingCell({ booking, product, onClick }: Props) {
  const hours = product?.hours || 1;

  const now = dayjs();
  const bookingEnd = dayjs(`${booking.date_start} ${booking.start_time}`).add(hours, 'hour');
  const isPast = bookingEnd.isBefore(now);
  const isCanceled = booking.status === BOOKING_STATUS.canceled;

  const isUnread = !booking.is_read;
  const bgColor = isPast ? '#b8bec6' : product?.booking_color || '#1677ff';

  const classes = [
    'booking-cell',
    isPast && 'past',
    isCanceled && 'canceled',
    isUnread && 'unread',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      style={{ backgroundColor: bgColor }}
      onClick={(e) => { e.stopPropagation(); onClick(booking); }}
    >
      <div className="booking-title">{booking.customer_name}</div>
      <div className="booking-meta">
        <span>{booking.pax || 1} pax</span>
        {product?.name && <span>{product.name}</span>}
      </div>
    </div>
  );
}
