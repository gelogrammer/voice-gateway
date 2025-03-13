import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zsbayvuplfmvqbolejfi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYmF5dnVwbGZtdnFib2xlamZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2NjA5MDAsImV4cCI6MjA1NzIzNjkwMH0.7Ng0RsEqzSwUrRQCwDY7cyXimxXQ6KnsyhIFrxN4vYA';

// Create a single instance of the Supabase client with minimal config
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: false,
    autoRefreshToken: true,
    storage: localStorage
  }
});

// Helper function to get user profile
export const getUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Profile fetch error:', error);
      throw error;
    }

    console.log('Profile data:', data); // Debug log
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { data: null, error };
  }
};

// Helper function to get recordings
export const getRecordings = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('recordings')
      .select(`
        *,
        profiles!recordings_user_id_fkey (
          full_name,
          email
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in getRecordings:', error);
    throw error;
  }
};

// Helper function to get all recordings (admin only)
export const getAllRecordings = async () => {
  try {
    const { data, error } = await supabase
      .from('recordings')
      .select(`
        *,
        profiles!recordings_user_id_fkey (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error in getAllRecordings:', error);
    throw error;
  }
};

// Helper function to get all users (admin only)
export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    throw error;
  }
};

// Auth helper functions
export const signUp = async (email: string, password: string, fullName?: string) => {
  try {
    console.log('Signing up with data:', { email, fullName }); // Debug log

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          full_name: fullName || ''
        }
      }
    });

    if (error) throw error;

    // If signup successful and we have user data, create/update profile
    if (data?.user) {
      // First check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (!existingProfile) {
        // Only create profile if it doesn't exist
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: email,
            full_name: fullName || '',
            role: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }
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

    if (error) {
      // Check if the error is due to email not being confirmed
      if (error.message === 'Email not confirmed') {
        return { data: null, error: { message: 'Email not confirmed' } };
      }
      throw error;
    }
    return { data, error: null };
  } catch (error: any) {
    console.error('Sign in error:', error);
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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

// Helper function to get user progress
export const getUserProgress = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Progress fetch error:', error);
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching user progress:', error);
    return { data: null, error };
  }
};

// Helper function to update user progress
export const updateUserProgress = async (userId: string, progress: {
  completed_scripts: string[];
  current_category: string;
}) => {
  try {
    const { error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        completed_scripts: progress.completed_scripts,
        current_category: progress.current_category,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error updating user progress:', error);
    return { error };
  }
}; 