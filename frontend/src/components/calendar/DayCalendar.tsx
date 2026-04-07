import { useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Dialog, Toast } from 'antd-mobile';
import type { Booking, Service, Product, BlockedTime } from '@/types';
import { generateTimeSlots, formatTime } from '@/utils/format';
import { createBlockedTime, deleteBlockedTime } from '@/api/blocked-time';
import { useBookingsStore } from '@/stores/bookings';
import BookingCell from './BookingCell';

interface Props {
  service: Service;
  bookings: Booking[];
  products: Product[];
  blockedTimes: BlockedTime[];
  date: string;
}

const SLOT_HEIGHT = 44;

export default function DayCalendar({ service, bookings, products, blockedTimes, date }: Props) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchBlockedTime = useBookingsStore((s) => s.fetchBlockedTime);
  const slots = useMemo(() => generateTimeSlots(service.start_time, service.end_time), [service]);
  const columns = Math.max(service.maxpax, 1);
  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  // Map bookings to columns (greedy: assign to first free column)
  const bookingLayout = useMemo(() => {
    const layout: { booking: Booking; col: number; slotIndex: number }[] = [];
    const colEndSlot = new Array(columns).fill(0);

    const sorted = [...bookings]
      .filter((b) => b.service_id === service.id)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    for (const bk of sorted) {
      const slotIndex = slots.findIndex((s) => s === formatTime(bk.start_time));
      if (slotIndex < 0) continue;

      const product = productMap[bk.product_id];
      const durationSlots = Math.ceil((product?.hours || 1) * 2);

      let col = -1;
      for (let c = 0; c < columns; c++) {
        if (colEndSlot[c] <= slotIndex) {
          col = c;
          break;
        }
      }
      if (col < 0) col = 0; // overflow, stack

      colEndSlot[col] = slotIndex + durationSlots;
      layout.push({ booking: bk, col, slotIndex });
    }
    return layout;
  }, [bookings, slots, columns, productMap, service.id]);

  // Build occupied slots map: key "slotIndex-col" -> booking
  const occupiedMap = useMemo(() => {
    const map = new Map<string, Booking>();
    for (const l of bookingLayout) {
      const product = productMap[l.booking.product_id];
      const durationSlots = Math.ceil((product?.hours || 1) * 2);
      for (let s = 0; s < durationSlots; s++) {
        map.set(`${l.slotIndex + s}-${l.col}`, l.booking);
      }
    }
    return map;
  }, [bookingLayout, productMap]);

  // Map blocked times to slots
  const blockedLayout = useMemo(() => {
    return blockedTimes
      .filter((bt) => {
        const blockDate = dayjs(bt.start).format('YYYY-MM-DD');
        return blockDate === date && bt.service_id === service.id;
      })
      .map((bt) => {
        const blockTime = dayjs(bt.start).format('HH:mm');
        const slotIndex = slots.findIndex((s) => s === blockTime);
        return { block: bt, slotIndex: slotIndex >= 0 ? slotIndex : 0 };
      });
  }, [blockedTimes, slots, date, service.id]);

  // Build set of blocked slot indices (all slots covered by blocked time)
  const blockedSlotSet = useMemo(() => {
    const set = new Set<number>();
    for (const bl of blockedLayout) {
      const durationSlots = Math.ceil(bl.block.blocked_hours * 2);
      for (let s = 0; s < durationSlots; s++) {
        set.add(bl.slotIndex + s);
      }
    }
    return set;
  }, [blockedLayout]);

  // Auto-scroll to current hour
  useEffect(() => {
    if (!containerRef.current) return;
    const now = dayjs();
    if (date !== now.format('YYYY-MM-DD')) return;
    const currentSlot = slots.findIndex((s) => s >= now.format('HH:mm'));
    if (currentSlot > 0) {
      containerRef.current.scrollTop = Math.max(0, (currentSlot - 2) * SLOT_HEIGHT);
    }
  }, [date, slots]);

  const handleCellClick = (slotIndex: number, colIndex: number, slotTime: string) => {
    const occupied = occupiedMap.get(`${slotIndex}-${colIndex}`);
    if (occupied) {
      navigate(`/bookings/${occupied.id}`);
      return;
    }

    // Check if slot is blocked
    if (blockedSlotSet.has(slotIndex)) {
      // Find the blocked time for this slot to offer deletion
      const bl = blockedLayout.find((b) => {
        const dur = Math.ceil(b.block.blocked_hours * 2);
        return slotIndex >= b.slotIndex && slotIndex < b.slotIndex + dur;
      });
      if (bl) {
        Dialog.confirm({
          content: `Цей час заблоковано${bl.block.comments ? ': ' + bl.block.comments : ''}. Розблокувати?`,
          confirmText: 'Розблокувати',
          cancelText: 'Скасувати',
          onConfirm: async () => {
            try {
              await deleteBlockedTime(bl.block.id);
              Toast.show({ content: 'Розблоковано' });
              fetchBlockedTime(service.id);
            } catch {
              Toast.show({ content: 'Помилка' });
            }
          },
        });
      }
      return;
    }

    navigate(`/bookings/new?service_id=${service.id}&date=${date}&time=${slotTime}`);
  };

  const handleCellLongPress = (slotIndex: number, slotTime: string) => {
    // Don't block if already blocked or has bookings
    if (blockedSlotSet.has(slotIndex)) return;

    Dialog.confirm({
      content: `Заблокувати час ${slotTime}?`,
      confirmText: 'Заблокувати',
      cancelText: 'Скасувати',
      onConfirm: async () => {
        // Ask for duration
        const result = await Dialog.confirm({
          content: 'На скільки годин?',
          confirmText: '2 години',
          cancelText: '1 годину',
        });
        const hours = result ? 2 : 1;
        try {
          await createBlockedTime({
            service_id: service.id,
            start: `${date} ${slotTime}:00`,
            blocked_hours: hours,
          });
          Toast.show({ content: 'Заблоковано' });
          fetchBlockedTime(service.id);
        } catch {
          Toast.show({ content: 'Помилка' });
        }
      },
    });
  };

  // Long press handler
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onPointerDown = (slotIndex: number, slotTime: string) => {
    longPressTimerRef.current = setTimeout(() => {
      handleCellLongPress(slotIndex, slotTime);
      longPressTimerRef.current = null;
    }, 600);
  };

  const onPointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <div ref={containerRef} style={{ overflow: 'auto', flex: 1 }}>
      <div
        className="day-calendar"
        style={{
          gridTemplateColumns: `44px repeat(${columns}, 1fr)`,
          position: 'relative',
        }}
      >
        {slots.map((time, si) => (
          <div key={time} className="time-slot">
            <div className="time-label" style={{ gridRow: si + 1, gridColumn: 1 }}>
              {time}
            </div>
            {Array.from({ length: columns }, (_, ci) => {
              const layout = bookingLayout.find((l) => l.slotIndex === si && l.col === ci);
              const isBlocked = blockedSlotSet.has(si);

              return (
                <div
                  key={ci}
                  className={`slot-cell${isBlocked ? ' slot-blocked' : ''}`}
                  style={{ gridRow: si + 1, gridColumn: ci + 2, ...(layout ? { zIndex: 1 } : {}) }}
                  onClick={() => handleCellClick(si, ci, time)}
                  onPointerDown={() => onPointerDown(si, time)}
                  onPointerUp={onPointerUp}
                  onPointerLeave={onPointerUp}
                >
                  {layout && (
                    <BookingCell
                      booking={layout.booking}
                      product={productMap[layout.booking.product_id]}
                      slotHeight={SLOT_HEIGHT}
                      onClick={(b) => navigate(`/bookings/${b.id}`)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Blocked time overlays spanning all columns */}
        {blockedLayout.map((bl) => {
          const heightSlots = bl.block.blocked_hours * 2;
          return (
            <div
              key={bl.block.id}
              className="blocked-overlay"
              style={{
                gridRow: `${bl.slotIndex + 1} / span ${heightSlots}`,
                gridColumn: `2 / -1`,
              }}
              onClick={() => {
                Dialog.confirm({
                  content: `Заблоковано${bl.block.comments ? ': ' + bl.block.comments : ''}. Розблокувати?`,
                  confirmText: 'Розблокувати',
                  cancelText: 'Скасувати',
                  onConfirm: async () => {
                    try {
                      await deleteBlockedTime(bl.block.id);
                      Toast.show({ content: 'Розблоковано' });
                      fetchBlockedTime(service.id);
                    } catch {
                      Toast.show({ content: 'Помилка' });
                    }
                  },
                });
              }}
            >
              {bl.block.comments || 'Заблоковано'}
            </div>
          );
        })}
      </div>
    </div>
  );
}
