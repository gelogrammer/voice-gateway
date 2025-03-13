import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zsbayvuplfmvqbolejfi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzYmF5dnVwbGZtdnFib2xlamZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE2NjA5MDAsImV4cCI6MjA1NzIzNjkwMH0.7Ng0RsEqzSwUrRQCwDY7cyXimxXQ6KnsyhIFrxN4vYA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper functions for recordings
export const getRecordings = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('user_recordings')
      .select('*')
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

interface RecordingMetadata {
  user_id: string;
  file_url: string;
  duration: number;
  title: string;
  script_text: string;
  category: string;
  file_size: number;
  mime_type: string;
}

export const saveRecordingMetadata = async ({
  user_id,
  file_url,
  duration,
  title,
  script_text,
  category,
  file_size,
  mime_type
}: RecordingMetadata) => {
  try {
    // Validate input
    if (!user_id || !file_url || !duration || !title || !script_text || !category || !file_size || !mime_type) {
      throw new Error('Missing required fields for recording metadata');
    }

    // Insert the recording metadata
    const { data, error } = await supabase
      .from('user_recordings')
      .insert({
        user_id,
        file_url,
        duration,
        title,
        script_text,
        category,
        file_size,
        mime_type,
        is_processed: false
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error saving recording metadata:', error);
      throw new Error(`Failed to save recording metadata: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned after saving recording metadata');
    }

    return data;
  } catch (error) {
    console.error('Error in saveRecordingMetadata:', error);
    throw error instanceof Error ? error : new Error('Unknown error occurred while saving metadata');
  }
};

export const getAllRecordings = async () => {
  try {
    // First, list all files in the recordings bucket
    const { data: folders, error: foldersError } = await supabase
      .storage
      .from('recordings')
      .list('', {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (foldersError) {
      console.error('Error listing folders:', foldersError);
      throw foldersError;
    }

    if (!folders || folders.length === 0) {
      return [];
    }

    // Get files from each folder
    const allRecordings = [];
    for (const folder of folders) {
      if (folder.metadata?.isFolder || !folder.name.includes('.')) {
        // List files in the folder
        const { data: files, error: filesError } = await supabase
          .storage
          .from('recordings')
          .list(folder.name, {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' }
          });

        if (filesError) {
          console.error(`Error listing files in folder ${folder.name}:`, filesError);
          continue;
        }

        if (files && files.length > 0) {
          // Add folder files to recordings
          const folderRecordings = files.map(file => ({
            id: file.id || `${folder.name}/${file.name}`,
            title: file.name,
            description: `Recording from ${folder.name}`,
            duration: 0,
            file_url: `${folder.name}/${file.name}`,
            created_at: file.created_at || new Date().toISOString(),
            updated_at: file.updated_at || new Date().toISOString(),
            user_id: folder.name,
            file_size: file.metadata?.size || 0,
            mime_type: file.metadata?.mimetype || 'audio/wav',
            is_processed: true,
            category: folder.name
          }));
          allRecordings.push(...folderRecordings);
        }
      } else {
        // It's a file in the root directory
        allRecordings.push({
          id: folder.id || folder.name,
          title: folder.name,
          description: 'Root directory recording',
          duration: 0,
          file_url: folder.name,
          created_at: folder.created_at || new Date().toISOString(),
          updated_at: folder.updated_at || new Date().toISOString(),
          user_id: 'root',
          file_size: folder.metadata?.size || 0,
          mime_type: folder.metadata?.mimetype || 'audio/wav',
          is_processed: true,
          category: 'root'
        });
      }
    }

    // Try to get signed URLs for each recording
    const recordingsWithUrls = await Promise.all(
      allRecordings.map(async (recording) => {
        try {
          const { data: urlData } = await supabase
            .storage
            .from('recordings')
            .createSignedUrl(recording.file_url, 3600); // 1 hour expiry

          return {
            ...recording,
            file_url: urlData?.signedUrl || recording.file_url
          };
        } catch (error) {
          console.error('Error getting signed URL:', error);
          return recording;
        }
      })
    );

    return recordingsWithUrls;
  } catch (error) {
    console.error('Error in getAllRecordings:', error);
    throw error;
  }
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
    // First, get the recording to get the file path
    const { data: recording } = await supabase
      .from('user_recordings')
      .select('file_url')
      .eq('id', id)
      .single();

    if (recording) {
      // Delete the file from storage
      const filePath = recording.file_url.split('/').pop();
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('recordings')
          .remove([filePath]);

        if (storageError) {
          console.error('Error deleting file from storage:', storageError);
        }
      }
    }

    // Delete the database record
    const { error } = await supabase
      .from('user_recordings')
      .delete()
      .eq('id', id);

    if (error) {
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
export const uploadVoiceRecording = async (file: File, userId: string, userEmail: string) => {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('File size exceeds 10MB limit');
    }
    
    // Support more audio formats including iOS-specific ones
    const allowedTypes = [
      'audio/wav',
      'audio/webm',
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/x-m4a',
      'audio/aac'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Supported formats: WAV, WebM, MP3, MP4, M4A, AAC');
    }

    // Create folder name from email (remove special characters)
    const folderName = userEmail
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    // Ensure file extension matches the actual format
    let fileName = file.name;
    if (!fileName.includes('.')) {
      // Add appropriate extension based on mime type
      const ext = file.type.split('/')[1].replace('x-', '');
      fileName = `${fileName}.${ext}`;
    }

    const filePath = `${folderName}/${fileName}`;

    // Upload to storage with appropriate content type
    const { data, error: uploadError } = await supabase.storage
      .from('recordings')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (uploadError) {
      console.error('Error uploading recording:', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    if (!data) {
      throw new Error('Upload failed: No data returned');
    }

    return { 
      path: filePath,
      fileName: fileName,
      fileSize: file.size,
      mimeType: file.type,
      ...data 
    };
  } catch (error) {
    console.error('Error in uploadVoiceRecording:', error);
    throw error instanceof Error ? error : new Error('Unknown error occurred during upload');
  }
};
