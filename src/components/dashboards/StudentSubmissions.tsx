import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export const StudentSubmissions: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiFetch<any>(`/api/attendance/student/${user.id}`);
        if (mounted) setRows(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error('Failed to load student submissions', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(timer); };
  }, [user]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <h3 className="text-lg font-medium text-gray-900 mb-4">My Attendance Submissions</h3>
      {loading ? (
        <div className="py-8 text-center">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">No submissions found</td></tr>
              ) : rows.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{r.session?.course?.code ?? '—'}</td>
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

export default StudentSubmissions;
