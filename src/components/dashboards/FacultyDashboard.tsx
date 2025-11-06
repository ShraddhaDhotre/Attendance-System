import React, { useEffect, useState, useRef } from 'react';
import { Layout } from '../Layout';
import { BookOpen, Users, Calendar, MapPin, Clock, QrCode, Eye } from 'lucide-react';
import { apiFetch, getAuthToken } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import AttendanceSubmissions from './AttendanceSubmissions';
import { motion, AnimatePresence } from 'framer-motion';

interface Course {
  id: number;
  code: string;
  name: string;
  faculty: { name: string };
  sessions: Array<{ id: number; class_code: string; is_active: boolean }>;
}

interface Session {
  id: number;
  class_code: string;
  course: { id: number; code: string; name: string };
  start_time: string;
  lat: number;
  lng: number;
  attendance: Array<{ id: number; student_id: number }>;
}

export const FacultyDashboard: React.FC = () => {
  useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [submittedCount, setSubmittedCount] = useState<number>(0);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [view, setView] = useState<'overview' | 'submissions'>('overview');
  const [loading, setLoading] = useState(true);

  // ✅ Handle back/forward navigation
  useEffect(() => {
    const onPop = () => {
      setView(window.location.pathname.includes('attendance-submissions') ? 'submissions' : 'overview');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ✅ Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      });
    }
  }, []);

  // ✅ Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesData, sessionsData] = await Promise.all([
          apiFetch<Course[]>('/api/courses'),
          apiFetch<Session[]>('/api/sessions/active')
        ]);
        setCourses(coursesData);

        // Find active session for this faculty
        const myActiveSession = sessionsData.find(session =>
          session.course && coursesData.some(course => course.id === session.course.id)
        );

        if (myActiveSession) {
          setActiveSession(myActiveSession);
          setSubmittedCount(myActiveSession.attendance.length);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ✅ Start Session
  const startSession = async () => {
    if (!selectedCourseId || lat == null || lng == null) return;
    try {
      const session = await apiFetch<Session>('/api/sessions/start', {
        method: 'POST',
        body: JSON.stringify({
          courseId: selectedCourseId,
          lat,
          lng,
          radiusM: 50
        })
      });
      setActiveSession(session);
      setSubmittedCount(0);
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  // ✅ End Session
  const endSession = async () => {
    if (!activeSession) return;
    try {
      await apiFetch(`/api/sessions/end/${activeSession.id}`, { method: 'POST' });
      setActiveSession(null);
      setSubmittedCount(0);
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  // ✅ Live View (Real-time attendance count)
  const handleViewLive = () => {
    if (!activeSession) return;
    if (liveConnected && eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setLiveConnected(false);
      return;
    }

    const token = getAuthToken();
    const base = (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL)
      ? (import.meta as any).env.VITE_API_URL
      : '';
    const url = `${base.replace(/\/$/, '')}/api/sessions/live/${activeSession.id}${token ? `?token=${token}` : ''}`;

    try {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.addEventListener('attendance', () => {
        try {
          setSubmittedCount(prev => prev + 1);
        } catch (err) { console.error('Invalid attendance event', err); }
      });

      es.addEventListener('sessionEnded', () => {
        setActiveSession(null);
        setSubmittedCount(0);
        if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; }
        setLiveConnected(false);
      });

      es.onerror = (err) => {
        console.error('EventSource error', err);
        if (eventSourceRef.current) { eventSourceRef.current.close(); eventSourceRef.current = null; }
        setLiveConnected(false);
      };

      setLiveConnected(true);
    } catch (err) {
      console.error('Failed to open live view', err);
    }
  };

  // ✅ Auto-refresh submission count
  useEffect(() => {
    let timer: any;
    if (activeSession) {
      const fetchSubmissions = async () => {
        try {
          const res = await apiFetch<any>(`/api/attendance/submissions?sessionId=${activeSession.id}`);
          const rows = Array.isArray(res.submissions) ? res.submissions : [];
          setSubmittedCount(rows.length);
        } catch (error) {
          console.error('Error fetching attendance submissions:', error);
        }
      };
      fetchSubmissions();
      timer = setInterval(fetchSubmissions, 3000);
    }
    return () => timer && clearInterval(timer);
  }, [activeSession]);

  if (loading) {
    return (
      <Layout title="Faculty Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  const totalStudents = courses.reduce((sum, course) => sum + (course.sessions?.length || 0), 0);

  return (
    <Layout title="Faculty Dashboard">
      <div className="space-y-8">

        {/* Toggle View Submitted Attendance */}
        <div className="flex justify-end">
          <button
            onClick={() => setView(view === 'submissions' ? 'overview' : 'submissions')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            {view === 'submissions' ? 'Hide Submitted Attendance' : 'View Submitted Attendance'}
          </button>
        </div>

        {/* Animated Submissions Table */}
        <AnimatePresence>
          {view === 'submissions' && (
            <motion.div
              key="attendance-submissions"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6"
            >
              <AttendanceSubmissions sessionId={activeSession?.id ?? null} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Courses</p>
                <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Classes Today</p>
                <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{activeSession ? 1 : 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Session Control */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Live Session Control</h3>

            {!activeSession ? (
              <div className="text-center">
                <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-6">No active session</p>
                <select
                  value={selectedCourseId ?? ''}
                  onChange={(e) => setSelectedCourseId(Number(e.target.value) || null)}
                  className="w-full p-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={startSession}
                  disabled={!selectedCourseId || lat === null}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Start Attendance Session
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="bg-blue-50 p-6 rounded-lg mb-6">
                  <h4 className="text-xl font-bold text-blue-900 mb-2">Class Code</h4>
                  <div className="flex items-center justify-center space-x-4">
                    <div className="text-4xl font-mono font-bold text-blue-600 tracking-wider select-all">
                      {activeSession.class_code}
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const code = String(activeSession.class_code);
                          await navigator.clipboard.writeText(code);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 1600);
                        } catch (err) {
                          console.error('Copy failed', err);
                        }
                      }}
                      className="ml-2 inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Copy Code
                    </button>
                  </div>
                  {copied && <div className="mt-2 text-sm text-green-600">Code copied!</div>}
                </div>

                <div className="flex items-center justify-center text-green-600 mb-4">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span className="text-sm">
                    GPS locked {lat?.toFixed(4)}, {lng?.toFixed(4)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{submittedCount}</p>
                    <p className="text-sm text-gray-600">Submitted</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">-</p>
                    <p className="text-sm text-gray-600">Expected</p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleViewLive}
                    className={`flex-1 ${liveConnected ? 'bg-gray-600' : 'bg-green-600'} text-white py-2 px-4 rounded-md hover:opacity-90`}
                  >
                    {liveConnected ? 'Disconnect Live' : 'View Live'}
                  </button>
                  <button
                    onClick={endSession}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
                  >
                    End Session
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* My Courses */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6">My Courses</h3>
            <div className="space-y-4">
              {courses.map((course) => (
                <div key={course.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{course.code}</h4>
                      <p className="text-sm text-gray-600">{course.name}</p>
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <Users className="h-4 w-4 mr-1" />
                        <span>{course.sessions?.length || 0} sessions</span>
                        <span className="mx-2">•</span>
                        <Clock className="h-4 w-4 mr-1" />
                        <span>Fall 2024</span>
                      </div>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800">
                      <Eye className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
