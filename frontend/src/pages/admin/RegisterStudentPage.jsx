import { useState } from 'react';
import api from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import Header from '../../components/Header';
import { useAcademicStructure } from '../../hooks/useAcademicStructure';

const emptyForm = {
  matricNumber: '', firstName: '', middleName: '', lastName: '', gender: '', dateOfBirth: '',
  phone: '', email: '', facultyId: '', departmentId: '', programmeId: '', levelId: '',
  admissionSessionId: '', admissionYear: '',
};

export default function RegisterStudentPage() {
  const { faculties, levels, sessions, departmentsFor, programmesFor, loading } = useAcademicStructure();
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([k, v]) => body.append(k, v));
      if (photo) body.append('photo', photo);
      const { data } = await api.post('/students', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess(`Student ${data.student.matric_number} registered successfully. Initial password is their phone number.`);
      setForm(emptyForm);
      setPhoto(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <DashboardLayout><p className="p-8">Loading…</p></DashboardLayout>;

  return (
    <DashboardLayout subtitle="Admin Portal">
      <Header title="Register Student" />
      <form onSubmit={handleSubmit} className="p-8 max-w-4xl grid grid-cols-2 gap-4 bg-white m-8 rounded shadow">
        <Field label="Matriculation Number" required value={form.matricNumber} onChange={set('matricNumber')} />
        <Field label="Phone Number (initial password)" required value={form.phone} onChange={set('phone')} />
        <Field label="First Name" required value={form.firstName} onChange={set('firstName')} />
        <Field label="Middle Name" value={form.middleName} onChange={set('middleName')} />
        <Field label="Last Name" required value={form.lastName} onChange={set('lastName')} />
        <SelectField label="Gender" value={form.gender} onChange={set('gender')} options={[['Male', 'Male'], ['Female', 'Female']]} />
        <Field label="Date of Birth" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
        <Field label="Email" type="email" value={form.email} onChange={set('email')} />

        <SelectField
          label="Faculty" required value={form.facultyId}
          onChange={(e) => setForm((f) => ({ ...f, facultyId: e.target.value, departmentId: '', programmeId: '' }))}
          options={faculties.map((f) => [f.id, f.name])}
        />
        <SelectField
          label="Department" required value={form.departmentId}
          onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value, programmeId: '' }))}
          options={departmentsFor(form.facultyId).map((d) => [d.id, d.name])}
        />
        <SelectField
          label="Programme" required value={form.programmeId} onChange={set('programmeId')}
          options={programmesFor(form.departmentId).map((p) => [p.id, p.name])}
        />
        <SelectField label="Level" required value={form.levelId} onChange={set('levelId')}
          options={levels.map((l) => [l.id, l.name])} />
        <SelectField label="Admission Session" required value={form.admissionSessionId} onChange={set('admissionSessionId')}
          options={sessions.map((s) => [s.id, s.name])} />
        <Field label="Admission Year" type="number" value={form.admissionYear} onChange={set('admissionYear')} />

        <div className="col-span-2">
          <label className="text-sm font-medium text-gray-600">Student Photo</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files[0])}
            className="mt-1 block w-full text-sm" />
        </div>

        {error && <p className="col-span-2 text-red-600 text-sm">{error}</p>}
        {success && <p className="col-span-2 text-green-600 text-sm">{success}</p>}

        <button disabled={saving} className="col-span-2 bg-maroon hover:bg-maroon-light text-white font-semibold py-2.5 rounded disabled:opacity-60">
          {saving ? 'Registering…' : 'Register Student'}
        </button>
      </form>
    </DashboardLayout>
  );
}

function Field({ label, required, ...props }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-600">{label}{required && ' *'}</label>
      <input required={required} {...props} className="mt-1 w-full border rounded px-3 py-2 text-sm" />
    </div>
  );
}
function SelectField({ label, required, options, ...props }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-600">{label}{required && ' *'}</label>
      <select required={required} {...props} className="mt-1 w-full border rounded px-3 py-2 text-sm bg-white">
        <option value="">Select…</option>
        {options.map(([val, label2]) => (
          <option key={val} value={val}>{label2}</option>
        ))}
      </select>
    </div>
  );
}
