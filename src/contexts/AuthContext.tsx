import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthContextType, User } from '../types';
import { apiFetch } from '../utils/api';

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
      // Use centralized apiFetch which respects VITE_API_URL and includes token
      let data: any;
      try {
        data = await apiFetch<any>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
      } catch (err) {
        // attempt auto-register fallback for dev environments
        try {
          await apiFetch('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, name: email, role: 'STUDENT', password }),
          });
          data = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });
        } catch (e) {
          throw new Error('Invalid credentials');
        }
      }
  const backendUser = data.user as { id: number; email: string; name: string; role: 'ADMIN'|'FACULTY'|'STUDENT' };
      const mapped: User = {
        id: String(backendUser.id),
        email: backendUser.email,
        name: backendUser.name,
        role: backendUser.role.toLowerCase() as User['role'],
        created_at: new Date().toISOString(),
      };
      setUser(mapped);
      localStorage.setItem('user', JSON.stringify(mapped));
      localStorage.setItem('token', data.token);
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