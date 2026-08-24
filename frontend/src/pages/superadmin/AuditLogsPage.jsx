import { useEffect, useState } from 'react';
import api from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import Header from '../../components/Header';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get('/audit-logs').then((res) => setLogs(res.data)); }, []);

  return (
    <DashboardLayout subtitle="Super Admin Portal">
      <Header title="Audit Logs" />
      <div className="p-8">
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-maroon text-white">
              <tr><Th>Timestamp</Th><Th>Actor</Th><Th>Role</Th><Th>Action</Th><Th>Target</Th></tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b">
                  <Td>{new Date(l.created_at).toLocaleString()}</Td>
                  <Td>{l.actor_name || '—'}</Td>
                  <Td>{l.role || '—'}</Td>
                  <Td>{l.action}</Td>
                  <Td className="truncate max-w-xs">{l.target || '—'}</Td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td className="p-4 text-gray-500" colSpan={5}>No activity recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Th({ children }) { return <th className="text-left px-3 py-2 text-xs">{children}</th>; }
function Td({ children }) { return <td className="px-3 py-2 text-xs">{children}</td>; }
