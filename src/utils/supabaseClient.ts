
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';

// This is a public client that will be used for authentication
// and to access data that is publicly accessible
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const uploadVoiceRecording = async (file: File, userId: string) => {
  try {
    const fileName = `${userId}/${Date.now()}_${file.name}`;
    const { data, error } = await supabase.storage
      .from('voice-recordings')
      .upload(fileName, file);
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error uploading voice recording:', error);
    throw error;
  }
};

export const saveRecordingMetadata = async (
  userId: string, 
  fileUrl: string,
  duration: number,
  title: string,
  description?: string
) => {
  try {
    const { data, error } = await supabase
      .from('recordings')
      .insert([
        {
          user_id: userId,
          file_url: fileUrl,
          duration,
          title,
          description,
          created_at: new Date(),
        },
      ]);
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error saving recording metadata:', error);
    throw error;
  }
};

export const getRecordings = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching recordings:', error);
    throw error;
  }
};

export const getAllRecordings = async () => {
  try {
    const { data, error } = await supabase
      .from('recordings')
      .select(`
        *,
        users:user_id (
          id,
          email,
          full_name
        )
      `)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching all recordings:', error);
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const deleteRecording = async (recordingId: string) => {
  try {
    const { error } = await supabase
      .from('recordings')
      .delete()
      .eq('id', recordingId);
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error deleting recording:', error);
    throw error;
  }
};
