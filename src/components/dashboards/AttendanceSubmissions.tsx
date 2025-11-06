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
  const [sessionId, setSessionId] = useState<number | null>(initialSessionId);
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        setError(null);

        // ✅ Step 1: Auto-detect sessionId if not provided
        let sid = sessionId;
        if (!sid) {
          const activeRes = await apiFetch<any>('/api/attendance/active-session');
          if (activeRes?.sessionId) sid = activeRes.sessionId;
          else {
            const sessionsRes = await apiFetch<any>('/api/attendance/sessions?limit=1&sort=desc');
            sid = sessionsRes?.[0]?.id || null;
          }
          if (mounted) setSessionId(sid);
        }

        // ✅ Step 2: Fetch submissions
        if (sid) {
          const res = await apiFetch<any>(`/api/attendance/submissions?sessionId=${sid}`);
          let data = Array.isArray(res.submissions) ? res.submissions : [];

          if (dateFilter) {
            data = data.filter((r: any) =>
              new Date(r.submitted_at).toLocaleDateString() ===
              new Date(dateFilter).toLocaleDateString()
            );
          }

          if (mounted) setRows(data);
        } else if (mounted) {
          setRows([]);
          setError('No active session found');
        }
      } catch (err: any) {
        console.error('Failed to load submissions', err);
        if (mounted) {
          setRows([]);
          setError(err.message || 'Failed to load submissions');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const timer = setInterval(load, 5000);
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
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `submissions-${sessionId || 'all'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Submitted Attendance</h3>
        <div className="flex items-center space-x-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-2 py-1 border rounded-md"
          />
          <button
            onClick={exportCsv}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
          >
            Download CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
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
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                    No submissions
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.studentName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.studentId}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.studentEmail}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{new Date(r.submitted_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{new Date(r.submitted_at).toLocaleTimeString()}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          r.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {r.is_verified ? 'Present' : 'Unverified'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AttendanceSubmissions;
