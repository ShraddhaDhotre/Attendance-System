import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthContextType, User } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Simulate API call - in real app, this would be a Supabase auth call
      const mockUsers: User[] = [
        {
          id: '1',
          email: 'admin@university.edu',
          name: 'System Administrator',
          role: 'admin',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          email: 'faculty@university.edu',
          name: 'Dr. John Smith',
          role: 'faculty',
          faculty_id: 'FAC001',
          created_at: new Date().toISOString(),
        },
        {
          id: '3',
          email: 'student@university.edu',
          name: 'Alice Johnson',
          role: 'student',
          student_id: 'STU001',
          created_at: new Date().toISOString(),
        },
      ];

      const foundUser = mockUsers.find(u => u.email === email);
      if (!foundUser || password !== 'password123') {
        throw new Error('Invalid credentials');
      }

      setUser(foundUser);
      localStorage.setItem('user', JSON.stringify(foundUser));
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const value = {
    user,
    login,
    logout,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};