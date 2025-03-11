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

  useEffect(() => {
    // Check active sessions and sets the user
    getCurrentUser().then(async ({ user }) => {
      if (user) {
        console.log('Current user ID:', user.id); // Debug log
        setUser(user);
        const { data: profile, error } = await getUserProfile(user.id);
        
        if (!error && profile) {
          console.log('Current user profile:', profile); // Debug log
          const isUserAdmin = profile.role === 'admin';
          console.log('Is current user admin?', isUserAdmin); // Debug log
          setIsAdmin(isUserAdmin);
          
          // Force navigation based on role
          if (isUserAdmin) {
            navigate('/admin', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      if (currentUser) {
        console.log('Auth state change - user ID:', currentUser.id); // Debug log
        setUser(currentUser);
        const { data: profile, error } = await getUserProfile(currentUser.id);
        
        if (!error && profile) {
          console.log('Auth state change - profile:', profile); // Debug log
          const isUserAdmin = profile.role === 'admin';
          console.log('Auth state change - is admin?', isUserAdmin); // Debug log
          setIsAdmin(isUserAdmin);
          
          // Force navigation based on role
          if (isUserAdmin) {
            navigate('/admin', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await signIn(email, password);
      if (error) throw error;
      
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
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Failed to login');
      throw error;
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    try {
      const { data: signUpData, error: signUpError } = await signUp(email, password);
      
      if (signUpError) {
        console.error('Signup error:', signUpError);
        toast.error(signUpError.message || 'Registration failed');
        return;
      }
      
      if (!signUpData?.user) {
        toast.error('Registration failed - no user data');
        return;
      }

      // Create profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: signUpData.user.id,
            full_name: fullName,
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);
      
      if (profileError) {
        console.error('Profile creation error:', profileError);
        toast.error('Failed to create user profile');
        return;
      }

      setUser(signUpData.user);
      setIsAdmin(false);
      
      toast.success('Registration successful! Welcome!');
      navigate('/dashboard');
      
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
