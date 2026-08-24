import { useEffect, useState } from 'react';
import api from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import Header from '../../components/Header';

export default function PublishedResultsPage() {
  const [approved, setApproved] = useState([]);
  const [published, setPublished] = useState([]);
  const [message, setMessage] = useState('');
  const [editingResult, setEditingResult] = useState(null);

  const load = () => {
    api.get('/results', { params: { status: 'approved' } }).then((res) => setApproved(res.data));
    api.get('/results', { params: { status: 'published' } }).then((res) => setPublished(res.data));
  };
  useEffect(() => { load(); }, []);

  const publish = async (r) => {
    if (!window.confirm(`Are you sure you want to publish this result? ${r.first_name} ${r.last_name} will be able to view it immediately.`)) return;
    await api.post(`/results/${r.id}/publish`);
    setMessage('Result published.');
    load();
  };

  const publishAll = async () => {
    if (approved.length === 0) return;
    if (!window.confirm(`Publish all ${approved.length} approved result(s)? Every affected student will be able to view their result immediately.`)) return;
    const { data } = await api.post('/results/publish-all');
    setMessage(`${data.published} result(s) published.`);
    load();
  };

  const unpublish = async (r) => {
    if (!window.confirm('Unpublish this result? The student will no longer be able to view it.')) return;
    await api.post(`/results/${r.id}/unpublish`);
    setMessage('Result unpublished.');
    load();
  };

  return (
    <DashboardLayout subtitle="Super Admin Portal">
      <Header title="Published Results" />
      <div className="p-8 space-y-8">
        {message && <p className="text-green-600 text-sm">{message}</p>}

        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700">Approved — Ready to Publish</h3>
            <button
              onClick={publishAll}
              disabled={approved.length === 0}
              className="bg-maroon hover:bg-maroon-light disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-3 py-2 rounded"
            >
              Publish All ({approved.length})
            </button>
          </div>
          <Table
            rows={approved}
            action={{ label: 'Publish', fn: publish, className: 'bg-maroon text-white' }}
            secondaryAction={{ label: 'Edit', fn: (r) => setEditingResult(r) }}
          />
        </section>

        <section>
          <h3 className="font-semibold text-gray-700 mb-2">Published Results</h3>
          <Table rows={published} action={{ label: 'Unpublish', fn: unpublish, className: 'bg-gray-600 text-white' }} showPublishedDate />
        </section>
      </div>

      {editingResult && (
        <EditResultModal
          result={editingResult}
          onClose={() => { setEditingResult(null); load(); }}
        />
      )}
    </DashboardLayout>
  );
}

/** Lets the Super Admin correct a course score on an approved-but-not-yet-published result. */
function EditResultModal({ result, onClose }) {
  const [detail, setDetail] = useState(null);
  const [scores, setScores] = useState({});
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/results/${result.id}`).then(({ data }) => {
      setDetail(data);
      const map = {};
      data.entries.forEach((e) => { map[e.course_id] = { ca: e.ca_score, exam: e.exam_score }; });
      setScores(map);
    });
  }, [result.id]);

  const setScore = (courseId, field, value) => {
    setScores((s) => ({ ...s, [courseId]: { ...s[courseId], [field]: value } }));
  };

  const saveEntry = async (courseId) => {
    const s = scores[courseId] || {};
    if (s.ca === undefined || s.exam === undefined) return;
    setBusy(true); setError(''); setInfo('');
    try {
      await api.post(`/results/${result.id}/entries`, { courseId, caScore: Number(s.ca), examScore: Number(s.exam) });
      const { data } = await api.get(`/results/${result.id}`);
      setDetail(data);
      setInfo('Score updated.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save score.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6">
        <h3 className="font-bold text-maroon text-lg mb-1">Edit Result — {result.first_name} {result.last_name}</h3>
        <p className="text-xs text-gray-500 mb-4">{result.matric_number} · {result.session_name} · {result.semester_name}</p>

        {!detail && <p className="text-sm text-gray-500">Loading…</p>}
        {error && <p className="text-red-600 text-xs mb-2">{error}</p>}
        {info && <p className="text-green-600 text-xs mb-2">{info}</p>}

        {detail && (
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="bg-gray-100">
                <Th>Course</Th><Th>Unit</Th><Th>CA (30)</Th><Th>Exam (70)</Th><Th>Grade</Th><Th></Th>
              </tr>
            </thead>
            <tbody>
              {detail.entries.map((e) => (
                <tr key={e.course_id} className="border-b">
                  <Td>{e.course_code}</Td>
                  <Td>{e.credit_unit}</Td>
                  <Td>
                    <input type="number" min="0" max="30" value={scores[e.course_id]?.ca ?? ''}
                      onChange={(ev) => setScore(e.course_id, 'ca', ev.target.value)}
                      className="w-16 border rounded px-2 py-1" />
                  </Td>
                  <Td>
                    <input type="number" min="0" max="70" value={scores[e.course_id]?.exam ?? ''}
                      onChange={(ev) => setScore(e.course_id, 'exam', ev.target.value)}
                      className="w-16 border rounded px-2 py-1" />
                  </Td>
                  <Td>{e.grade}</Td>
                  <Td>
                    <button disabled={busy} onClick={() => saveEntry(e.course_id)} className="text-maroon underline text-xs disabled:opacity-40">
                      Save
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {detail && <p className="text-sm font-semibold mb-4">GPA: {Number(detail.gpa).toFixed(2)} · CGPA: {Number(detail.cgpa).toFixed(2)}</p>}

        <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded text-sm">Done</button>
      </div>
    </div>
  );
}

function Table({ rows, action, secondaryAction, showPublishedDate }) {
  return (
    <div className="bg-white rounded shadow overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-maroon text-white">
          <tr>
            <Th>Student</Th><Th>Matric No.</Th><Th>Session</Th><Th>Semester</Th><Th>GPA</Th>
            {showPublishedDate && <Th>Published</Th>}
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td className="p-4 text-gray-500" colSpan={7}>None.</td></tr>}
          {rows.map((r) => (
            <tr key={r.id} className="border-b">
              <Td>{r.first_name} {r.last_name}</Td>
              <Td>{r.matric_number}</Td>
              <Td>{r.session_name}</Td>
              <Td>{r.semester_name}</Td>
              <Td>{Number(r.gpa).toFixed(2)}</Td>
              {showPublishedDate && <Td>{r.published_at ? new Date(r.published_at).toLocaleDateString() : '—'}</Td>}
              <Td>
                <div className="flex gap-2">
                  {secondaryAction && (
                    <button onClick={() => secondaryAction.fn(r)} className="text-maroon underline text-xs">{secondaryAction.label}</button>
                  )}
                  <button onClick={() => action.fn(r)} className={`${action.className} px-3 py-1 rounded text-xs font-semibold`}>{action.label}</button>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Th({ children }) { return <th className="text-left px-2 py-2 text-xs">{children}</th>; }
function Td({ children }) { return <td className="px-2 py-1.5">{children}</td>; }
