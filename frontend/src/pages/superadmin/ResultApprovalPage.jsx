import { useEffect, useState } from 'react';
import api from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import Header from '../../components/Header';

export default function ResultApprovalPage() {
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = () => api.get('/results', { params: { status: 'submitted' } }).then((res) => setResults(res.data));
  useEffect(() => { load(); }, []);

  const openDetail = async (r) => {
    setSelected(r);
    setShowReject(false);
    setMessage(''); setError('');
    const { data } = await api.get(`/results/${r.id}`);
    setDetail(data);
  };

  const approve = async () => {
    if (!window.confirm(`Approve ${selected.first_name} ${selected.last_name}'s result?`)) return;
    try {
      await api.post(`/results/${selected.id}/approve`);
      setMessage('Result approved. It can now be published.');
      setSelected(null); setDetail(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not approve.');
    }
  };

  const approveAll = async () => {
    if (results.length === 0) return;
    if (!window.confirm(`Approve all ${results.length} submitted result(s) awaiting review? This cannot be undone in bulk — you'll need to reject individually if one is wrong.`)) return;
    try {
      const { data } = await api.post('/results/approve-all');
      setMessage(`${data.approved} result(s) approved.`);
      setSelected(null); setDetail(null);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not approve all.');
    }
  };

  const reject = async () => {
    if (!rejectReason.trim()) { setError('Please provide a rejection reason.'); return; }
    try {
      await api.post(`/results/${selected.id}/reject`, { reason: rejectReason });
      setMessage('Result rejected and sent back to admin for correction.');
      setSelected(null); setDetail(null); setRejectReason(''); setShowReject(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reject.');
    }
  };

  return (
    <DashboardLayout subtitle="Super Admin Portal">
      <Header title="Result Approval" />
      <div className="p-8 grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded shadow overflow-x-auto h-fit">
          <div className="flex items-center justify-between p-3 border-b">
            {message ? <p className="text-green-600 text-sm">{message}</p> : <span />}
            <button
              onClick={approveAll}
              disabled={results.length === 0}
              className="bg-green-700 hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2 rounded"
            >
              Approve All ({results.length})
            </button>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-maroon text-white">
              <tr><Th>Student</Th><Th>Matric No.</Th><Th>Session</Th><Th>Semester</Th><Th>GPA</Th><Th>Submitted</Th><Th></Th></tr>
            </thead>
            <tbody>
              {results.length === 0 && <tr><td className="p-4 text-gray-500" colSpan={7}>Nothing pending approval.</td></tr>}
              {results.map((r) => (
                <tr key={r.id} className="border-b">
                  <Td>{r.first_name} {r.last_name}</Td>
                  <Td>{r.matric_number}</Td>
                  <Td>{r.session_name}</Td>
                  <Td>{r.semester_name}</Td>
                  <Td>{Number(r.gpa).toFixed(2)}</Td>
                  <Td>{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—'}</Td>
                  <Td><button onClick={() => openDetail(r)} className="text-maroon underline text-xs">Review</button></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded shadow p-5 h-fit">
          {!detail && <p className="text-gray-400 text-sm">Select a result to review.</p>}
          {detail && (
            <div>
              <h3 className="font-bold text-maroon">{detail.first_name} {detail.last_name}</h3>
              <p className="text-xs text-gray-500 mb-3">{detail.matric_number} · {detail.department_name}</p>
              <table className="w-full text-xs mb-3">
                <thead><tr className="bg-gray-100"><th className="text-left px-2 py-1">Course</th><th className="px-2 py-1">Score</th><th className="px-2 py-1">Grade</th></tr></thead>
                <tbody>
                  {detail.entries.map((e) => (
                    <tr key={e.id} className="border-b">
                      <td className="px-2 py-1">{e.course_code}</td>
                      <td className="px-2 py-1 text-center">{Number(e.total_score).toFixed(0)}</td>
                      <td className="px-2 py-1 text-center">{e.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-sm font-semibold mb-3">GPA: {Number(detail.gpa).toFixed(2)} · CGPA: {Number(detail.cgpa).toFixed(2)}</p>

              {error && <p className="text-red-600 text-xs mb-2">{error}</p>}

              {!showReject ? (
                <div className="flex gap-2">
                  <button onClick={approve} className="flex-1 bg-green-700 hover:bg-green-800 text-white text-sm py-2 rounded">Approve</button>
                  <button onClick={() => setShowReject(true)} className="flex-1 bg-red-700 hover:bg-red-800 text-white text-sm py-2 rounded">Reject</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea required value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason for rejection…" className="w-full border rounded px-2 py-2 text-sm" rows={3} />
                  <div className="flex gap-2">
                    <button onClick={reject} className="flex-1 bg-red-700 text-white text-sm py-2 rounded">Confirm Reject</button>
                    <button onClick={() => setShowReject(false)} className="flex-1 bg-gray-200 text-sm py-2 rounded">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function Th({ children }) { return <th className="text-left px-3 py-2 text-xs">{children}</th>; }
function Td({ children }) { return <td className="px-3 py-2">{children}</td>; }
