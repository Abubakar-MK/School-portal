import { useEffect, useState } from 'react';
import api from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import Header from '../../components/Header';
import DashboardCard from '../../components/DashboardCard';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/dashboard/admin').then((res) => setStats(res.data)); }, []);

  return (
    <DashboardLayout subtitle="Admin Portal">
      <Header title="Dashboard" />
      <div className="p-8 grid grid-cols-3 gap-4 max-w-3xl">
        {stats && (
          <>
            <DashboardCard label="Draft Results (unassigned)" value={stats.draftResults} accent="gray" />
            <DashboardCard label="My Submitted Results" value={stats.mySubmittedResults} accent="gold" />
            <DashboardCard label="Students I Registered" value={stats.studentsIRegistered} accent="maroon" />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
