import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, signIn, signUp, signOut, getCurrentUser, getUserProfile } from '../lib/supabase';
import { toast } from "sonner";
import { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  const handleUserSession = async (user: User | null) => {
    if (user) {
      setUser(user);
      const { data: profile, error } = await getUserProfile(user.id);
      
      if (!error && profile) {
        const isUserAdmin = profile.role === 'admin';
        setIsAdmin(isUserAdmin);
        
        // Only navigate if we're not already on the correct page
        const currentPath = window.location.pathname;
        const targetPath = isUserAdmin ? '/admin' : '/dashboard';
        
        if (currentPath !== targetPath && currentPath !== '/') {
          navigate(targetPath, { replace: true });
        }
      }
    } else {
      setUser(null);
      setIsAdmin(false);
      // Only navigate to login if we're not already there
      if (window.location.pathname !== '/login') {
        navigate('/login', { replace: true });
      }
    }
  };

  useEffect(() => {
    // Check active sessions and sets the user
    getCurrentUser().then(({ user }) => {
      handleUserSession(user);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      handleUserSession(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await signIn(email, password);
      
      if (error) {
        // Handle email not confirmed error specifically
        if (error.message === 'Email not confirmed') {
          toast.error('Please check your email and confirm your account before logging in.');
          return;
        }
        throw error;
      }
      
      if (!data?.user) {
        throw new Error('No user data returned');
      }

      console.log('User ID:', data.user.id); // Debug log

      const { data: profile, error: profileError } = await getUserProfile(data.user.id);

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        throw profileError;
      }

      if (!profile) {
        throw new Error('No profile data found');
      }

      console.log('Full profile data:', profile); // Debug log
      console.log('User role:', profile.role); // Debug log

      // Set user and role
      setUser(data.user);
      const isUserAdmin = profile.role === 'admin';
      console.log('Is admin?', isUserAdmin); // Debug log
      setIsAdmin(isUserAdmin);
      
      // Show success message
      toast.success('Successfully logged in!');

      // Force navigation based on role
      if (isUserAdmin) {
        console.log('Should navigate to admin...'); // Debug log
        setIsAdmin(true); // Force set admin status
        setTimeout(() => {
          navigate('/admin', { replace: true });
        }, 100);
      } else {
        console.log('Should navigate to dashboard...'); // Debug log
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      // Handle specific error messages
      if (error.message === 'Email not confirmed') {
        toast.error('Please check your email and confirm your account before logging in.');
      } else {
        toast.error(error.message || 'Failed to login');
      }
      throw error;
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    try {
      // First, sign up the user with Supabase auth
      const { data: signUpData, error: signUpError } = await signUp(email, password, fullName);
      
      if (signUpError) {
        console.error('Signup error:', signUpError);
        toast.error(signUpError.message || 'Registration failed');
        return;
      }
      
      if (!signUpData?.user) {
        toast.error('Registration failed - no user data');
        return;
      }

      // Add debug logging
      console.log('Registration successful with data:', {
        user: signUpData.user,
        profile: {
          id: signUpData.user.id,
          email,
          fullName
        }
      });

      toast.success('Registration successful! Please check your email to confirm your account.');
      
      // Navigate to login page with success state
      navigate('/login', { 
        state: { registrationSuccess: true },
        replace: true  // Use replace to prevent going back to register page
      });
      
    } catch (error: any) {
      console.error('Registration process error:', error);
      toast.error(error.message || 'Registration failed');
    }
  };

  const logout = async () => {
    const { error } = await signOut();
    if (error) throw error;
    setUser(null);
    setIsAdmin(false);
    navigate('/login');
    toast.success('Successfully logged out!');
  };

  const value = {
    user,
    loading,
    isAdmin,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
