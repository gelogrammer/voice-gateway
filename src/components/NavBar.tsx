import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { MicIcon } from 'lucide-react';

const NavBar = () => {
  const { user, isAdmin, logout } = useAuth();

  return (
    <nav className="bg-white border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <MicIcon className="h-8 w-8 text-voice-blue" />
            <span className="text-xl font-semibold">talk.twah</span>
          </Link>

          {/* Navigation Links */}
          {user && (
            <div className="flex items-center space-x-4">
              {/* Show different links based on user role */}
              {isAdmin ? (
                <>
                  <Link to="/admin" className="text-gray-600 hover:text-gray-900">
                    Admin Dashboard
                  </Link>
                  <Link to="/admin/users" className="text-gray-600 hover:text-gray-900">
                    Manage Users
                  </Link>
                  <Link to="/admin/recordings" className="text-gray-600 hover:text-gray-900">
                    All Recordings
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/dashboard" className="text-gray-600 hover:text-gray-900">
                    Dashboard
                  </Link>
                  <Link to="/dashboard/recordings" className="text-gray-600 hover:text-gray-900">
                    My Recordings
                  </Link>
                </>
              )}
            </div>
          )}

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-gray-600">{user.email}</span>
                <Button variant="outline" onClick={() => logout()}>
                  Logout
                </Button>
              </>
            ) : (
              <div className="space-x-2">
                <Link to="/login">
                  <Button variant="outline">Login</Button>
                </Link>
                <Link to="/register">
                  <Button>Register</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
