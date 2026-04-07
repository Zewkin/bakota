import dayjs from 'dayjs';
import 'dayjs/locale/uk';

dayjs.locale('uk');

export const formatDate = (date: string) => dayjs(date).format('D MMMM');
export const formatDateFull = (date: string) => dayjs(date).format('DD.MM.YYYY');
export const formatTime = (time?: string | null) => (time || '').slice(0, 5);
export const formatPrice = (price: number | string | null | undefined) => `${Number(price || 0).toFixed(0)} грн`;

export function generateTimeSlots(startTime: string, endTime: string, stepMinutes = 30): string[] {
  const slots: string[] = [];
  let current = dayjs(`2000-01-01 ${startTime}`);
  const end = dayjs(`2000-01-01 ${endTime}`);
  while (current.isBefore(end)) {
    slots.push(current.format('HH:mm'));
    current = current.add(stepMinutes, 'minute');
  }
  return slots;
}
