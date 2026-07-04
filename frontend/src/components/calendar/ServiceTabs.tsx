import { useEffect, useMemo, useState } from 'react';
import { useServicesStore } from '@/stores/services';
import { getBookings } from '@/api/bookings';
import { BOOKING_STATUS } from '@/types';

export default function ServiceTabs() {
  const { services, activeServiceId, setActiveService, fetchServices } = useServicesStore();
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (services.length === 0) fetchServices();
  }, []);

  useEffect(() => {
    const handleReadUpdate = () => setRefreshKey((value) => value + 1);
    window.addEventListener('booking-reads-updated', handleReadUpdate);
    return () => window.removeEventListener('booking-reads-updated', handleReadUpdate);
  }, []);

  useEffect(() => {
    let active = true;

    if (services.length === 0) {
      setUnreadCounts({});
      return () => { active = false; };
    }

    getBookings({ unread_only: '1' })
      .then((res) => {
        if (!active) return;

        const nextCounts: Record<number, number> = {};
        for (const booking of res.data) {
          if (booking.status === BOOKING_STATUS.canceled) continue;
          nextCounts[booking.service_id] = (nextCounts[booking.service_id] || 0) + 1;
        }
        setUnreadCounts(nextCounts);
      })
      .catch(() => {
        if (active) setUnreadCounts({});
      });

    return () => { active = false; };
  }, [services.length, refreshKey]);

  const availableServiceIds = useMemo(() => new Set(services.map((service) => service.id)), [services]);
  const getUnreadCount = (serviceId: number) => availableServiceIds.has(serviceId) ? unreadCounts[serviceId] || 0 : 0;
  const formatUnreadCount = (count: number) => count > 99 ? '99+' : String(count);

  return (
    <div className="service-tabs">
      {services.map((svc) => {
        const unreadCount = getUnreadCount(svc.id);

        return (
          <div
            key={svc.id}
            className={`service-tab ${svc.id === activeServiceId ? 'active' : ''}`}
            style={{
              borderBottomColor: svc.id === activeServiceId ? (svc.color || '#1677ff') : 'transparent',
            }}
            onClick={() => setActiveService(svc.id)}
          >
            {svc.icon && <span style={{ marginRight: 4 }}>{svc.icon}</span>}
            {svc.name}
            {unreadCount > 0 && <span className="service-tab-alert">{formatUnreadCount(unreadCount)}</span>}
          </div>
        );
      })}
    </div>
  );
}
