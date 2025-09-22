import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Settings, Bell } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const { user, logout } = useAuth();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'faculty': return 'bg-blue-100 text-blue-800';
      case 'student': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">Smart Attendance Portal</h1>
              </div>
              {title && (
                <div className="ml-8">
                  <h2 className="text-lg font-medium text-gray-700">{title}</h2>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <Bell className="h-5 w-5 text-gray-600" />
              </button>
              
              <div className="flex items-center space-x-3">
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-900">{user?.name}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRoleColor(user?.role || '')}`}>
                    {user?.role?.toUpperCase()}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <Settings className="h-5 w-5 text-gray-600" />
                  </button>
                  <button
                    onClick={logout}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <LogOut className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};