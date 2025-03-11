import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zsbayvuplfmvqbolejfi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYmF5dnVwbGZtdnFib2xlamZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2NjA5MDAsImV4cCI6MjA1NzIzNjkwMH0.7Ng0RsEqzSwUrRQCwDY7cyXimxXQ6KnsyhIFrxN4vYA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions for recordings
export const getRecordings = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('recordings')
      .select(`
        *,
        profiles:user_id (
          full_name,
          email
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recordings:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getRecordings:', error);
    throw error;
  }
};

export const saveRecordingMetadata = async (
  userId: string,
  filePath: string,
  duration: number,
  title: string,
  description?: string,
  emotion?: string
) => {
  try {
    const { data, error } = await supabase
      .from('recordings')
      .insert([
        {
          user_id: userId,
          file_url: filePath,
          title,
          description,
          duration,
          emotion,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Error saving recording metadata:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in saveRecordingMetadata:', error);
    throw error;
  }
};

export const getAllRecordings = async () => {
  const { data, error } = await supabase
    .from('recordings')
    .select(`
      *,
      profiles:user_id (
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching recordings:', error);
    throw error;
  }

  return data;
};

export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }

  return data;
};

export const deleteRecording = async (id: string) => {
  try {
    const { error } = await supabase
      .from('recordings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting recording:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteRecording:', error);
    throw error;
  }
};

export const uploadRecording = async (file: File, userId: string, title: string, description?: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  const filePath = `recordings/${fileName}`;

  // Upload file to storage
  const { error: uploadError } = await supabase.storage
    .from('recordings')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading file:', uploadError);
    throw uploadError;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('recordings')
    .getPublicUrl(filePath);

  // Create recording record
  const { error: dbError } = await supabase
    .from('recordings')
    .insert([
      {
        user_id: userId,
        title,
        description,
        file_url: publicUrl,
      }
    ]);

  if (dbError) {
    console.error('Error creating recording record:', dbError);
    throw dbError;
  }
};

// Voice recording upload helper
export const uploadVoiceRecording = async (file: File, userId: string) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    const filePath = `recordings/${fileName}`;

    const { data, error } = await supabase.storage
      .from('recordings')
      .upload(filePath, file);

    if (error) {
      console.error('Error uploading recording:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in uploadVoiceRecording:', error);
    throw error;
  }
};
