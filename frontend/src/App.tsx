import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import AppShell from '@/components/layout/AppShell';
import LoginPage from '@/pages/LoginPage';
import CalendarPage from '@/pages/CalendarPage';
import MonthViewPage from '@/pages/MonthViewPage';
import BookingFormPage from '@/pages/BookingFormPage';
import BookingDetailPage from '@/pages/BookingDetailPage';
import ClientsPage from '@/pages/ClientsPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SettingsPage from '@/pages/SettingsPage';
import SearchPage from '@/pages/SearchPage';
import { ROLE } from '@/types';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user || user.type !== ROLE.admin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function ManagerRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user || user.type === ROLE.instructor) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<CalendarPage />} />
          <Route path="/month" element={<MonthViewPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/bookings/:id" element={<BookingDetailPage />} />
          <Route
            path="/bookings/new"
            element={<ManagerRoute><BookingFormPage /></ManagerRoute>}
          />
          <Route
            path="/bookings/:id/edit"
            element={<ManagerRoute><BookingFormPage /></ManagerRoute>}
          />
          <Route
            path="/clients"
            element={<ManagerRoute><ClientsPage /></ManagerRoute>}
          />
          <Route
            path="/clients/:id"
            element={<ManagerRoute><ClientsPage /></ManagerRoute>}
          />
          <Route
            path="/analytics"
            element={<ManagerRoute><AnalyticsPage /></ManagerRoute>}
          />
          <Route
            path="/settings"
            element={<AdminRoute><SettingsPage /></AdminRoute>}
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
