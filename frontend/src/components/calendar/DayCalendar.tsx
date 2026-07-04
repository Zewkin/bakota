import { useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Dialog, Toast } from 'antd-mobile';
import { BOOKING_STATUS } from '@/types';
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
const TIME_LABEL_WIDTH = 48;
const CAPACITY_WIDTH = 54;

export default function DayCalendar({ service, bookings, products, blockedTimes, date }: Props) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchBlockedTime = useBookingsStore((s) => s.fetchBlockedTime);
  const slots = useMemo(() => generateTimeSlots(service.start_time, service.end_time), [service]);
  const capacity = Math.max(service.maxpax || 1, 1);
  const productMap = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const getDurationSlots = (product?: Product) => Math.max(1, Math.ceil((product?.hours || 1) * 2));

  // Put overlapping bookings into compact visual lanes. Capacity is shown separately.
  const bookingLayout = useMemo(() => {
    const sorted = [...bookings]
      .filter((b) => b.service_id === service.id)
      .map((booking) => {
        const slotIndex = slots.findIndex((s) => s === formatTime(booking.start_time));
        if (slotIndex < 0) return null;

        return {
          booking,
          slotIndex,
          durationSlots: getDurationSlots(productMap[booking.product_id]),
        };
      })
      .filter((item): item is { booking: Booking; slotIndex: number; durationSlots: number } => Boolean(item))
      .sort((a, b) => {
        const startDiff = a.slotIndex - b.slotIndex;
        if (startDiff !== 0) return startDiff;

        const durationDiff = b.durationSlots - a.durationSlots;
        if (durationDiff !== 0) return durationDiff;

        return a.booking.id - b.booking.id;
      });

    const groups: typeof sorted[] = [];
    let currentGroup: typeof sorted = [];
    let currentGroupEnd = -1;

    for (const item of sorted) {
      if (currentGroup.length > 0 && item.slotIndex >= currentGroupEnd) {
        groups.push(currentGroup);
        currentGroup = [];
      }

      currentGroup.push(item);
      currentGroupEnd = Math.max(currentGroupEnd, item.slotIndex + item.durationSlots);
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    const layout: {
      booking: Booking;
      lane: number;
      laneCount: number;
      slotIndex: number;
      durationSlots: number;
    }[] = [];

    for (const group of groups) {
      const laneEndSlots: number[] = [];
      const groupLayout: Omit<(typeof layout)[number], 'laneCount'>[] = [];

      for (const item of group) {
        const availableLane = laneEndSlots.findIndex((endSlot) => endSlot <= item.slotIndex);
        const lane = availableLane >= 0 ? availableLane : laneEndSlots.length;
        laneEndSlots[lane] = item.slotIndex + item.durationSlots;

        groupLayout.push({
          booking: item.booking,
          lane,
          slotIndex: item.slotIndex,
          durationSlots: item.durationSlots,
        });
      }

      const laneCount = Math.max(laneEndSlots.length, 1);
      for (const item of groupLayout) {
        layout.push({ ...item, laneCount });
      }
    }

    return layout;
  }, [bookings, slots, productMap, service.id]);

  const slotLoadMap = useMemo(() => {
    const map = new Map<number, number>();

    for (const booking of bookings) {
      if (booking.service_id !== service.id || booking.status === BOOKING_STATUS.canceled) continue;

      const slotIndex = slots.findIndex((s) => s === formatTime(booking.start_time));
      if (slotIndex < 0) continue;

      const durationSlots = getDurationSlots(productMap[booking.product_id]);
      for (let slot = 0; slot < durationSlots; slot++) {
        const key = slotIndex + slot;
        map.set(key, (map.get(key) || 0) + Number(booking.pax || 1));
      }
    }

    return map;
  }, [bookings, slots, productMap, service.id]);

  const activeBookingSlotSet = useMemo(() => {
    const set = new Set<number>();

    for (const layout of bookingLayout) {
      if (layout.booking.status === BOOKING_STATUS.canceled) continue;

      for (let slot = 0; slot < layout.durationSlots; slot++) {
        set.add(layout.slotIndex + slot);
      }
    }

    return set;
  }, [bookingLayout]);

  const getLaneStyle = (lane: number, laneCount: number) => {
    if (laneCount <= 1) {
      return { left: 0, width: '100%' };
    }

    const width = 100 / laneCount;
    return {
      left: `calc(${lane * width}% + 2px)`,
      width: `calc(${width}% - 4px)`,
    };
  };

  const getCapacityState = (slotIndex: number, isBlocked: boolean) => {
    if (isBlocked) return 'blocked';

    const occupied = slotLoadMap.get(slotIndex) || 0;
    if (occupied >= capacity) return 'full';
    if (occupied > 0) return 'busy';
    return 'free';
  };

  const getCapacityLabel = (slotIndex: number, isBlocked: boolean) => {
    if (isBlocked) return 'Блок';
    return `${slotLoadMap.get(slotIndex) || 0}/${capacity}`;
  };

  const getCapacityPercent = (slotIndex: number, isBlocked: boolean) => {
    if (isBlocked) return 100;
    return Math.min(((slotLoadMap.get(slotIndex) || 0) / capacity) * 100, 100);
  };

  // Long press blocks time; the flag prevents the following click from creating a booking.
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

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

  const handleCellClick = (slotIndex: number, slotTime: string) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

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
    if (activeBookingSlotSet.has(slotIndex)) return;

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

  const onPointerDown = (slotIndex: number, slotTime: string) => {
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      handleCellLongPress(slotIndex, slotTime);
      longPressTimerRef.current = null;
    }, 600);
  };

  const onPointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    } else if (longPressTriggeredRef.current) {
      setTimeout(() => {
        longPressTriggeredRef.current = false;
      }, 300);
    }
  };

  return (
    <div ref={containerRef} style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, WebkitOverflowScrolling: 'touch' }}>
      <div
        className="day-calendar"
        style={{
          gridTemplateColumns: `${TIME_LABEL_WIDTH}px minmax(0, 1fr) ${CAPACITY_WIDTH}px`,
          position: 'relative',
        }}
      >
        {slots.map((time, si) => (
          <div key={time} className="time-slot">
            <div className="time-label" style={{ gridRow: si + 1, gridColumn: 1 }}>
              {time}
            </div>
            {(() => {
              const isBlocked = blockedSlotSet.has(si);
              const capacityState = getCapacityState(si, isBlocked);

              return (
                <>
                  <div
                    className={`slot-cell${isBlocked ? ' slot-blocked' : ''}`}
                    style={{ gridRow: si + 1, gridColumn: 2 }}
                    onClick={() => handleCellClick(si, time)}
                    onPointerDown={() => onPointerDown(si, time)}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                  />
                  <div
                    className={`slot-capacity slot-capacity-${capacityState}`}
                    style={{ gridRow: si + 1, gridColumn: 3 }}
                    onClick={() => handleCellClick(si, time)}
                    onPointerDown={() => onPointerDown(si, time)}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                  >
                    <span>{getCapacityLabel(si, isBlocked)}</span>
                    <div className="slot-capacity-bar">
                      <div
                        className="slot-capacity-fill"
                        style={{ width: `${getCapacityPercent(si, isBlocked)}%` }}
                      />
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        ))}

        {slots.map((time, si) => (
          <div
            key={`divider-${time}`}
            className={`slot-divider${time.endsWith(':30') ? ' slot-divider-half' : ''}`}
            style={{ gridRow: si + 1, gridColumn: '1 / -1' }}
          />
        ))}

        {bookingLayout.map((layout) => (
          <div
            key={layout.booking.id}
            className="booking-span"
            style={{
              gridRow: `${layout.slotIndex + 1} / span ${layout.durationSlots}`,
              gridColumn: 2,
              ...getLaneStyle(layout.lane, layout.laneCount),
            }}
          >
            <BookingCell
              booking={layout.booking}
              product={productMap[layout.booking.product_id]}
              onClick={(b) => navigate(`/bookings/${b.id}`)}
            />
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
                gridColumn: `2 / 4`,
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
