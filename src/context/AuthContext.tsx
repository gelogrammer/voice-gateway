import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, signIn, signUp, signOut, getCurrentUser } from '../lib/supabase';
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

  const checkUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user role:', error);
      return false;
    }

    return data?.role === 'admin';
  };

  useEffect(() => {
    // Check active sessions and sets the user
    getCurrentUser().then(async ({ user }) => {
      setUser(user);
      if (user) {
        const isUserAdmin = await checkUserRole(user.id);
        setIsAdmin(isUserAdmin);
        if (isUserAdmin) {
          navigate('/admin');
        }
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const isUserAdmin = await checkUserRole(currentUser.id);
        setIsAdmin(isUserAdmin);
        if (isUserAdmin) {
          navigate('/admin');
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const login = async (email: string, password: string) => {
    const { data, error } = await signIn(email, password);
    if (error) throw error;
    if (data.user) {
      const isUserAdmin = await checkUserRole(data.user.id);
      setIsAdmin(isUserAdmin);
      toast.success('Successfully logged in!');
      if (isUserAdmin) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    try {
      // Step 1: Sign up the user
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

      // Step 2: Create profile entry
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

      // Step 3: Set the user in context
      setUser(signUpData.user);
      setIsAdmin(false);
      
      // Step 4: Show success message and redirect
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
