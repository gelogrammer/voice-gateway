import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zsbayvuplfmvqbolejfi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYmF5dnVwbGZtdnFib2xlamZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2NjA5MDAsImV4cCI6MjA1NzIzNjkwMH0.7Ng0RsEqzSwUrRQCwDY7cyXimxXQ6KnsyhIFrxN4vYA';

// Create a single instance of the Supabase client with minimal config
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: false,
    autoRefreshToken: true,
    storage: localStorage // Enable local storage for session persistence
  }
});

// Auth helper functions
export const signUp = async (email: string, password: string) => {
  try {
    // Create new user with auto-confirm
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}`,
        data: {
          email_confirmed_at: new Date().toISOString() // Only set email_confirmed_at
        }
      }
    });

    if (error) {
      // If user exists, try to sign in
      if (error.message?.includes('User already registered')) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (!signInError) {
          return { data: signInData, error: null };
        }
      }
      throw error;
    }

    if (data?.user) {
      // Update user metadata
      await supabase.auth.updateUser({
        data: {
          email_confirmed_at: new Date().toISOString()
        }
      });

      // Sign in the user immediately
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (!signInError) {
        return { data: signInData, error: null };
      }
    }

    return { data, error: null };
  } catch (error) {
    console.error('Signup error:', error);
    return { data: null, error };
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { data, error };
  } catch (error) {
    console.error('Sign in error:', error);
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    await supabase.auth.signOut();
    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  } catch (error) {
    console.error('Get user error:', error);
    return { user: null, error };
  }
};

export const onAuthStateChange = (callback: (event: any, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
}; 