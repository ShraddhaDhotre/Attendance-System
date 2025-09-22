import React, { useState, useEffect } from 'react';
import { Layout } from '../Layout';
import { MapPin, Clock, CheckCircle, AlertCircle, BookOpen, Calendar, TrendingUp } from 'lucide-react';

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

  useEffect(() => {
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

  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classCode.trim()) return;

    setSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock validation
    const isValidCode = classCode.toUpperCase() === 'ABC123';
    const isLocationValid = location.latitude !== null && location.longitude !== null;
    
    if (isValidCode && isLocationValid) {
      setLastSubmission({
        success: true,
        message: 'Attendance submitted successfully! Your presence has been recorded.',
      });
    } else if (!isValidCode) {
      setLastSubmission({
        success: false,
        message: 'Invalid class code. Please check with your instructor.',
      });
    } else {
      setLastSubmission({
        success: false,
        message: 'Location verification failed. Please ensure you are in the classroom.',
      });
    }
    
    setSubmitting(false);
    setClassCode('');
    
    // Clear message after 5 seconds
    setTimeout(() => setLastSubmission(null), 5000);
  };

  const enrolledCourses = [
    { code: 'CS 101', name: 'Introduction to Java Programming', instructor: 'Prof. Jalinder Gandal ', schedule: 'MWF 9:00 AM', attendance: 92 },
    { code: 'CS 201', name: 'Data Structures', instructor: 'Prof. Swapnil Goje', schedule: 'TTh 11:00 AM', attendance: 88 },
    { code: 'CS 301', name: 'Internet Of Things', instructor: 'Prof. Geeta Mete', schedule: 'MWF 2:00 PM', attendance: 95 },
  ];

  const recentAttendance = [
    { course: 'CS 101', date: '2024-01-15', status: 'Present', time: '9:05 AM' },
    { course: 'CS 201', date: '2024-01-14', status: 'Present', time: '11:02 AM' },
    { course: 'CS 301', date: '2024-01-13', status: 'Present', time: '2:01 PM' },
    { course: 'CS 101', date: '2024-01-13', status: 'Absent', time: '-' },
    { course: 'CS 201', date: '2024-01-12', status: 'Present', time: '11:03 AM' },
  ];

  const stats = [
    { label: 'Overall Attendance', value: '91.7%', icon: TrendingUp, color: 'bg-green-500' },
    { label: 'Enrolled Courses', value: '3', icon: BookOpen, color: 'bg-blue-500' },
    { label: 'Classes This Week', value: '8', icon: Calendar, color: 'bg-purple-500' },
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
                <input
                  type="text"
                  id="classCode"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                  placeholder="Enter class code from instructor"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono uppercase"
                  maxLength={6}
                />
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