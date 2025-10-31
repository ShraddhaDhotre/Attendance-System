import React, { useState, useEffect } from 'react';
import { Layout } from '../Layout';
import { Users, BookOpen, TrendingUp, Plus, Search, X } from 'lucide-react';
import { apiFetch } from '../../utils/api';

interface Course {
  id: number;
  code: string;
  name: string;
  faculty_id: number;
  faculty?: { id: number; name: string; email: string } | null;
  semester: string;
  created_at: string;
}

interface UserSummary {
  id: number;
  email: string;
  name: string;
  role: 'ADMIN' | 'FACULTY' | 'STUDENT';
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [courses, setCourses] = useState<Course[]>([]);
  const [faculties, setFaculties] = useState<UserSummary[]>([]);
  const [stats, setStats] = useState({
    students: 0,
    courses: 0,
    faculty: 0,
    avgAttendance: 0
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [showAddFacultyModal, setShowAddFacultyModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newCourse, setNewCourse] = useState({
    code: '',
    name: '',
    faculty_id: '',
    semester: ''
  });
  const [newUser, setNewUser] = useState({ email: '', name: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [reports, setReports] = useState<Array<any>>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch courses
        const coursesResponse = await apiFetch('/api/courses');
        const coursesData = coursesResponse as Course[];
        setCourses(coursesData);

        // Fetch users (debug route) and filter faculties
        const usersResponse = await apiFetch('/api/auth/debug');
        const users = usersResponse as UserSummary[];
        const facultyList = users.filter(u => u.role === 'FACULTY');
        setFaculties(facultyList);

        // Calculate stats
        const uniqueStudents = new Set<number>();
        const uniqueFaculty = new Set<number>();
        let totalAttendance = 0;
        let sessionCount = 0;

        coursesData.forEach(course => {
          if (course.faculty) uniqueFaculty.add(course.faculty.id);
        });

        setStats({
          students: uniqueStudents.size || 0,
          courses: coursesData.length,
          faculty: uniqueFaculty.size,
          avgAttendance: sessionCount ? (totalAttendance / sessionCount * 100) : 0
        });

        // Try to fetch admin users/reports if token grants access. Fail silently (no crash) if not authorized.
        try {
          const adminUsers = await apiFetch('/api/admin/users');
          if (Array.isArray(adminUsers)) setUsers(adminUsers as UserSummary[]);
        } catch (err) {
          // ignore - user might not be admin
        }

        try {
          const courseReports = await apiFetch('/api/admin/reports/courses');
          if (Array.isArray(courseReports)) setReports(courseReports as any[]);
        } catch (err) {
          // ignore - user might not be admin
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch users or reports when the corresponding tab is activated
  useEffect(() => {
    const load = async () => {
      if (activeTab === 'users') {
        try {
          const res = await apiFetch('/api/admin/users');
          setUsers(Array.isArray(res) ? (res as UserSummary[]) : []);
        } catch (err: any) {
          setError(err.message || 'Failed to load users (admin access required)');
          setTimeout(() => setError(null), 5000);
        }
      }
      if (activeTab === 'reports') {
        try {
          const res = await apiFetch('/api/admin/reports/courses');
          setReports(Array.isArray(res) ? (res as any[]) : []);
        } catch (err: any) {
          setError(err.message || 'Failed to load reports (admin access required)');
          setTimeout(() => setError(null), 5000);
        }
      }
    };

    load();
  }, [activeTab]);

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await apiFetch('/api/courses', {
        method: 'POST',
        body: JSON.stringify({
          code: newCourse.code,
          name: newCourse.name,
          faculty_id: parseInt(newCourse.faculty_id, 10),
          semester: newCourse.semester,
        })
      });
      
      const created = response as Course;
      setCourses([created, ...courses]);
      setShowAddCourseModal(false);
      setNewCourse({ code: '', name: '', faculty_id: '', semester: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to add course');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleAddUser = async (role: 'FACULTY' | 'STUDENT') => {
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email: newUser.email,
          name: newUser.name,
          password: newUser.password,
          role
        })
      });

      // Refresh users/faculties list
      const usersResponse = await apiFetch('/api/auth/debug');
      const users = usersResponse as UserSummary[];
      setFaculties(users.filter(u => u.role === 'FACULTY'));

      setShowAddFacultyModal(false);
      setShowAddStudentModal(false);
      setNewUser({ email: '', name: '', password: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to add user');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEditCourse = async (course: Course) => {
    // TODO: Implement edit functionality (open modal, send PUT)
    console.log('Edit course (not implemented):', course);
  };

  const handleDeleteCourse = async (courseId: number) => {
    if (!window.confirm('Are you sure you want to delete this course?')) return;
    
    try {
      await apiFetch(`/api/courses/${courseId}`, { method: 'DELETE' });
      setCourses(courses.filter(c => c.id !== courseId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete course');
      setTimeout(() => setError(null), 5000);
    }
  };

  // Map stats for display
  const statCards = [
    { label: 'Total Students', value: stats.students.toString(), change: '', icon: Users, color: 'bg-blue-500' },
    { label: 'Active Courses', value: stats.courses.toString(), change: '', icon: BookOpen, color: 'bg-green-500' },
    { label: 'Faculty Members', value: stats.faculty.toString(), change: '', icon: Users, color: 'bg-purple-500' },
    { label: 'Avg. Attendance', value: `${stats.avgAttendance.toFixed(1)}%`, change: '', icon: TrendingUp, color: 'bg-orange-500' },
  ];

  // Build recent activities from real data (courses and faculty list)
  const recentActivities = React.useMemo(() => {
    const acts: Array<{ action: string; details: string; time: string; type: string }> = [];

    // Most recent courses
    courses.slice(0, 6).forEach((c) => {
      acts.push({ action: 'Course created', details: `${c.code} — ${c.name}`, time: new Date(c.created_at).toLocaleString(), type: 'course' });
    });

    // Recent faculty additions
    faculties.slice(0, 4).forEach((f) => {
      acts.push({ action: 'Faculty added', details: `${f.name} (${f.email})`, time: 'recent', type: 'faculty' });
    });

    // Limit and return
    return acts.slice(0, 6);
  }, [courses, faculties]);

  return (
    <Layout title="Admin Dashboard">
      <div className="space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading dashboard data...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-800 p-4 rounded-md flex items-center space-x-2">
            <X className="h-5 w-5" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  {stat.change && (
                    <p className="text-sm text-green-600 mt-2">{stat.change} from last month</p>
                  )}
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'courses', label: 'Courses' },
              { id: 'users', label: 'Users' },
              { id: 'reports', label: 'Reports' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activities */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Recent Activities</h3>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'course' ? 'bg-blue-500' :
                      activity.type === 'faculty' ? 'bg-purple-500' :
                      activity.type === 'student' ? 'bg-green-500' : 'bg-orange-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-600">{activity.details}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setShowAddCourseModal(true)} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <Plus className="h-6 w-6 text-blue-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Add Course</h4>
                  <p className="text-sm text-gray-600">Create new course</p>
                </button>
                <button onClick={() => setShowAddFacultyModal(true)} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <Users className="h-6 w-6 text-green-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Add Faculty</h4>
                  <p className="text-sm text-gray-600">Register new faculty</p>
                </button>
                <button onClick={() => setShowAddStudentModal(true)} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <Users className="h-6 w-6 text-purple-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Add Student</h4>
                  <p className="text-sm text-gray-600">Register new student</p>
                </button>
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <TrendingUp className="h-6 w-6 text-orange-600 mb-2" />
                  <h4 className="font-medium text-gray-900">View Reports</h4>
                  <p className="text-sm text-gray-600">Attendance analytics</p>
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Users</h3>
              <div className="text-sm text-gray-500">Total: {users.length}</div>
            </div>
            <div className="p-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{u.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(u as any).created_at ? new Date((u as any).created_at).toLocaleDateString() : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onClick={async () => {
                          if (!window.confirm('Delete user?')) return;
                          try {
                            await apiFetch(`/api/admin/users/${u.id}`, { method: 'DELETE' });
                            setUsers(prev => prev.filter(x => x.id !== u.id));
                          } catch (err: any) {
                            setError(err.message || 'Failed to delete user');
                            setTimeout(() => setError(null), 5000);
                          }
                        }} className="text-red-600 hover:text-red-900">Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Course Reports</h3>
              <div className="text-sm text-gray-500">Courses: {reports.length}</div>
            </div>
            <div className="p-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((r, idx) => (
                    <tr key={r.courseId || r.id || idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{r.code} — {r.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{r.sessions ?? r.sessionsCount ?? 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{r.attendance ?? r.attendanceCount ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
                    {activeTab === 'courses' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Course Management</h3>
                <button 
                  onClick={() => setShowAddCourseModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Course
                </button>
              </div>
              <div className="mt-4 flex space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search courses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Faculty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Semester
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {courses
                      .filter(course => 
                        course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        course.name.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((course) => (
                        <tr key={course.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{course.code}</div>
                              <div className="text-sm text-gray-500">{course.name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {course.faculty?.name || 'Unassigned'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {course.semester}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(course.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button 
                              onClick={() => handleEditCourse(course)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteCourse(course.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        
        {/* Add Course Modal */}
        {showAddCourseModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Add New Course</h3>
                <button onClick={() => setShowAddCourseModal(false)} className="text-gray-400 hover:text-gray-500">
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleAddCourse} className="space-y-4">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">Course Code</label>
                  <input
                    id="code"
                    type="text"
                    value={newCourse.code}
                    onChange={(e) => setNewCourse({...newCourse, code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., CS101"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
                  <input
                    id="name"
                    type="text"
                    value={newCourse.name}
                    onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Introduction to Programming"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="faculty_id" className="block text-sm font-medium text-gray-700 mb-1">Faculty</label>
                  {faculties.length > 0 ? (
                    <select
                      id="faculty_id"
                      value={newCourse.faculty_id}
                      onChange={(e) => setNewCourse({...newCourse, faculty_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                      required
                    >
                      <option value="">Select faculty</option>
                      {faculties.map(f => (
                        <option key={f.id} value={String(f.id)}>{f.name} — {f.email} (id: {f.id})</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="faculty_id"
                      type="text"
                      value={newCourse.faculty_id}
                      onChange={(e) => setNewCourse({...newCourse, faculty_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Faculty ID number (no faculty list available)"
                      required
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-1">Enter the faculty's database ID or choose from the list. Faculty ID is a number.</p>
                </div>
                
                <div>
                  <label htmlFor="semester" className="block text-sm font-medium text-gray-700 mb-1">Semester</label>
                  <input
                    id="semester"
                    type="text"
                    value={newCourse.semester}
                    onChange={(e) => setNewCourse({...newCourse, semester: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Fall 2025"
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddCourseModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Course
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Add Faculty Modal */}
        {showAddFacultyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Register Faculty</h3>
                <button onClick={() => setShowAddFacultyModal(false)} className="text-gray-400 hover:text-gray-500">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleAddUser('FACULTY'); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                  <input value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button type="button" onClick={() => setShowAddFacultyModal(false)} className="px-4 py-2 border border-gray-300 rounded-md">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md">Register</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Student Modal */}
        {showAddStudentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Register Student</h3>
                <button onClick={() => setShowAddStudentModal(false)} className="text-gray-400 hover:text-gray-500">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleAddUser('STUDENT'); }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                  <input value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button type="button" onClick={() => setShowAddStudentModal(false)} className="px-4 py-2 border border-gray-300 rounded-md">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md">Register</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};