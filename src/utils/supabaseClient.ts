
import { createClient } from '@supabase/supabase-js';

// Check if we have the environment variables, use placeholders for development if not
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Make sure URL is valid before creating the client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions
export const uploadVoiceRecording = async (file: File, userId: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  const filePath = `recordings/${fileName}`;

  const { data, error } = await supabase.storage
    .from('voice_recordings')
    .upload(filePath, file);

  if (error) throw error;
  return filePath;
};

export const saveRecordingMetadata = async (userId: string, filePath: string, duration: number, emotion?: string) => {
  const { data, error } = await supabase
    .from('recordings')
    .insert([
      {
        user_id: userId,
        file_path: filePath,
        duration,
        emotion,
        created_at: new Date()
      }
    ]);

  if (error) throw error;
  return data;
};

export const getRecordings = async (userId: string) => {
  const { data, error } = await supabase
    .from('recordings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getAllRecordings = async () => {
  const { data, error } = await supabase
    .from('recordings')
    .select('*, users(full_name, email)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const deleteRecording = async (id: string) => {
  // First get the file path
  const { data: recording, error: fetchError } = await supabase
    .from('recordings')
    .select('file_path')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  // Delete from storage
  if (recording?.file_path) {
    const { error: storageError } = await supabase.storage
      .from('voice_recordings')
      .remove([recording.file_path]);

    if (storageError) throw storageError;
  }

  // Delete from database
  const { error: deleteError } = await supabase
    .from('recordings')
    .delete()
    .eq('id', id);

  if (deleteError) throw deleteError;
};
