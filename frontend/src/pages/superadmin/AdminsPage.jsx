import { useEffect, useState } from 'react';
import api from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import Header from '../../components/Header';

export default function AdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState({ username: '', fullName: '', email: '', phone: '' });
  const [tempPassword, setTempPassword] = useState(null);
  const [error, setError] = useState('');

  const load = () => api.get('/admins').then((res) => setAdmins(res.data));
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setTempPassword(null);
    try {
      const { data } = await api.post('/admins', form);
      setTempPassword({ username: form.username, password: data.temporaryPassword });
      setForm({ username: '', fullName: '', email: '', phone: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create admin.');
    }
  };

  const toggleActive = async (id, isActive) => {
    await api.patch(`/admins/${id}/active`, { isActive: !isActive });
    load();
  };

  const deleteAdmin = async (a) => {
    if (!window.confirm(`Permanently delete admin "${a.full_name}" (${a.username})? This cannot be undone. Students they registered and results they submitted are kept.`)) return;
    await api.delete(`/admins/${a.id}`);
    load();
  };

  return (
    <DashboardLayout subtitle="Super Admin Portal">
      <Header title="Admins" />
      <div className="p-8 grid grid-cols-3 gap-6">
        <form onSubmit={handleCreate} className="bg-white rounded shadow p-5 space-y-3 col-span-1 h-fit">
          <h3 className="font-semibold text-gray-700">Create Admin</h3>
          <input required placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <input required placeholder="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="w-full bg-maroon text-white py-2 rounded font-semibold text-sm">Create Admin</button>
          {tempPassword && (
            <div className="text-xs bg-gold-light/40 border border-gold rounded p-2">
              Give these credentials to the new admin (shown once):<br />
              Username: <b>{tempPassword.username}</b><br />
              Temporary password: <b>{tempPassword.password}</b>
            </div>
          )}
        </form>

        <div className="col-span-2 bg-white rounded shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-maroon text-white">
              <tr><Th>Username</Th><Th>Full Name</Th><Th>Email</Th><Th>Phone</Th><Th>Status</Th><Th>Action</Th></tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-b">
                  <Td>{a.username}</Td><Td>{a.full_name}</Td><Td>{a.email || '—'}</Td><Td>{a.phone || '—'}</Td>
                  <Td>{a.is_active ? 'Active' : 'Deactivated'}</Td>
                  <Td>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => toggleActive(a.id, a.is_active)} className="text-maroon underline text-xs">
                        {a.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                      <button onClick={() => deleteAdmin(a)} className="text-red-600 underline text-xs">
                        Delete
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Th({ children }) { return <th className="text-left px-3 py-2 text-xs">{children}</th>; }
function Td({ children }) { return <td className="px-3 py-2">{children}</td>; }
