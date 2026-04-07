import { NavBar } from 'antd-mobile';
import { useNavigate } from 'react-router-dom';
import { useBookingsStore } from '@/stores/bookings';
import { formatDate } from '@/utils/format';

export default function Header() {
  const navigate = useNavigate();
  const { date, nextDay, prevDay } = useBookingsStore();

  return (
    <NavBar
      backIcon={null}
      left={
        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/search')}>
          <img src="/icons/search-2903.png" alt="Пошук" style={{ width: 24, height: 24 }} />
        </span>
      }
      right={
        <span style={{ cursor: 'pointer' }} onClick={() => navigate('/month')}>
          <img src="/icons/calendar-and-check-mark-11031.png" alt="Місяць" style={{ width: 24, height: 24 }} />
        </span>
      }
      style={{ borderBottom: '1px solid #eee' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <span style={{ cursor: 'pointer', fontSize: 18 }} onClick={prevDay}>
          ◀
        </span>
        <span style={{ fontWeight: 600, fontSize: 16 }}>{formatDate(date)}</span>
        <span style={{ cursor: 'pointer', fontSize: 18 }} onClick={nextDay}>
          ▶
        </span>
      </div>
    </NavBar>
  );
}
