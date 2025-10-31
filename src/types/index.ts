export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'faculty' | 'student';
  faculty_id?: string;
  student_id?: string;
  created_at: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  faculty_id: string;
  faculty_name: string;
  semester: string;
  created_at: string;
}

export interface ClassSession {
  id: string;
  course_id: string;
  course_name: string;
  class_code: string;
  start_time: string;
  end_time: string;
  location_latitude: number;
  location_longitude: number;
  location_radius: number; // in meters
  is_active: boolean;
  created_by: string;
}

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  student_name: string;
  course_name: string;
  submitted_at: string;
  location_latitude: number;
  location_longitude: number;
  is_verified: boolean;
}

export interface AuthContextType {
  user: User | null;
  // remember: when true, also persist to localStorage so the session is shared across tabs
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => void;
  loading: boolean;
}