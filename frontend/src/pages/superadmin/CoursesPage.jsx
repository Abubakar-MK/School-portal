import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import Header from '../../components/Header';
import { useAcademicStructure } from '../../hooks/useAcademicStructure';

const emptyForm = { code: '', title: '', creditUnit: '', departmentId: '', programmeId: '', levelId: '', semester: 'First Semester' };

export default function CoursesPage() {
  const { departmentsFor, programmesFor, faculties, levels } = useAcademicStructure();
  const [form, setForm] = useState(emptyForm);
  const [facultyId, setFacultyId] = useState('');
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState('');

  const loadCourses = () => api.get('/courses').then((res) => setCourses(res.data));
  useEffect(() => { loadCourses(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/courses', form);
      setForm(emptyForm);
      loadCourses();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create course.');
    }
  };

  const deleteCourse = async (c) => {
    if (!window.confirm(`Delete course "${c.code} — ${c.title}"? This cannot be undone.`)) return;
    setError('');
    try {
      await api.delete(`/courses/${c.id}`);
      loadCourses();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete course.');
    }
  };

  // Group into Department > Level > Semester, each combination getting
  // its own small table. The course list already arrives sorted by
  // level order then semester then code, so grouping just buckets rows
  // in the order they arrive rather than needing to re-sort here.
  const groupedByDepartment = useMemo(() => {
    const deptGroups = {};
    for (const c of courses) {
      const deptKey = c.department_name || 'Unassigned';
      if (!deptGroups[deptKey]) deptGroups[deptKey] = {};
      const levelKey = c.level_name || 'Unassigned Level';
      if (!deptGroups[deptKey][levelKey]) deptGroups[deptKey][levelKey] = {};
      const semKey = c.semester || 'Unassigned Semester';
      if (!deptGroups[deptKey][levelKey][semKey]) deptGroups[deptKey][levelKey][semKey] = [];
      deptGroups[deptKey][levelKey][semKey].push(c);
    }
    return Object.entries(deptGroups).sort(([a], [b]) => a.localeCompare(b)).map(([deptName, levelGroups]) => ({
      deptName,
      totalCount: Object.values(levelGroups).reduce((sum, sems) => sum + Object.values(sems).reduce((s2, arr) => s2 + arr.length, 0), 0),
      levels: Object.entries(levelGroups).map(([levelName, semGroups]) => ({
        levelName,
        semesters: Object.entries(semGroups), // already in arrival order = correct semester order
      })),
    }));
  }, [courses]);

  return (
    <DashboardLayout subtitle="Super Admin Portal">
      <Header title="Courses" />
      <div className="p-8 grid grid-cols-3 gap-6">
        <form onSubmit={submit} className="bg-white rounded shadow p-5 space-y-3 h-fit">
          <h3 className="font-semibold text-gray-700">Add Course</h3>
          <input required placeholder="Course Code (e.g. CHH 101)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <input required placeholder="Course Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />
          <input required type="number" min="1" placeholder="Credit Unit" value={form.creditUnit} onChange={(e) => setForm({ ...form, creditUnit: e.target.value })} className="w-full border rounded px-3 py-2 text-sm" />

          <select value={facultyId} onChange={(e) => { setFacultyId(e.target.value); setForm({ ...form, departmentId: '', programmeId: '' }); }} className="w-full border rounded px-3 py-2 text-sm bg-white">
            <option value="">Faculty…</option>
            {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select required value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value, programmeId: '' })} className="w-full border rounded px-3 py-2 text-sm bg-white">
            <option value="">Department…</option>
            {departmentsFor(facultyId).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select required value={form.programmeId} onChange={(e) => setForm({ ...form, programmeId: e.target.value })} className="w-full border rounded px-3 py-2 text-sm bg-white">
            <option value="">Programme…</option>
            {programmesFor(form.departmentId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select required value={form.levelId} onChange={(e) => setForm({ ...form, levelId: e.target.value })} className="w-full border rounded px-3 py-2 text-sm bg-white">
            <option value="">Level…</option>
            {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} className="w-full border rounded px-3 py-2 text-sm bg-white">
            <option>First Semester</option>
            <option>Second Semester</option>
          </select>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button className="w-full bg-maroon text-white py-2 rounded font-semibold text-sm">Add Course</button>
        </form>

        <div className="col-span-2 space-y-8">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {groupedByDepartment.length === 0 && (
            <p className="text-gray-500 text-sm bg-white rounded shadow p-4">No courses added yet.</p>
          )}
          {groupedByDepartment.map(({ deptName, totalCount, levels: levelGroups }) => (
            <div key={deptName}>
              <h2 className="font-bold text-maroon mb-3">{deptName} <span className="font-normal text-gray-400 text-sm">— {totalCount} course{totalCount === 1 ? '' : 's'}</span></h2>
              <div className="space-y-4 pl-1">
                {levelGroups.map(({ levelName, semesters }) => (
                  <div key={levelName}>
                    <h3 className="font-semibold text-gray-700 text-sm mb-2">{levelName}</h3>
                    <div className="space-y-3 pl-1">
                      {semesters.map(([semName, semCourses]) => (
                        <div key={semName} className="bg-white rounded shadow overflow-x-auto">
                          <div className="bg-gray-100 border-b px-4 py-2">
                            <p className="text-xs font-medium text-gray-600">{semName} · {semCourses.length} course{semCourses.length === 1 ? '' : 's'}</p>
                          </div>
                          <table className="w-full text-sm">
                            <thead className="bg-maroon text-white">
                              <tr><Th>Code</Th><Th>Title</Th><Th>Unit</Th><Th>Programme</Th><Th></Th></tr>
                            </thead>
                            <tbody>
                              {semCourses.map((c) => (
                                <tr key={c.id} className="border-b">
                                  <Td>{c.code}</Td><Td>{c.title}</Td><Td>{c.credit_unit}</Td>
                                  <Td>{c.programme_name}</Td>
                                  <Td>
                                    <button onClick={() => deleteCourse(c)} className="text-red-600 underline text-xs">Delete</button>
                                  </Td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

function Th({ children }) { return <th className="text-left px-3 py-2 text-xs">{children}</th>; }
function Td({ children }) { return <td className="px-3 py-2">{children}</td>; }
