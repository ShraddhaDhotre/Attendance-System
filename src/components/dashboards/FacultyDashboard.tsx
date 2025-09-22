import React, { useState } from 'react';
import { Layout } from '../Layout';
import { BookOpen, Users, Calendar, MapPin, Clock, QrCode, Eye } from 'lucide-react';

export const FacultyDashboard: React.FC = () => {
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [classCode, setClassCode] = useState<string>('');

  const generateClassCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setClassCode(code);
    setActiveSession('CS101-' + Date.now());
  };

  const endSession = () => {
    setActiveSession(null);
    setClassCode('');
  };

  const courses = [
    { code: 'CS 101', name: 'Introduction to Programming', students: 45, schedule: 'MWF 9:00 AM' },
    { code: 'CS 201', name: 'Data Structures', students: 38, schedule: 'TTh 11:00 AM' },
  ];

  const recentAttendance = [
    { course: 'CS 101', date: '2024-01-15', present: 42, total: 45, percentage: 93.3 },
    { course: 'CS 201', date: '2024-01-15', present: 35, total: 38, percentage: 92.1 },
    { course: 'CS 101', date: '2024-01-13', present: 43, total: 45, percentage: 95.6 },
    { course: 'CS 201', date: '2024-01-12', present: 36, total: 38, percentage: 94.7 },
  ];

  return (
    <Layout title="Faculty Dashboard">
      <div className="space-y-8">
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
                <p className="text-2xl font-bold text-gray-900">{courses.reduce((sum, course) => sum + course.students, 0)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Classes Today</p>
                <p className="text-2xl font-bold text-gray-900">3</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Attendance</p>
                <p className="text-2xl font-bold text-gray-900">93.9%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Live Session Control */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Live Session Control</h3>
            
            {!activeSession ? (
              <div className="text-center">
                <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-6">No active session</p>
                <select className="w-full p-3 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select Course</option>
                  {courses.map((course, index) => (
                    <option key={index} value={course.code}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={generateClassCode}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Start Attendance Session
                </button>
              </div>
            ) : (
              <div className="text-center">
                <div className="bg-blue-50 p-6 rounded-lg mb-6">
                  <h4 className="text-xl font-bold text-blue-900 mb-2">Class Code</h4>
                  <div className="text-4xl font-mono font-bold text-blue-600 tracking-wider">
                    {classCode}
                  </div>
                  <p className="text-sm text-blue-700 mt-2">Share this code with students</p>
                </div>
                
                <div className="flex items-center justify-center text-green-600 mb-4">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span className="text-sm">Location: Room A-101 (GPS Locked)</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">0</p>
                    <p className="text-sm text-gray-600">Submitted</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">45</p>
                    <p className="text-sm text-gray-600">Expected</p>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
                    View Live
                  </button>
                  <button
                    onClick={endSession}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
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
              {courses.map((course, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{course.code}</h4>
                      <p className="text-sm text-gray-600">{course.name}</p>
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <Users className="h-4 w-4 mr-1" />
                        <span>{course.students} students</span>
                        <span className="mx-2">•</span>
                        <Clock className="h-4 w-4 mr-1" />
                        <span>{course.schedule}</span>
                      </div>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800 transition-colors">
                      <Eye className="h-5 w-5" />
                    </button>
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
                    Present
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.present}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.total}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.percentage >= 90 ? 'bg-green-100 text-green-800' : 
                        record.percentage >= 80 ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {record.percentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900">View Details</button>
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