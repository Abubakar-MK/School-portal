import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts';
import api from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import Header from '../../components/Header';
import DashboardCard from '../../components/DashboardCard';

const COLORS = ['#7a1215', '#e0b325', '#a3181c', '#f5d76e', '#5c0d0f', '#c9a227'];

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/dashboard/super-admin').then((res) => setStats(res.data)); }, []);

  if (!stats) return <DashboardLayout><p className="p-8">Loading…</p></DashboardLayout>;

  const { totals, studentsByDepartment } = stats;
  const resultStatusData = [
    { name: 'Draft', value: totals.draftResults },
    { name: 'Pending Approval', value: totals.pendingApproval },
    { name: 'Approved', value: totals.approvedResults },
    { name: 'Published', value: totals.publishedResults },
    { name: 'Rejected', value: totals.rejectedResults },
  ];

  return (
    <DashboardLayout subtitle="Super Admin Portal">
      <Header title="Dashboard" />
      <div className="p-8">
        <div className="grid grid-cols-4 gap-4 mb-8">
          <DashboardCard label="Total Students" value={totals.students} />
          <DashboardCard label="Total Admins" value={totals.admins} accent="gold" />
          <DashboardCard label="Departments" value={totals.departments} accent="gray" />
          <DashboardCard label="Courses" value={totals.courses} accent="gray" />
          <DashboardCard label="Draft Results" value={totals.draftResults} accent="gray" />
          <DashboardCard label="Pending Approval" value={totals.pendingApproval} accent="gold" />
          <DashboardCard label="Published Results" value={totals.publishedResults} />
          <DashboardCard label="Rejected Results" value={totals.rejectedResults} accent="gray" />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded shadow p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Students by Department</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={studentsByDepartment} dataKey="n" nameKey="name" outerRadius={90} label>
                  {studentsByDepartment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded shadow p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Result Performance / Workflow</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={resultStatusData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#7a1215" name="Results" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
