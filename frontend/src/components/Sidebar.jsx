import { NavLink } from 'react-router-dom';
import Logo from './Logo';

const NAV = {
  super_admin: [
    { to: '/super-admin/dashboard', label: 'Dashboard' },
    { to: '/super-admin/students', label: 'Students' },
    { to: '/super-admin/admins', label: 'Admins' },
    { to: '/super-admin/academic-structure', label: 'Academic Structure' },
    { to: '/super-admin/courses', label: 'Courses' },
    { to: '/super-admin/results-approval', label: 'Result Approval' },
    { to: '/super-admin/published-results', label: 'Published Results' },
    { to: '/super-admin/reports', label: 'Reports' },
    { to: '/super-admin/audit-logs', label: 'Audit Logs' },
    { to: '/change-password', label: 'Change Password' },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/students', label: 'Students' },
    { to: '/admin/students/register', label: 'Register Student' },
    { to: '/admin/students/bulk-upload', label: 'Bulk Upload Students' },
    { to: '/admin/results', label: 'Enter Results' },
    { to: '/admin/results?status=submitted', label: 'Submitted Results' },
    { to: '/change-password', label: 'Change Password' },
  ],
  student: [
    { to: '/student/dashboard', label: 'Dashboard' },
    { to: '/student/current-result', label: 'My Results' },
    { to: '/change-password', label: 'Change Password' },
  ],
};

export default function Sidebar({ role, name, subtitle, onLogout }) {
  const items = NAV[role] || [];
  return (
    <aside className="w-64 min-h-screen bg-maroon-dark text-white flex flex-col">
      <div className="flex flex-col items-center py-6 border-b border-white/10">
        <Logo size={70} />
        {name && (
          <>
            <div className="mt-3 font-semibold text-center px-2">{name}</div>
            {subtitle && <div className="text-xs text-gold-light">{subtitle}</div>}
          </>
        )}
      </div>
      <nav className="flex-1 py-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block px-6 py-3 text-sm border-l-4 transition ${
                isActive
                  ? 'bg-white/10 border-gold text-gold-light font-semibold'
                  : 'border-transparent hover:bg-white/5'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={onLogout}
        className="m-4 px-4 py-2 bg-maroon-light hover:bg-maroon rounded text-sm font-medium"
      >
        Logout
      </button>
    </aside>
  );
}
