import { useEffect, useState } from 'react';
import api from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import Logo from '../../components/Logo';
import school from '../../config/school';

export default function CurrentResultPage() {
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');

  // Load the list of published semesters first, then default to the
  // most recent one (their "current" result) — unless we're returning
  // from a payment for a specific one, in which case reselect that.
  useEffect(() => {
    api.get('/results/student/me/history')
      .then((res) => {
        setHistory(res.data);
        const pending = sessionStorage.getItem('resultViewSelected');
        if (pending && res.data.some((h) => h.id === pending)) {
          setSelectedId(pending);
        } else if (res.data.length > 0) {
          setSelectedId(res.data[0].id);
        } else {
          setError('No published result is available yet.');
        }
        sessionStorage.removeItem('resultViewSelected');
      })
      .catch((err) => setError(err.response?.data?.error || 'Could not load your results.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setPayError('');
    api.get(`/results/student/me/${selectedId}`)
      .then((res) => setResult(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not load result.'))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const payNow = async () => {
    setPaying(true);
    setPayError('');
    try {
      sessionStorage.setItem('resultViewSelected', selectedId);
      const { data } = await api.post('/payments/initiate', {
        resultId: selectedId,
        callbackUrl: `${window.location.origin}/student/payment-callback`,
      });
      window.location.href = data.authorizationUrl;
    } catch (err) {
      setPayError(err.response?.data?.error || 'Could not start payment. Please try again.');
      setPaying(false);
    }
  };

  return (
    <DashboardLayout subtitle="Student Portal">
      <div className="no-print flex items-center justify-between px-8 py-5 bg-white border-b-4 border-gold flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-maroon">MY RESULTS</h1>
        </div>
        <div className="flex items-center gap-3">
          {history.length > 0 && (
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="border rounded px-3 py-2 text-sm bg-white"
            >
              {history.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.session_name} — {h.semester_name} ({h.level_name})
                </option>
              ))}
            </select>
          )}
          {result && !result.locked && (
            <button
              onClick={() => window.print()}
              className="bg-maroon hover:bg-maroon-light text-white px-5 py-2 rounded font-semibold text-sm"
            >
              🖨 Print Result
            </button>
          )}
        </div>
      </div>

      <div className="p-8">
        {loading && <p>Loading…</p>}
        {error && <p className="text-red-600">{error}</p>}

        {result && result.locked && (
          <div className="max-w-md mx-auto bg-white shadow border rounded-lg p-8 text-center">
            <Logo size={56} className="mx-auto mb-3" />
            <h2 className="font-bold text-maroon text-lg mb-1">Confirm Your Details</h2>
            <p className="text-sm text-gray-500 mb-5">Please confirm this is you before paying to view this result.</p>

            <div className="bg-gray-50 rounded p-4 text-left text-sm mb-5 space-y-1">
              <Row label="Name" value={`${result.first_name} ${result.last_name}`} />
              <Row label="Matriculation Number" value={result.matric_number} />
              <Row label="Session" value={result.session_name} />
              <Row label="Semester" value={result.semester_name} />
              <Row label="Level" value={result.level_name} />
            </div>

            <p className="text-2xl font-bold text-maroon mb-1">₦{Number(result.fee).toLocaleString()}</p>
            <p className="text-xs text-gray-500 mb-5">One-time fee to view this semester\u2019s result</p>

            {payError && <p className="text-red-600 text-xs mb-3">{payError}</p>}

            <button
              onClick={payNow}
              disabled={paying}
              className="w-full bg-maroon hover:bg-maroon-light text-white py-3 rounded font-semibold text-sm disabled:opacity-60"
            >
              {paying ? 'Redirecting to payment…' : `Pay ₦${Number(result.fee).toLocaleString()} to View Result`}
            </button>
            <p className="text-[11px] text-gray-400 mt-3">Payments are processed securely by Flutterwave.</p>
          </div>
        )}

        {result && !result.locked && (
          <div className="print-area bg-white max-w-4xl mx-auto shadow p-8 border rounded">
            <div className="flex items-center gap-4 border-b-2 border-maroon pb-4 mb-4">
              <Logo size={64} />
              <div>
                <h2 className="text-lg font-extrabold text-maroon">
                  {school.fullName.toUpperCase()}
                </h2>
                <p className="text-xs text-gray-500">{school.address}</p>
              </div>
            </div>

            <h3 className="text-center font-bold text-maroon text-lg">STUDENT ACADEMIC RESULT</h3>
            <p className="text-center text-sm text-gray-600 mb-4">
              {result.session_name} Academic Session &nbsp;|&nbsp; {result.semester_name} &nbsp;|&nbsp; {result.level_name}
            </p>

            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm border rounded p-4 mb-4">
              <Row label="Student Name" value={`${result.first_name} ${result.last_name}`} />
              <Row label="Matriculation Number" value={result.matric_number} />
              <Row label="Faculty" value={result.faculty_name} />
              <Row label="Department" value={result.department_name} />
              <Row label="Programme" value={result.programme_name} />
              <Row label="Level" value={result.level_name} />
              <Row label="Academic Session" value={result.session_name} />
              <Row label="Semester" value={result.semester_name} />
            </div>

            <table className="w-full text-sm border-collapse mb-4">
              <thead>
                <tr className="bg-maroon text-white">
                  <Th>S/N</Th>
                  <Th>Course Code</Th>
                  <Th>Course Title</Th>
                  <Th>Unit</Th>
                  <Th>Grade</Th>
                  <Th>Grade Point</Th>
                  <Th>Quality Point</Th>
                  <Th>Remark</Th>
                </tr>
              </thead>
              <tbody>
                {result.entries.map((e, i) => (
                  <tr key={e.course_code} className="border-b">
                    <Td>{i + 1}</Td>
                    <Td>{e.course_code}</Td>
                    <Td>{e.course_title}</Td>
                    <Td>{e.unit}</Td>
                    <Td>{e.grade}</Td>
                    <Td>{Number(e.grade_point).toFixed(2)}</Td>
                    <Td>{Number(e.quality_point).toFixed(2)}</Td>
                    <Td>{e.remark}</Td>
                  </tr>
                ))}
                <tr className="font-bold bg-gray-50">
                  <Td colSpan={3}>Total</Td>
                  <Td>{result.total_credit_units}</Td>
                  <Td colSpan={2}></Td>
                  <Td>{Number(result.total_quality_points).toFixed(2)}</Td>
                  <Td></Td>
                </tr>
              </tbody>
            </table>

            <div className="grid grid-cols-5 gap-3 text-center mb-6">
              <Stat label="Total Credit Units" value={result.total_credit_units} />
              <Stat label="Total Points" value={Number(result.total_quality_points).toFixed(2)} />
              <Stat label="Semester GPA" value={Number(result.gpa).toFixed(2)} />
              <Stat label="CGPA" value={Number(result.cgpa).toFixed(2)} />
              <Stat label="Academic Standing" value={result.academic_standing} accent />
            </div>

            <div className="flex justify-between items-end text-xs text-gray-500 pt-4 border-t">
              <div>
                <p>This is a computer generated result.</p>
                <p className="font-semibold">No signature is required.</p>
                <p className="mt-6 border-t border-gray-400 w-40 pt-1">Registrar</p>
              </div>
              <div>Date Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between border-b py-1">
      <span className="text-gray-500">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
function Th({ children }) {
  return <th className="border px-2 py-2 text-left text-xs">{children}</th>;
}
function Td({ children, colSpan }) {
  return (
    <td colSpan={colSpan} className="border px-2 py-1.5">
      {children}
    </td>
  );
}
function Stat({ label, value, accent }) {
  return (
    <div className={`rounded p-3 ${accent ? 'bg-maroon text-white' : 'bg-gray-50'}`}>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[11px] uppercase tracking-wide opacity-80">{label}</div>
    </div>
  );
}
