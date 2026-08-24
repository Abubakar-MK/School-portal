import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import Header from '../../components/Header';

export default function StudentDashboard() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/auth/me').then((res) => setProfile(res.data.profile)).catch(() => setError('Could not load profile.'));
  }, []);

  return (
    <DashboardLayout subtitle="Student Portal">
      <Header title="Dashboard" />
      <div className="p-8 max-w-3xl">
        {error && <p className="text-red-600">{error}</p>}
        {profile && (
          <div className="bg-white rounded-lg shadow p-6 flex gap-6 items-start">
            <img
              src={profile.photo_url ? `${import.meta.env.VITE_API_BASE_URL.replace('/api', '')}${profile.photo_url}` : '/logo.png'}
              alt="Student"
              className="w-28 h-28 rounded-full object-cover border-4 border-gold"
            />
            <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div className="col-span-2">
                <div className="text-xl font-bold text-maroon">
                  {profile.first_name} {profile.middle_name} {profile.last_name}
                </div>
                <div className="text-gray-500">{profile.matric_number}</div>
              </div>
              <Field label="Faculty" value={profile.faculty_name} />
              <Field label="Department" value={profile.department_name} />
              <Field label="Programme" value={profile.programme_name} />
              <Field label="Level" value={profile.level_name} />
              <Field label="Status" value={profile.status} />
            </div>
          </div>
        )}
        <Link
          to="/student/current-result"
          className="mt-6 inline-block bg-maroon hover:bg-maroon-light text-white font-semibold px-6 py-3 rounded shadow"
        >
          VIEW MY CURRENT RESULT
        </Link>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div className="text-gray-400 text-xs uppercase tracking-wide">{label}</div>
      <div className="font-medium text-gray-800">{value || '—'}</div>
    </div>
  );
}
