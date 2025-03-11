import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { toast } from "sonner";

type User = {
  id: string;
  email: string;
  full_name?: string;
  role: 'user' | 'admin';
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (session?.user) {
          const { data, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
            
          if (profileError) throw profileError;
          
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name: data?.full_name,
            role: data?.role || 'user'
          });
          
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }
        
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          full_name: data?.full_name,
          role: data?.role || 'user'
        });
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        navigate('/login');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;
      
      toast.success("Welcome back!");
    } catch (error: any) {
      console.error('Error logging in:', error);
      toast.error(error.message || "Failed to log in");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({ email, password });
      
      if (error) throw error;
      
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              email,
              full_name: fullName,
              role: 'user',
              created_at: new Date()
            }
          ]);
          
        if (profileError) throw profileError;
        
        toast.success("Account created successfully!");
      }
    } catch (error: any) {
      console.error('Error registering:', error);
      toast.error(error.message || "Failed to register");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
      toast.success("You've been logged out");
    } catch (error: any) {
      console.error('Error logging out:', error);
      toast.error(error.message || "Failed to log out");
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);
        
      if (error) throw error;
      
      setUser({ ...user, ...updates });
      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || "Failed to update profile");
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
