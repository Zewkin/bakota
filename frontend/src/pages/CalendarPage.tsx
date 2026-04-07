import { useEffect } from 'react';
import { SpinLoading } from 'antd-mobile';
import { useBookingsStore } from '@/stores/bookings';
import { useServicesStore } from '@/stores/services';
import ServiceTabs from '@/components/calendar/ServiceTabs';
import DayCalendar from '@/components/calendar/DayCalendar';

export default function CalendarPage() {
  const { date, bookings, blockedTimes, loading, fetchBookings, fetchBlockedTime } = useBookingsStore();
  const { services, products, activeServiceId, fetchServices, fetchProducts } = useServicesStore();

  useEffect(() => {
    if (services.length === 0) fetchServices();
    if (products.length === 0) fetchProducts();
  }, []);

  useEffect(() => {
    if (activeServiceId) {
      fetchBookings(activeServiceId);
      fetchBlockedTime(activeServiceId);
    }
  }, [activeServiceId, date]);

  const activeService = services.find((s) => s.id === activeServiceId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ServiceTabs />
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <SpinLoading />
        </div>
      )}
      {!loading && activeService && (
        <DayCalendar
          service={activeService}
          bookings={bookings}
          products={products}
          blockedTimes={blockedTimes}
          date={date}
        />
      )}
    </div>
  );
}
