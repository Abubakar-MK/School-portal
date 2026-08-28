import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import Header from '../../components/Header';
import { useAuth } from '../../context/AuthContext';
import { useAcademicStructure } from '../../hooks/useAcademicStructure';
import school from '../../config/school';

export default function StudentsListPage() {
  const { user } = useAuth();
  const { departments, levels } = useAcademicStructure();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [changingLevelStudent, setChangingLevelStudent] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/students', { params: { search: search || undefined, departmentId: departmentId || undefined } })
      .then((res) => setStudents(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [departmentId]);

  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  const printList = () => {
    const deptName = departments.find((d) => d.id === departmentId)?.name || 'All Departments';
    const rowsHtml = students.map((s) => `
      <tr>
        <td>${s.matric_number}</td>
        <td>${s.first_name} ${s.last_name}</td>
        <td>${s.department_name}</td>
        <td>${s.programme_name}</td>
        <td>${s.level_name}</td>
        <td>${s.status}</td>
        <td>${s.phone}</td>
      </tr>`).join('');
    const html = `
      <html><head><title>Students — ${deptName}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; }
        h1 { color: #7a1f2b; font-size: 18px; margin-bottom: 2px; }
        p { color: #555; font-size: 12px; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; text-align: left; }
        th { background: #7a1f2b; color: white; }
      </style></head>
      <body>
        <h1>${school.fullName}</h1>
        <p>Student List — ${deptName} (${students.length} student${students.length === 1 ? '' : 's'})</p>
        <table>
          <thead><tr><th>Matric No.</th><th>Name</th><th>Department</th><th>Programme</th><th>Level</th><th>Status</th><th>Phone</th></tr></thead>
          <tbody>${rowsHtml || '<tr><td colspan="7">No students found.</td></tr>'}</tbody>
        </table>
      </body></html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const resetPassword = async (id) => {
    if (!window.confirm('Reset this student\'s password to their phone number?')) return;
    const { data } = await api.post(`/students/${id}/reset-password`);
    setMessage(data.message);
  };

  const deleteStudent = async (student) => {
    if (!window.confirm(`Permanently delete ${student.first_name} ${student.last_name} (${student.matric_number})? This also removes all of their results and cannot be undone.`)) return;
    await api.delete(`/students/${student.id}`);
    setMessage('Student deleted.');
    load();
  };

  return (
    <DashboardLayout subtitle={user.role === 'super_admin' ? 'Super Admin Portal' : 'Admin Portal'}>
      <Header title="Students" />
      <div className="p-8">
        <form onSubmit={handleSearch} className="mb-4 flex gap-2 flex-wrap items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, matric number or phone…"
            className="border rounded px-3 py-2 w-80 text-sm"
          />
          <button className="bg-maroon text-white px-4 py-2 rounded text-sm font-semibold">Search</button>

          {user.role === 'super_admin' && (
            <>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="border rounded px-3 py-2 text-sm bg-white"
              >
                <option value="">All Departments</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button type="button" onClick={printList} className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded text-sm font-semibold">
                Print List
              </button>
            </>
          )}
        </form>

        {message && <p className="text-green-600 text-sm mb-3">{message}</p>}

        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-maroon text-white">
              <tr>
                <Th>Matric No.</Th><Th>Name</Th><Th>Department</Th><Th>Programme</Th>
                <Th>Level</Th><Th>Status</Th><Th>Phone</Th><Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td className="p-4" colSpan={8}>Loading…</td></tr>}
              {!loading && students.length === 0 && <tr><td className="p-4" colSpan={8}>No students found.</td></tr>}
              {students.map((s) => (
                <tr key={s.id} className="border-b">
                  <Td>{s.matric_number}</Td>
                  <Td>{s.first_name} {s.last_name}</Td>
                  <Td>{s.department_name}</Td>
                  <Td>{s.programme_name}</Td>
                  <Td>{s.level_name}</Td>
                  <Td><span className="px-2 py-0.5 rounded text-xs bg-gray-100">{s.status}</span></Td>
                  <Td>{s.phone}</Td>
                  <Td>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setEditingStudent(s)} className="text-maroon underline text-xs">Edit</button>
                      {user.role === 'super_admin' && (
                        <button onClick={() => setChangingLevelStudent(s)} className="text-maroon underline text-xs">Change Level</button>
                      )}
                      {user.role === 'super_admin' && (
                        <button onClick={() => resetPassword(s.id)} className="text-maroon underline text-xs">Reset Password</button>
                      )}
                      <button onClick={() => deleteStudent(s)} className="text-red-600 underline text-xs">Delete</button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSaved={() => { setEditingStudent(null); setMessage('Student updated.'); load(); }}
        />
      )}

      {changingLevelStudent && (
        <ChangeLevelModal
          student={changingLevelStudent}
          levels={levels}
          onClose={() => setChangingLevelStudent(null)}
          onSaved={() => { setChangingLevelStudent(null); setMessage('Student\u2019s level updated.'); load(); }}
        />
      )}
    </DashboardLayout>
  );
}

function EditStudentModal({ student, onClose, onSaved }) {
  const [form, setForm] = useState({
    firstName: student.first_name || '',
    middleName: student.middle_name || '',
    lastName: student.last_name || '',
    gender: student.gender || '',
    phone: student.phone || '',
    email: student.email || '',
    status: student.status || 'active',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.patch(`/students/${student.id}`, form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h3 className="font-bold text-maroon text-lg mb-1">Edit Student</h3>
        <p className="text-xs text-gray-500 mb-4">{student.matric_number}</p>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <Field label="First Name" value={form.firstName} onChange={set('firstName')} />
          <Field label="Middle Name" value={form.middleName} onChange={set('middleName')} />
          <Field label="Last Name" value={form.lastName} onChange={set('lastName')} />
          <div>
            <label className="text-xs font-medium text-gray-600">Gender</label>
            <select value={form.gender} onChange={set('gender')} className="mt-1 w-full border rounded px-3 py-2 text-sm bg-white">
              <option value="">Select…</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <Field label="Phone" value={form.phone} onChange={set('phone')} />
          <Field label="Email" value={form.email} onChange={set('email')} type="email" />
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-600">Status</label>
            <select value={form.status} onChange={set('status')} className="mt-1 w-full border rounded px-3 py-2 text-sm bg-white">
              <option value="active">Active</option>
              <option value="graduated">Graduated</option>
              <option value="suspended">Suspended</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {error && <p className="col-span-2 text-red-600 text-xs">{error}</p>}

          <div className="col-span-2 flex gap-2 mt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-200 py-2 rounded text-sm">Cancel</button>
            <button disabled={saving} className="flex-1 bg-maroon text-white py-2 rounded text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Lets a Super Admin move a student to a different level within the
 * same department — e.g. promoting a batch from 100 L to 200 L, or
 * fixing a level entered incorrectly at registration/bulk upload.
 */
function ChangeLevelModal({ student, levels, onClose, onSaved }) {
  const [levelId, setLevelId] = useState(student.level_id || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.patch(`/students/${student.id}`, { levelId });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not change level.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
        <h3 className="font-bold text-maroon text-lg mb-1">Change Level</h3>
        <p className="text-xs text-gray-500 mb-4">
          {student.first_name} {student.last_name} · {student.matric_number} · {student.department_name}
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600">New Level</label>
            <select required value={levelId} onChange={(e) => setLevelId(e.target.value)} className="mt-1 w-full border rounded px-3 py-2 text-sm bg-white">
              <option value="">Select…</option>
              {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {error && <p className="text-red-600 text-xs">{error}</p>}

          <div className="flex gap-2 mt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-200 py-2 rounded text-sm">Cancel</button>
            <button disabled={saving || !levelId} className="flex-1 bg-maroon text-white py-2 rounded text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <input {...props} className="mt-1 w-full border rounded px-3 py-2 text-sm" />
    </div>
  );
}

function Th({ children }) { return <th className="text-left px-3 py-2 text-xs">{children}</th>; }
function Td({ children }) { return <td className="px-3 py-2">{children}</td>; }
