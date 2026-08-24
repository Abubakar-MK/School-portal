import { useState } from 'react';
import api from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import Header from '../../components/Header';
import { useAcademicStructure } from '../../hooks/useAcademicStructure';

export default function ResultEntryPage() {
  const { sessions, semestersFor } = useAcademicStructure();
  const [matric, setMatric] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [student, setStudent] = useState(null);
  const [result, setResult] = useState(null);
  const [courses, setCourses] = useState([]);
  const [scores, setScores] = useState({}); // courseId -> { ca, exam }
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const findStudent = async () => {
    setError(''); setInfo(''); setStudent(null); setResult(null); setCourses([]);
    if (!matric || !sessionId || !semesterId) {
      setError('Enter matric number and select session + semester first.');
      return;
    }
    try {
      const { data: list } = await api.get('/students', { params: { search: matric } });
      const match = list.find((s) => s.matric_number.toLowerCase() === matric.trim().toLowerCase());
      if (!match) { setError('No student found with that matriculation number.'); return; }
      setStudent(match);

      const { data: draft } = await api.post('/results/drafts', {
        studentId: match.id, sessionId, semesterId, levelId: match.level_id,
      });
      setResult(draft);

      const { data: courseList } = await api.get('/courses', {
        params: { programmeId: match.programme_id, levelId: match.level_id },
      });
      setCourses(courseList);

      if (draft.id) {
        const { data: detail } = await api.get(`/results/${draft.id}`);
        const scoreMap = {};
        detail.entries.forEach((e) => { scoreMap[e.course_id] = { ca: e.ca_score, exam: e.exam_score }; });
        setScores(scoreMap);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load result draft.');
    }
  };

  const setScore = (courseId, field, value) => {
    setScores((s) => ({ ...s, [courseId]: { ...s[courseId], [field]: value } }));
  };

  const saveEntry = async (courseId) => {
    const s = scores[courseId] || {};
    if (s.ca === undefined || s.exam === undefined) return;
    setBusy(true);
    try {
      await api.post(`/results/${result.id}/entries`, {
        courseId, caScore: Number(s.ca), examScore: Number(s.exam),
      });
      setInfo('Score saved.');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save score.');
    } finally {
      setBusy(false);
    }
  };

  const submitResult = async () => {
    if (!window.confirm('Submit this result for Super Admin approval? You will not be able to edit it unless it is rejected.')) return;
    setBusy(true);
    try {
      await api.post(`/results/${result.id}/submit`);
      setInfo('Result submitted for approval.');
      setResult((r) => ({ ...r, status: 'submitted' }));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not submit result.');
    } finally {
      setBusy(false);
    }
  };

  const editable = result && ['draft', 'rejected'].includes(result.status);

  return (
    <DashboardLayout subtitle="Admin Portal">
      <Header title="Enter Results" />
      <div className="p-8 max-w-4xl">
        <div className="bg-white rounded shadow p-5 flex gap-3 items-end flex-wrap mb-6">
          <div>
            <label className="text-xs font-medium text-gray-600">Matric Number</label>
            <input value={matric} onChange={(e) => setMatric(e.target.value)} className="block border rounded px-3 py-2 text-sm w-56" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Academic Session</label>
            <select value={sessionId} onChange={(e) => { setSessionId(e.target.value); setSemesterId(''); }} className="block border rounded px-3 py-2 text-sm w-48 bg-white">
              <option value="">Select…</option>
              {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Semester</label>
            <select value={semesterId} onChange={(e) => setSemesterId(e.target.value)} className="block border rounded px-3 py-2 text-sm w-48 bg-white">
              <option value="">Select…</option>
              {semestersFor(sessionId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <button onClick={findStudent} className="bg-maroon text-white px-4 py-2 rounded text-sm font-semibold">Load</button>
        </div>

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
        {info && <p className="text-green-600 text-sm mb-3">{info}</p>}

        {student && result && (
          <div className="bg-white rounded shadow p-5">
            <div className="flex justify-between mb-4">
              <div>
                <div className="font-bold">{student.first_name} {student.last_name}</div>
                <div className="text-xs text-gray-500">{student.matric_number} · {student.department_name} · {student.level_name}</div>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-gray-100 h-fit">Status: {result.status}</span>
            </div>

            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <Th>Course</Th><Th>Unit</Th><Th>CA (30)</Th><Th>Exam (70)</Th><Th></Th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className="border-b">
                    <Td>{c.code} — {c.title}</Td>
                    <Td>{c.credit_unit}</Td>
                    <Td>
                      <input type="number" min="0" max="30" disabled={!editable}
                        value={scores[c.id]?.ca ?? ''} onChange={(e) => setScore(c.id, 'ca', e.target.value)}
                        className="w-20 border rounded px-2 py-1" />
                    </Td>
                    <Td>
                      <input type="number" min="0" max="70" disabled={!editable}
                        value={scores[c.id]?.exam ?? ''} onChange={(e) => setScore(c.id, 'exam', e.target.value)}
                        className="w-20 border rounded px-2 py-1" />
                    </Td>
                    <Td>
                      <button disabled={!editable || busy} onClick={() => saveEntry(c.id)} className="text-maroon underline text-xs disabled:opacity-40">
                        Save
                      </button>
                    </Td>
                  </tr>
                ))}
                {courses.length === 0 && <tr><td colSpan={5} className="p-3 text-gray-500">No courses configured for this programme/level yet.</td></tr>}
              </tbody>
            </table>

            {editable && (
              <button disabled={busy} onClick={submitResult} className="bg-maroon hover:bg-maroon-light text-white px-5 py-2 rounded text-sm font-semibold disabled:opacity-60">
                Submit Result for Approval
              </button>
            )}
            {result.status === 'submitted' && <p className="text-sm text-gray-500">Awaiting Super Admin review.</p>}
            {result.status === 'rejected' && <p className="text-sm text-red-600">This result was rejected: {result.rejection_reason}. Correct scores above and resubmit.</p>}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Th({ children }) { return <th className="text-left px-2 py-2 text-xs">{children}</th>; }
function Td({ children }) { return <td className="px-2 py-1.5">{children}</td>; }
