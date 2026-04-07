import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';

export default function AppShell() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <Header />
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
