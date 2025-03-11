
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { MicIcon, LogOutIcon, UserIcon, UsersIcon, HomeIcon } from 'lucide-react';

const NavBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  return (
    <nav className="w-full py-4 bg-background glass-morphism border-b border-border">
      <div className="container-tight flex flex-wrap items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <div className="p-2 rounded-full bg-voice-blue text-white">
            <MicIcon size={20} />
          </div>
          <span className="text-xl font-medium">VoiceGateway</span>
        </Link>
        
        <div className="flex items-center space-x-4">
          {user ? (
            <>
              <div className="hidden md:flex items-center space-x-4">
                <Link 
                  to="/" 
                  className={`px-3 py-2 rounded-md transition-colors ${
                    location.pathname === '/' 
                      ? 'bg-primary/10 text-primary' 
                      : 'hover:bg-secondary'
                  }`}
                >
                  <HomeIcon size={16} className="inline-block mr-1" />
                  Home
                </Link>
                
                <Link 
                  to="/dashboard" 
                  className={`px-3 py-2 rounded-md transition-colors ${
                    location.pathname === '/dashboard' 
                      ? 'bg-primary/10 text-primary' 
                      : 'hover:bg-secondary'
                  }`}
                >
                  <UserIcon size={16} className="inline-block mr-1" />
                  Dashboard
                </Link>
                
                {user.role === 'admin' && (
                  <Link 
                    to="/admin" 
                    className={`px-3 py-2 rounded-md transition-colors ${
                      location.pathname === '/admin' 
                        ? 'bg-primary/10 text-primary' 
                        : 'hover:bg-secondary'
                    }`}
                  >
                    <UsersIcon size={16} className="inline-block mr-1" />
                    Admin
                  </Link>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="hidden md:inline-block text-sm text-muted-foreground">
                  {user.full_name || user.email}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                >
                  <LogOutIcon size={16} className="mr-1" />
                  <span className="hidden sm:inline-block">Logout</span>
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/login')}
                className={location.pathname === '/login' ? 'bg-primary/10 text-primary' : ''}
              >
                Login
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => navigate('/register')}
                className={location.pathname === '/register' ? 'bg-secondary text-secondary-foreground' : ''}
              >
                Register
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
