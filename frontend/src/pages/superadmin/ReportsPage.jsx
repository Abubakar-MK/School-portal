import { useEffect, useState } from 'react';
import api from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import Header from '../../components/Header';

export default function ReportsPage() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/dashboard/super-admin').then((res) => setStats(res.data)); }, []);

  if (!stats) return <DashboardLayout><p className="p-8">Loading…</p></DashboardLayout>;

  return (
    <DashboardLayout subtitle="Super Admin Portal">
      <Header title="Reports" right={<button onClick={() => window.print()} className="no-print bg-maroon text-white px-4 py-2 rounded text-sm">Print / Export</button>} />
      <div className="p-8 print-area max-w-3xl">
        <h2 className="font-bold text-lg text-maroon mb-4">Institution Summary</h2>
        <table className="w-full text-sm border mb-8">
          <tbody>
            <Row label="Total Students" value={stats.totals.students} />
            <Row label="Total Admins" value={stats.totals.admins} />
            <Row label="Total Departments" value={stats.totals.departments} />
            <Row label="Total Courses" value={stats.totals.courses} />
            <Row label="Draft Results" value={stats.totals.draftResults} />
            <Row label="Pending Approval" value={stats.totals.pendingApproval} />
            <Row label="Approved Results" value={stats.totals.approvedResults} />
            <Row label="Published Results" value={stats.totals.publishedResults} />
            <Row label="Rejected Results" value={stats.totals.rejectedResults} />
          </tbody>
        </table>

        <h2 className="font-bold text-lg text-maroon mb-4">Students by Department</h2>
        <table className="w-full text-sm border">
          <thead><tr className="bg-gray-100"><th className="text-left px-3 py-2">Department</th><th className="text-left px-3 py-2">Students</th></tr></thead>
          <tbody>
            {stats.studentsByDepartment.map((d) => (
              <tr key={d.name} className="border-t"><td className="px-3 py-2">{d.name}</td><td className="px-3 py-2">{d.n}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

function Row({ label, value }) {
  return (
    <tr className="border-t">
      <td className="px-3 py-2 text-gray-600">{label}</td>
      <td className="px-3 py-2 font-semibold">{value}</td>
    </tr>
  );
}
