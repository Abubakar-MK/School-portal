import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * This ONLY controls what the frontend renders for convenience/UX.
 * It is not a security boundary — every API route independently
 * re-verifies role and ownership server-side (see backend/src/middleware/auth.js).
 * A person could disable this component entirely and still gain nothing,
 * because the API would still reject unauthorized requests.
 */
export default function ProtectedRoute({ allowedRoles }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }
  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }
  return <Outlet />;
}
