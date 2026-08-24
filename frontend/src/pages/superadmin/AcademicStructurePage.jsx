import { useState } from 'react';
import api from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import Header from '../../components/Header';
import { useAcademicStructure } from '../../hooks/useAcademicStructure';

const TABS = ['Faculties', 'Departments', 'Programmes', 'Levels', 'Academic Sessions', 'Semesters'];

export default function AcademicStructurePage() {
  const [tab, setTab] = useState('Faculties');
  const structure = useAcademicStructure();

  return (
    <DashboardLayout subtitle="Super Admin Portal">
      <Header
        title="Academic Structure"
        right={
          <button
            onClick={() => structure.reload()}
            className="bg-maroon hover:bg-maroon-light text-white px-4 py-2 rounded text-sm font-semibold"
          >
            ⟳ Refresh
          </button>
        }
      />
      <div className="p-8">
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded text-sm font-medium ${tab === t ? 'bg-maroon text-white' : 'bg-white text-gray-600 border'}`}>
              {t}
            </button>
          ))}
        </div>

        {structure.loading && <p className="text-sm text-gray-500 mb-3">Loading…</p>}

        {tab === 'Faculties' && <FacultiesPanel structure={structure} />}
        {tab === 'Departments' && <DepartmentsPanel structure={structure} />}
        {tab === 'Programmes' && <ProgrammesPanel structure={structure} />}
        {tab === 'Levels' && <LevelsPanel structure={structure} />}
        {tab === 'Academic Sessions' && <SessionsPanel structure={structure} />}
        {tab === 'Semesters' && <SemestersPanel structure={structure} />}
      </div>
    </DashboardLayout>
  );
}

function Panel({ title, children }) {
  return (
    <div className="bg-white rounded shadow p-5">
      <h3 className="font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}
function ListTable({ headers, rows }) {
  return (
    <table className="w-full text-sm mt-4">
      <thead><tr className="bg-gray-100">{headers.map((h) => <th key={h} className="text-left px-3 py-2 text-xs">{h}</th>)}</tr></thead>
      <tbody>{rows}</tbody>
    </table>
  );
}

/** Confirms, deletes, reloads, and surfaces the friendly "still in use" message from the backend. */
async function handleDelete({ endpoint, label, reload, setError }) {
  if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
  setError('');
  try {
    await api.delete(endpoint);
    await reload();
  } catch (err) {
    setError(err.response?.data?.error || `Could not delete "${label}".`);
  }
}

function FacultiesPanel({ structure }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setError('');
    try { await api.post('/academic/faculties', { name }); setName(''); await structure.reload(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to create faculty.'); }
  };
  return (
    <Panel title="Faculties">
      <form onSubmit={submit} className="flex gap-2 mb-2">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Faculty name" className="border rounded px-3 py-2 text-sm w-72" />
        <button className="bg-maroon text-white px-4 py-2 rounded text-sm">Add</button>
      </form>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <ListTable headers={['Name', 'Status', '']} rows={structure.faculties.map((f) => (
        <tr key={f.id} className="border-b">
          <td className="px-3 py-2">{f.name}</td>
          <td className="px-3 py-2">{f.is_active ? 'Active' : 'Inactive'}</td>
          <td className="px-3 py-2">
            <button onClick={() => handleDelete({ endpoint: `/academic/faculties/${f.id}`, label: f.name, reload: structure.reload, setError })} className="text-red-600 underline text-xs">Delete</button>
          </td>
        </tr>
      ))} />
    </Panel>
  );
}

function DepartmentsPanel({ structure }) {
  const { faculties, departments, reload } = structure;
  const [name, setName] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setError('');
    try { await api.post('/academic/departments', { name, facultyId }); setName(''); await reload(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to create department.'); }
  };
  return (
    <Panel title="Departments">
      <form onSubmit={submit} className="flex gap-2 mb-2 flex-wrap">
        <select required value={facultyId} onChange={(e) => setFacultyId(e.target.value)} className="border rounded px-3 py-2 text-sm bg-white">
          <option value="">Faculty…</option>
          {faculties.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Department name" className="border rounded px-3 py-2 text-sm w-64" />
        <button className="bg-maroon text-white px-4 py-2 rounded text-sm">Add</button>
      </form>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <ListTable headers={['Name', 'Faculty', '']} rows={departments.map((d) => (
        <tr key={d.id} className="border-b">
          <td className="px-3 py-2">{d.name}</td>
          <td className="px-3 py-2">{d.faculty_name}</td>
          <td className="px-3 py-2">
            <button onClick={() => handleDelete({ endpoint: `/academic/departments/${d.id}`, label: d.name, reload, setError })} className="text-red-600 underline text-xs">Delete</button>
          </td>
        </tr>
      ))} />
    </Panel>
  );
}

function ProgrammesPanel({ structure }) {
  const { departments, programmes, reload } = structure;
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setError('');
    try { await api.post('/academic/programmes', { name, departmentId }); setName(''); await reload(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to create programme.'); }
  };
  return (
    <Panel title="Programmes">
      <form onSubmit={submit} className="flex gap-2 mb-2 flex-wrap">
        <select required value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="border rounded px-3 py-2 text-sm bg-white">
          <option value="">Department…</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Programme name" className="border rounded px-3 py-2 text-sm w-64" />
        <button className="bg-maroon text-white px-4 py-2 rounded text-sm">Add</button>
      </form>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <ListTable headers={['Name', 'Department', '']} rows={programmes.map((p) => (
        <tr key={p.id} className="border-b">
          <td className="px-3 py-2">{p.name}</td>
          <td className="px-3 py-2">{p.department_name}</td>
          <td className="px-3 py-2">
            <button onClick={() => handleDelete({ endpoint: `/academic/programmes/${p.id}`, label: p.name, reload, setError })} className="text-red-600 underline text-xs">Delete</button>
          </td>
        </tr>
      ))} />
    </Panel>
  );
}

function LevelsPanel({ structure }) {
  const { levels, reload } = structure;
  const [name, setName] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setError('');
    try {
      await api.post('/academic/levels', { name, sortOrder: Number(sortOrder) || 0 });
      setName(''); setSortOrder(''); await reload();
    } catch (err) { setError(err.response?.data?.error || 'Failed to create level.'); }
  };
  return (
    <Panel title="Levels">
      <form onSubmit={submit} className="flex gap-2 mb-2">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HND II" className="border rounded px-3 py-2 text-sm w-48" />
        <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="Sort order" type="number" className="border rounded px-3 py-2 text-sm w-32" />
        <button className="bg-maroon text-white px-4 py-2 rounded text-sm">Add</button>
      </form>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <ListTable headers={['Name', 'Sort Order', '']} rows={levels.map((l) => (
        <tr key={l.id} className="border-b">
          <td className="px-3 py-2">{l.name}</td>
          <td className="px-3 py-2">{l.sort_order}</td>
          <td className="px-3 py-2">
            <button onClick={() => handleDelete({ endpoint: `/academic/levels/${l.id}`, label: l.name, reload, setError })} className="text-red-600 underline text-xs">Delete</button>
          </td>
        </tr>
      ))} />
    </Panel>
  );
}

function SessionsPanel({ structure }) {
  const { sessions, reload } = structure;
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setError('');
    try { await api.post('/academic/sessions', { name }); setName(''); await reload(); }
    catch (err) { setError(err.response?.data?.error || 'Failed to create session.'); }
  };
  const activate = async (id) => { await api.patch(`/academic/sessions/${id}/activate`); await reload(); };
  return (
    <Panel title="Academic Sessions">
      <form onSubmit={submit} className="flex gap-2 mb-2">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2026/2027" className="border rounded px-3 py-2 text-sm w-48" />
        <button className="bg-maroon text-white px-4 py-2 rounded text-sm">Add</button>
      </form>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <ListTable headers={['Session', 'Current', 'Action', '']} rows={sessions.map((s) => (
        <tr key={s.id} className="border-b">
          <td className="px-3 py-2">{s.name}</td>
          <td className="px-3 py-2">{s.is_current ? '✔ Current' : '—'}</td>
          <td className="px-3 py-2">{!s.is_current && <button onClick={() => activate(s.id)} className="text-maroon underline text-xs">Set Current</button>}</td>
          <td className="px-3 py-2">
            <button onClick={() => handleDelete({ endpoint: `/academic/sessions/${s.id}`, label: s.name, reload, setError })} className="text-red-600 underline text-xs">Delete</button>
          </td>
        </tr>
      ))} />
    </Panel>
  );
}

function SemestersPanel({ structure }) {
  const { semesters, reload } = structure;
  const activate = async (id) => { await api.patch(`/academic/semesters/${id}/activate`); await reload(); };
  return (
    <Panel title="Semesters">
      <p className="text-xs text-gray-500 mb-2">Semesters are auto-created (First/Second) for each academic session and cannot be individually deleted — delete the session instead if you no longer need it.</p>
      <ListTable headers={['Semester', 'Session', 'Current', 'Action']} rows={semesters.map((s) => (
        <tr key={s.id} className="border-b">
          <td className="px-3 py-2">{s.name}</td>
          <td className="px-3 py-2">{s.session_name}</td>
          <td className="px-3 py-2">{s.is_current ? '✔ Current' : '—'}</td>
          <td className="px-3 py-2">{!s.is_current && <button onClick={() => activate(s.id)} className="text-maroon underline text-xs">Set Current</button>}</td>
        </tr>
      ))} />
    </Panel>
  );
}
