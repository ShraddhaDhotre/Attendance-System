import React, { useState, useEffect } from 'react';
import { Layout } from '../Layout';
import { MapPin, Clock, CheckCircle, AlertCircle, BookOpen, Calendar, TrendingUp } from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import StudentSubmissions from './StudentSubmissions';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
}

export const StudentDashboard: React.FC = () => {
  const [classCode, setClassCode] = useState('');
  const [location, setLocation] = useState<LocationState>({ latitude: null, longitude: null, error: null });
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<{ success: boolean; message: string } | null>(null);
  const [courses, setCourses] = useState<Array<{ id: number; code: string; name: string }>>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [recentAttendanceState, setRecentAttendanceState] = useState<Array<{ course: string; date: string; status: string; time: string }>>([]);
  const [viewSubmissions, setViewSubmissions] = useState(false);

  useEffect(() => {
    // Fetch available courses (development-only public endpoint)
    (async () => {
      try {
        const data = await apiFetch('/api/courses/public');
        if (Array.isArray(data) && data.length) {
          setCourses(data);
          setSelectedCourseId(data[0].id);
        }
      } catch (err) {
        console.warn('Failed to load courses:', err);
      }
    })();

    // Get user's location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            error: null,
          });
        },
        (_) => {
          setLocation({
            latitude: null,
            longitude: null,
            error: 'Location access denied. Please enable location services.',
          });
        }
      );
    } else {
      setLocation({
        latitude: null,
        longitude: null,
        error: 'Geolocation is not supported by this browser.',
      });
    }
  }, []);

  // Load student's recent attendance when auth is available
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const attendance = await apiFetch(`/api/attendance/student/${user.id}`);
        if (Array.isArray(attendance)) {
          setLastSubmission(null);
          // Map attendance to recentAttendance display items
          // Each item: { course, date, status, time }
          const recent = attendance.slice(0, 10).map((rec: any) => ({
            course: rec.session?.course?.code ?? 'Unknown',
            date: new Date(rec.submitted_at).toLocaleDateString(),
            status: rec.is_verified ? 'Present' : 'Unverified',
            time: new Date(rec.submitted_at).toLocaleTimeString(),
          }));
          setRecentAttendanceState(recent);
        }
      } catch (err) {
        console.warn('Failed to load attendance history', err);
      }
    })();
  }, [user]);

  // Toggle to show student's own submissions page
  const handleViewMySubmissions = () => setViewSubmissions(v => !v);

  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);
    try {
      // Use selected course if available
      const courseId = selectedCourseId ?? 1; // fallback to 1 for development
      // Normalize class code to strip whitespace and non-alphanumeric chars (users may paste extra chars)
      const cleaned = (classCode || '').toString().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (!cleaned) {
        setLastSubmission({ success: false, message: 'Invalid class code. Please check with your instructor.' });
        setSubmitting(false);
        return;
      }

      await apiFetch('/api/attendance/submit', {
        method: 'POST',
        body: JSON.stringify({
          courseId,
          classCode: cleaned,
          lat: location.latitude,
          lng: location.longitude,
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: (navigator as any).platform || '',
            screenSize: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : undefined,
          }
        })
      });
      
      setLastSubmission({ success: true, message: 'Attendance submitted successfully! Your presence has been recorded.' });
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown error occurred';
      const msg = errorMessage.includes('Invalid') ? 'Invalid class code. Please check with your instructor.' : 
                  errorMessage.includes('Location') ? 'Location verification failed. Please ensure you are in the classroom.' :
                  errorMessage.includes('already') ? 'Attendance already submitted for this session.' :
                  'Failed to submit attendance. Please try again.';
      setLastSubmission({ success: false, message: msg });
    }
  setSubmitting(false);
  setClassCode('');
    
    // Clear message after 5 seconds
    setTimeout(() => setLastSubmission(null), 5000);
  };

  // Render enrolled courses from available courses (enrollment model not implemented yet)
  const enrolledCourses = courses.map((c) => ({
    code: c.code,
    name: c.name,
    instructor: '',
    schedule: 'TBD',
    attendance: 0,
  }));

  const recentAttendance = recentAttendanceState;

  const stats = [
    { label: 'Overall Attendance', value: recentAttendanceState.length ? `${Math.round((recentAttendanceState.filter(r=>r.status==='Present').length / recentAttendanceState.length) * 100)}%` : '—', icon: TrendingUp, color: 'bg-green-500' },
    { label: 'Enrolled Courses', value: String(enrolledCourses.length || '—'), icon: BookOpen, color: 'bg-blue-500' },
    { label: 'Classes This Week', value: '—', icon: Calendar, color: 'bg-purple-500' },
  ];

  return (
    <Layout title="Student Dashboard">
      <div className="space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Attendance Submission */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Submit Attendance</h3>
            
            <form onSubmit={handleSubmitAttendance} className="space-y-6">
              <div>
                <label htmlFor="classCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Class Code
                </label>
                  <div className="flex space-x-2">
                    <select
                      value={selectedCourseId ?? ''}
                      onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-md bg-white"
                    >
                      {courses.length === 0 && <option value="">Select course</option>}
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                      ))}
                    </select>

                    <input
                  type="text"
                  id="classCode"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
                  placeholder="Enter class code from instructor"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono uppercase"
                  maxLength={6}
                />
                  </div>
              </div>

              {/* Location Status */}
              <div className="flex items-center space-x-2 text-sm">
                <MapPin className="h-4 w-4" />
                {location.error ? (
                  <span className="text-red-600">{location.error}</span>
                ) : location.latitude && location.longitude ? (
                  <span className="text-green-600">Location verified</span>
                ) : (
                  <span className="text-yellow-600">Getting location...</span>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting || !classCode.trim() || !location.latitude}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {submitting ? 'Submitting...' : 'Submit Attendance'}
              </button>
            </form>

            <div className="mt-4">
              <button onClick={handleViewMySubmissions} className="px-3 py-2 bg-indigo-600 text-white rounded-md">View My Submissions</button>
            </div>
            {viewSubmissions && (
              <div className="mt-6">
                <StudentSubmissions />
              </div>
            )}

            {/* Submission Result */}
            {lastSubmission && (
              <div className={`mt-4 p-4 rounded-md flex items-center space-x-2 ${
                lastSubmission.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {lastSubmission.success ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <span className="text-sm font-medium">{lastSubmission.message}</span>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Get the class code from your instructor</li>
                <li>• Ensure you're physically present in the classroom</li>
                <li>• Submit the code to mark your attendance</li>
                <li>• Your location will be automatically verified</li>
              </ul>
            </div>
          </div>

          {/* Enrolled Courses */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Enrolled Courses</h3>
            <div className="space-y-4">
              {enrolledCourses.map((course, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{course.code}</h4>
                      <p className="text-sm text-gray-600">{course.name}</p>
                      <p className="text-sm text-gray-500">{course.instructor}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      course.attendance >= 90 ? 'bg-green-100 text-green-800' :
                      course.attendance >= 80 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {course.attendance}%
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{course.schedule}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Attendance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Attendance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentAttendance.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.course}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.status === 'Present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.time}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};