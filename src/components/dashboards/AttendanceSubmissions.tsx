import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';

interface SubmissionRow {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  submitted_at: string;
  is_verified: boolean;
}

interface Props {
  sessionId?: number | null;
}

export const AttendanceSubmissions: React.FC<Props> = ({ sessionId: initialSessionId = null }) => {
  // If sessionId not provided via props, try to read from URL query ?sessionId=
  const getSessionIdFromUrl = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('sessionId');
      return s ? Number(s) : null;
    } catch (_) { return null; }
  };

  const [sessionId, setSessionId] = useState<number | null>(initialSessionId ?? getSessionIdFromUrl());
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('');

  useEffect(() => {
    if (!sessionId) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        setError(null);
        const res = await apiFetch<any>(`/api/attendance/submissions?sessionId=${sessionId}`);
        // apiFetch may throw for non-2xx; ensure structure
        let data = Array.isArray(res.submissions) ? res.submissions : [];

        // client-side date filter (optional)
        if (dateFilter) {
          data = data.filter((r: any) => new Date(r.submitted_at).toLocaleDateString() === new Date(dateFilter).toLocaleDateString());
        }

        if (mounted) setRows(data);
      } catch (err: any) {
        console.error('Failed to load submissions', err);
        if (mounted) {
          setRows([]);
          setError((err && (err.message || err.error)) ? (err.message || err.error) : 'Failed to load submissions');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const timer = setInterval(load, 5000); // refresh periodically
    return () => { mounted = false; clearInterval(timer); };
  }, [sessionId, dateFilter]);

  const exportCsv = async () => {
    try {
      const csvRows = ['Student Name,PRN,Email,Date,Time,Status'];
      rows.forEach((s) => {
        const dt = new Date(s.submitted_at);
        csvRows.push(`"${s.studentName}","${s.studentId}","${s.studentEmail}","${dt.toLocaleDateString()}","${dt.toLocaleTimeString()}","${s.is_verified ? 'Present' : 'Unverified'}"`);
      });
      const csv = csvRows.join('\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(csv);
        alert('CSV copied to clipboard');
      } else {
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `submissions-${sessionId || 'all'}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Submitted Attendance</h3>
        <div className="flex items-center space-x-2">
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="px-2 py-1 border rounded-md" />
          <button onClick={exportCsv} className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm">Download CSV</button>
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-4">Select a session ID to view submissions. If you navigated here from an active session, it will prefill.</div>
      <div className="mb-4">
        <label className="text-sm text-gray-700 mr-2">Session ID:</label>
        <input type="number" value={sessionId ?? ''} onChange={(e) => setSessionId(e.target.value ? Number(e.target.value) : null)} className="px-2 py-1 border rounded-md" />
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-600">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">PRN</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">No submissions</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.studentName}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{r.studentId}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{r.studentEmail}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{new Date(r.submitted_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{new Date(r.submitted_at).toLocaleTimeString()}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${r.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{r.is_verified ? 'Present' : 'Unverified'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AttendanceSubmissions;
