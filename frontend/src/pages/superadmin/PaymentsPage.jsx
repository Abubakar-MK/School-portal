import { useEffect, useState } from 'react';
import api from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import Header from '../../components/Header';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get('/payments', { params: { status: statusFilter || undefined } })
      .then((res) => setPayments(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not load payments.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  const grantAccess = async (p) => {
    if (!window.confirm(`Grant ${p.first_name} ${p.last_name} access to view this result, regardless of payment status?`)) return;
    setError(''); setMessage('');
    try {
      await api.post(`/payments/results/${p.result_id}/grant-access`);
      setMessage('Access granted.');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not grant access.');
    }
  };

  const revokeAccess = async (p) => {
    if (!window.confirm(`Revoke ${p.first_name} ${p.last_name}\u2019s access to view this result?`)) return;
    setError(''); setMessage('');
    try {
      await api.post(`/payments/results/${p.result_id}/revoke-access`);
      setMessage('Access revoked.');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not revoke access.');
    }
  };

  const deletePayment = async (p) => {
    if (!window.confirm(`Permanently delete this payment record for ${p.first_name} ${p.last_name}? This cannot be undone.`)) return;
    setError(''); setMessage('');
    try {
      await api.delete(`/payments/${p.id}`);
      setMessage('Payment record deleted.');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete payment record.');
    }
  };

  return (
    <DashboardLayout subtitle="Super Admin Portal">
      <Header title="Payments" />
      <div className="p-8">
        <div className="flex items-center gap-2 mb-4">
          {['', 'success', 'failed', 'pending'].map((s) => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded text-xs font-semibold ${statusFilter === s ? 'bg-maroon text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {s ? s[0].toUpperCase() + s.slice(1) : 'All'}
            </button>
          ))}
        </div>

        {message && <p className="text-green-600 text-sm mb-2">{message}</p>}
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-maroon text-white">
              <tr>
                <Th>Student</Th><Th>Matric No.</Th><Th>Session</Th><Th>Semester</Th>
                <Th>Amount</Th><Th>Status</Th><Th>Date</Th><Th>Access</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {!loading && payments.length === 0 && (
                <tr><td colSpan={9} className="p-4 text-gray-500">No payments found.</td></tr>
              )}
              {payments.map((p) => (
                <tr key={p.id} className="border-b">
                  <Td>{p.first_name} {p.last_name}</Td>
                  <Td>{p.matric_number}</Td>
                  <Td>{p.session_name}</Td>
                  <Td>{p.semester_name}</Td>
                  <Td>₦{Number(p.amount).toLocaleString()}</Td>
                  <Td>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      p.status === 'success' ? 'bg-green-100 text-green-700'
                      : p.status === 'failed' ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                      {p.status}
                    </span>
                  </Td>
                  <Td>{new Date(p.created_at).toLocaleString()}</Td>
                  <Td>{p.access_granted ? 'Granted' : 'Locked'}</Td>
                  <Td>
                    <div className="flex flex-col gap-1 items-start">
                      {!p.access_granted ? (
                        <button onClick={() => grantAccess(p)} className="text-maroon underline text-xs">Grant Access</button>
                      ) : (
                        <button onClick={() => revokeAccess(p)} className="text-red-600 underline text-xs">Revoke Access</button>
                      )}
                      <button onClick={() => deletePayment(p)} className="text-red-600 underline text-xs">Delete</button>
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
