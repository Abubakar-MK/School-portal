import { useState } from 'react';
import api from '../../api/axios';
import DashboardLayout from '../../components/DashboardLayout';
import Header from '../../components/Header';

export default function BulkUploadStudentsPage() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError('');
    setSummary(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const { data } = await api.post('/students/bulk-upload', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSummary(data);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout subtitle="Admin Portal">
      <Header title="Bulk Upload Students" />
      <div className="p-8 max-w-3xl space-y-6">
        <div className="bg-white rounded shadow p-5">
          <h3 className="font-semibold text-gray-700 mb-2">1. Download the template</h3>
          <p className="text-sm text-gray-500 mb-3">
            Fill in one row per student. Faculty, Department, Programme, Level and Admission Session must
            match names already set up under <b>Academic Structure</b> exactly (case-insensitive).
            Every student's initial login password will be their phone number.
          </p>
          <a
            href="/student-upload-template.csv"
            download
            className="inline-block bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm font-medium"
          >
            ⬇ Download CSV Template
          </a>
        </div>

        <form onSubmit={handleUpload} className="bg-white rounded shadow p-5">
          <h3 className="font-semibold text-gray-700 mb-2">2. Upload your completed CSV</h3>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files[0])}
            className="block text-sm mb-3"
          />
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <button
            disabled={!file || uploading}
            className="bg-maroon hover:bg-maroon-light text-white font-semibold px-5 py-2 rounded text-sm disabled:opacity-60"
          >
            {uploading ? 'Uploading…' : 'Upload Students'}
          </button>
        </form>

        {summary && (
          <div className="bg-white rounded shadow p-5">
            <h3 className="font-semibold text-gray-700 mb-2">Result</h3>
            <p className="text-sm mb-3">
              <span className="text-green-700 font-semibold">{summary.succeeded} succeeded</span>
              {' · '}
              <span className="text-red-700 font-semibold">{summary.failed} failed</span>
              {' · '}
              {summary.total} total rows
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-2 py-1">Row</th>
                  <th className="text-left px-2 py-1">Matric No.</th>
                  <th className="text-left px-2 py-1">Status</th>
                  <th className="text-left px-2 py-1">Detail</th>
                </tr>
              </thead>
              <tbody>
                {summary.results.map((r) => (
                  <tr key={r.row} className="border-b">
                    <td className="px-2 py-1">{r.row}</td>
                    <td className="px-2 py-1">{r.matricNumber}</td>
                    <td className={`px-2 py-1 font-medium ${r.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                      {r.status}
                    </td>
                    <td className="px-2 py-1 text-gray-500">{r.error || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
