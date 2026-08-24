import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import Logo from '../../components/Logo';

export default function ChangePasswordPage() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (form.newPassword !== form.confirm) {
      setError('New password and confirmation do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      updateUser({ mustChangePassword: false });
      setSuccess('Password updated. Redirecting…');
      setTimeout(() => {
        if (user.role === 'super_admin') navigate('/super-admin/dashboard');
        else if (user.role === 'admin') navigate('/admin/dashboard');
        else navigate('/student/dashboard');
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-4">
          <Logo size={60} />
          <h2 className="mt-2 font-bold text-maroon text-lg">Change Password</h2>
          {user?.mustChangePassword && (
            <p className="text-sm text-amber-600 text-center mt-1">
              For your security, you must set a new password before continuing.
            </p>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Current Password</label>
            <input
              required
              type="password"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              className="mt-1 w-full border rounded px-3 py-2"
              placeholder={user?.mustChangePassword ? 'Your phone number (initial password)' : ''}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">New Password</label>
            <input
              required
              minLength={8}
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Confirm New Password</label>
            <input
              required
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {success && <p className="text-green-600 text-sm">{success}</p>}
          <button
            disabled={loading}
            className="w-full bg-maroon hover:bg-maroon-light text-white font-semibold py-2.5 rounded disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Update Password'}
          </button>
          {!user?.mustChangePassword && (
            <button type="button" onClick={logout} className="w-full text-sm text-gray-500 mt-2">
              Cancel and logout
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
