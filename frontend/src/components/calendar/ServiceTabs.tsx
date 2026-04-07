import { useEffect } from 'react';
import { useServicesStore } from '@/stores/services';

export default function ServiceTabs() {
  const { services, activeServiceId, setActiveService, fetchServices } = useServicesStore();

  useEffect(() => {
    if (services.length === 0) fetchServices();
  }, []);

  return (
    <div className="service-tabs">
      {services.map((svc) => (
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
        </div>
      ))}
    </div>
  );
}
