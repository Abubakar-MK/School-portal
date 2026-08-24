import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../../components/Logo';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'staff' ? 'staff' : 'student';
  const [tab, setTab] = useState(initialTab);
  const [form, setForm] = useState({ username: '', matricNumber: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { staffLogin, studentLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let loggedInUser;
      if (tab === 'student') {
        loggedInUser = await studentLogin(form.matricNumber.trim(), form.password);
      } else {
        loggedInUser = await staffLogin(form.username.trim(), form.password);
      }
      if (loggedInUser.mustChangePassword) {
        navigate('/change-password');
        return;
      }
      if (loggedInUser.role === 'super_admin') navigate('/super-admin/dashboard');
      else if (loggedInUser.role === 'admin') navigate('/admin/dashboard');
      else navigate('/student/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-maroon-dark to-maroon px-4">
      <a href="/" className="text-gold-light text-sm mb-4 hover:underline">&larr; Back to Home</a>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-maroon-dark py-6 flex flex-col items-center text-white">
          <Logo size={80} />
          <h1 className="mt-3 font-bold text-center text-sm px-6">
            HIGHER GROUND COLLEGE OF HEALTH AND MANAGEMENT SCIENCES TAKUM
          </h1>
          <p className="text-xs text-gold-light">Student Result Management Portal</p>
        </div>

        <div className="flex border-b">
          {['student', 'staff'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold ${
                tab === t ? 'text-maroon border-b-2 border-maroon' : 'text-gray-400'
              }`}
            >
              {t === 'student' ? 'Student Login' : 'Admin / Super Admin Login'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {tab === 'student' ? (
            <div>
              <label className="text-sm font-medium text-gray-600">Matriculation Number</label>
              <input
                required
                value={form.matricNumber}
                onChange={(e) => setForm({ ...form, matricNumber: e.target.value })}
                placeholder="HGCET/CSC/2026/001"
                className="mt-1 w-full border rounded px-3 py-2 focus:outline-maroon"
              />
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-gray-600">Username</label>
              <input
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="mt-1 w-full border rounded px-3 py-2 focus:outline-maroon"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-600">Password</label>
            <input
              required
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={tab === 'student' ? 'Initial password is your phone number' : ''}
              className="mt-1 w-full border rounded px-3 py-2 focus:outline-maroon"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            disabled={loading}
            className="w-full bg-maroon hover:bg-maroon-light text-white font-semibold py-2.5 rounded disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
