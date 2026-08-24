import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout({ children, subtitle }) {
  const { user, logout } = useAuth();
  return (
    <div className="flex min-h-screen bg-gray-100">
      <div className="no-print">
        <Sidebar role={user?.role} name={user?.fullName || user?.username} subtitle={subtitle} onLogout={logout} />
      </div>
      <main className="flex-1">{children}</main>
    </div>
  );
}
