import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';

import StudentDashboard from './pages/student/StudentDashboard';
import CurrentResultPage from './pages/student/CurrentResultPage';

import AdminDashboard from './pages/admin/AdminDashboard';
import RegisterStudentPage from './pages/admin/RegisterStudentPage';
import BulkUploadStudentsPage from './pages/admin/BulkUploadStudentsPage';
import ResultEntryPage from './pages/admin/ResultEntryPage';
import StudentsListPage from './pages/admin/StudentsListPage';

import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import AdminsPage from './pages/superadmin/AdminsPage';
import AcademicStructurePage from './pages/superadmin/AcademicStructurePage';
import CoursesPage from './pages/superadmin/CoursesPage';
import ResultApprovalPage from './pages/superadmin/ResultApprovalPage';
import PublishedResultsPage from './pages/superadmin/PublishedResultsPage';
import ReportsPage from './pages/superadmin/ReportsPage';
import AuditLogsPage from './pages/superadmin/AuditLogsPage';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <LandingPage />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  if (user.role === 'super_admin') return <Navigate to="/super-admin/dashboard" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Change password is reachable regardless of role or forced-reset state */}
      <Route path="/change-password" element={<ChangePasswordGate />} />

      {/* Student */}
      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/current-result" element={<CurrentResultPage />} />
      </Route>

      {/* Admin */}
      <Route element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} />}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/students" element={<StudentsListPage />} />
        <Route path="/admin/results" element={<ResultEntryPage />} />
      </Route>

      {/* Register Student / Bulk Upload — Admin only, not Super Admin (per school policy) */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin/students/register" element={<RegisterStudentPage />} />
        <Route path="/admin/students/bulk-upload" element={<BulkUploadStudentsPage />} />
      </Route>

      {/* Super Admin */}
      <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
        <Route path="/super-admin/dashboard" element={<SuperAdminDashboard />} />
        <Route path="/super-admin/students" element={<StudentsListPage />} />
        <Route path="/super-admin/admins" element={<AdminsPage />} />
        <Route path="/super-admin/academic-structure" element={<AcademicStructurePage />} />
        <Route path="/super-admin/courses" element={<CoursesPage />} />
        <Route path="/super-admin/results-approval" element={<ResultApprovalPage />} />
        <Route path="/super-admin/published-results" element={<PublishedResultsPage />} />
        <Route path="/super-admin/reports" element={<ReportsPage />} />
        <Route path="/super-admin/audit-logs" element={<AuditLogsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/** Change password must be reachable even when mustChangePassword blocks other routes. */
function ChangePasswordGate() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <ChangePasswordPage />;
}
