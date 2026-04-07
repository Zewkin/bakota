import dayjs from 'dayjs';
import type { Booking, Product } from '@/types';
import { BOOKING_STATUS } from '@/types';

interface Props {
  booking: Booking;
  product?: Product;
  slotHeight: number;
  onClick: (booking: Booking) => void;
}

export default function BookingCell({ booking, product, slotHeight, onClick }: Props) {
  const hours = product?.hours || 1;
  const heightSlots = hours * 2; // 30-min per slot
  const height = heightSlots * slotHeight - 2;

  const now = dayjs();
  const bookingEnd = dayjs(`${booking.date_start} ${booking.start_time}`).add(hours, 'hour');
  const isPast = bookingEnd.isBefore(now);
  const isCanceled = booking.status === BOOKING_STATUS.canceled;

  const bgColor = product?.booking_color || '#1677ff';

  const isUnread = !booking.is_read;

  const classes = [
    'booking-cell',
    isPast && 'past',
    isCanceled && 'canceled',
    isUnread && 'unread',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      style={{ backgroundColor: bgColor, height }}
      onClick={(e) => { e.stopPropagation(); onClick(booking); }}
    >
      <div>{booking.customer_name}</div>
      {booking.pax > 1 && <div>{booking.pax} ос.</div>}
    </div>
  );
}
