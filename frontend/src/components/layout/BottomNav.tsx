import { TabBar } from 'antd-mobile';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import { ROLE } from '@/types';

const iconStyle = { width: 28, height: 28 };
const addIconStyle = { width: 40, height: 40, transform: 'translateY(-20%)' };

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  if (!user) return null;

  const tabs = [
    ...(user.type !== ROLE.instructor
      ? [{ key: '/clients', icon: <img src="/icons/network-team-308.png" alt="Клієнти" style={iconStyle} /> }]
      : []),
    ...(user.type !== ROLE.instructor
      ? [{ key: '/analytics', icon: <img src="/icons/chart-646.png" alt="Аналітика" style={iconStyle} /> }]
      : []),
    ...(user.type !== ROLE.instructor
      ? [{ key: '/bookings/new', icon: <img src="/icons/yellow-add-button-12022.png" alt="Додати" style={addIconStyle} /> }]
      : []),
    { key: '/', icon: <img src="/icons/calendar-and-check-mark-11031.png" alt="Календар" style={iconStyle} /> },
    ...(user.type === ROLE.admin
      ? [{ key: '/settings', icon: <img src="/icons/open-menu-6207.png" alt="Налаштування" style={iconStyle} /> }]
      : []),
  ];

  return (
    <TabBar
      activeKey={location.pathname}
      onChange={(key) => navigate(key)}
      style={{
        borderTop: '1px solid #eee',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map((tab) => (
        <TabBar.Item
          key={tab.key}
          icon={tab.icon}
        />
      ))}
    </TabBar>
  );
}
