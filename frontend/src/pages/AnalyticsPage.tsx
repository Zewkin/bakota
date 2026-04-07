import { useState, useEffect } from 'react';
import { Tabs, SpinLoading, Card, Switch } from 'antd-mobile';
import { getManagerAnalytics, getServiceAnalytics } from '@/api/analytics';
import { getUsers } from '@/api/users';
import { getServices } from '@/api/services';
import { formatPrice } from '@/utils/format';
import dayjs from 'dayjs';
import type { ManagerAnalytics, ServiceAnalytics, User, Service } from '@/types';

export default function AnalyticsPage() {
  const [tab, setTab] = useState('managers');
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [compare, setCompare] = useState(false);
  const [managerData, setManagerData] = useState<ManagerAnalytics[]>([]);
  const [managerPrev, setManagerPrev] = useState<ManagerAnalytics[]>([]);
  const [serviceData, setServiceData] = useState<ServiceAnalytics[]>([]);
  const [servicePrev, setServicePrev] = useState<ServiceAnalytics[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServicesData] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getUsers().then((r) => setUsers(r.data)).catch(() => {});
    getServices().then((r) => setServicesData(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: any = { from, to };
    if (compare) params.compare = '1';

    if (tab === 'managers') {
      getManagerAnalytics(params)
        .then((r) => {
          if (compare && !Array.isArray(r.data)) {
            setManagerData(r.data.current);
            setManagerPrev(r.data.previous);
          } else {
            setManagerData(Array.isArray(r.data) ? r.data : r.data.current);
            setManagerPrev([]);
          }
        })
        .finally(() => setLoading(false));
    } else {
      getServiceAnalytics(params)
        .then((r) => {
          if (compare && !Array.isArray(r.data)) {
            setServiceData(r.data.current);
            setServicePrev(r.data.previous);
          } else {
            setServiceData(Array.isArray(r.data) ? r.data : r.data.current);
            setServicePrev([]);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [tab, from, to, compare]);

  const userName = (id: number) => users.find((u) => u.id === id)?.login || `#${id}`;
  const serviceName = (id: number) => services.find((s) => s.id === id)?.name || `#${id}`;

  const prevYear = dayjs(from).subtract(1, 'year').format('YYYY');

  const renderDiff = (current: number, previous: number | undefined) => {
    if (previous === undefined || previous === 0) return null;
    const diff = current - previous;
    const pct = Math.round((diff / previous) * 100);
    const color = diff >= 0 ? '#00b578' : '#ff3141';
    const sign = diff >= 0 ? '+' : '';
    return <span style={{ fontSize: 11, color, marginLeft: 4 }}>{sign}{pct}%</span>;
  };

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Аналітика</h3>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ flex: 1, padding: 6, borderRadius: 4, border: '1px solid #ddd' }} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ flex: 1, padding: 6, borderRadius: 4, border: '1px solid #ddd' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13 }}>
        <Switch checked={compare} onChange={setCompare} style={{ '--height': '24px', '--width': '40px' } as any} />
        <span>Порівняти з {prevYear} р.</span>
      </div>
      <Tabs activeKey={tab} onChange={setTab}>
        <Tabs.Tab title="Менеджери" key="managers" />
        <Tabs.Tab title="Сервіси" key="services" />
      </Tabs>
      {loading && <div style={{ textAlign: 'center', padding: 24 }}><SpinLoading /></div>}

      {!loading && tab === 'managers' && managerData.map((m) => {
        const prev = managerPrev.find((p) => p.manager_id === m.manager_id);
        return (
          <Card key={m.manager_id} style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 600 }}>{userName(m.manager_id)}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
              <span>Бронювань: {m.total_count}{compare && renderDiff(m.total_count, prev?.total_count)}</span>
              <span>Сума: {formatPrice(m.total_amount)}{compare && renderDiff(m.total_amount, prev?.total_amount)}</span>
            </div>
            <div style={{ fontSize: 13, marginTop: 2 }}>
              <span>Комісія: {formatPrice(m.total_commission)}{compare && renderDiff(m.total_commission, prev?.total_commission)}</span>
            </div>
            {compare && prev && (
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                {prevYear}: {prev.total_count} бр. | {formatPrice(prev.total_amount)} | К: {formatPrice(prev.total_commission)}
              </div>
            )}
          </Card>
        );
      })}

      {!loading && tab === 'services' && serviceData.map((s) => {
        const prev = servicePrev.find((p) => p.service_id === s.service_id);
        return (
          <Card key={s.service_id} style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 600 }}>{serviceName(s.service_id)}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
              <span>Всього: {s.total_count}{compare && renderDiff(s.total_count, prev?.total_count)}</span>
              <span>Турів: {s.total_tour}{compare && renderDiff(s.total_tour, prev?.total_tour)}</span>
              <span>Оренд: {s.total_rent}{compare && renderDiff(s.total_rent, prev?.total_rent)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 2 }}>
              <span>Людей: {s.total_pax}{compare && renderDiff(s.total_pax, prev?.total_pax)}</span>
              <span>Сума: {formatPrice(s.total_amount)}{compare && renderDiff(s.total_amount, prev?.total_amount)}</span>
            </div>
            {compare && prev && (
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                {prevYear}: {prev.total_count} бр. | {prev.total_pax} люд. | {formatPrice(prev.total_amount)}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
