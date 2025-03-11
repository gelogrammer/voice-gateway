-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop and recreate enum for recording categories
DROP TYPE IF EXISTS recording_category;
CREATE TYPE recording_category AS ENUM (
    'HIGH_FLUENCY',
    'MEDIUM_FLUENCY',
    'LOW_FLUENCY',
    'CLEAR_PRONUNCIATION',
    'UNCLEAR_PRONUNCIATION',
    'FAST_TEMPO',
    'MEDIUM_TEMPO',
    'SLOW_TEMPO'
);

-- Create profiles table first (if not exists)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create the user_recordings table with explicit foreign key to auth.users
CREATE TABLE IF NOT EXISTS public.user_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    file_url TEXT NOT NULL,
    duration DECIMAL(5,2) NOT NULL CHECK (duration > 0),
    title TEXT NOT NULL,
    script_text TEXT NOT NULL,
    category recording_category NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    mime_type VARCHAR(50) NOT NULL,
    is_processed BOOLEAN DEFAULT false,
    waveform_data JSONB,
    transcription TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Add constraints
    CONSTRAINT valid_mime_type CHECK (mime_type IN ('audio/wav', 'audio/webm', 'audio/mp3', 'audio/mpeg')),
    CONSTRAINT valid_file_size CHECK (file_size <= 10 * 1024 * 1024), -- 10MB max
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_recordings_user_id ON public.user_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recordings_category ON public.user_recordings(category);
CREATE INDEX IF NOT EXISTS idx_user_recordings_created_at ON public.user_recordings(created_at);

-- Drop all existing policies
DROP POLICY IF EXISTS "Public View Access" ON public.user_recordings;
DROP POLICY IF EXISTS "Authenticated Insert Access" ON public.user_recordings;
DROP POLICY IF EXISTS "Owner Update Access" ON public.user_recordings;
DROP POLICY IF EXISTS "Owner Delete Access" ON public.user_recordings;

-- Create simplified RLS policies for user_recordings
CREATE POLICY "View own recordings"
    ON public.user_recordings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Insert own recordings"
    ON public.user_recordings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own recordings"
    ON public.user_recordings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Delete own recordings"
    ON public.user_recordings FOR DELETE
    USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON public.user_recordings TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- Storage setup
INSERT INTO storage.buckets (id, name, public) 
VALUES ('recordings', 'recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Owner Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete Access" ON storage.objects;

-- Create storage policies
CREATE POLICY "Public read access"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'recordings');

CREATE POLICY "Authenticated upload access"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'recordings' AND auth.role() = 'authenticated');

CREATE POLICY "Owner delete access"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Grant storage permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_user_recordings_updated_at ON public.user_recordings;
CREATE TRIGGER update_user_recordings_updated_at
    BEFORE UPDATE ON public.user_recordings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Set up Row Level Security (RLS)
ALTER TABLE public.user_recordings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own recordings" ON public.user_recordings;
DROP POLICY IF EXISTS "Users can insert their own recordings" ON public.user_recordings;
DROP POLICY IF EXISTS "Users can update their own recordings" ON public.user_recordings;
DROP POLICY IF EXISTS "Users can delete their own recordings" ON public.user_recordings;
DROP POLICY IF EXISTS "Anyone can view recordings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own recordings" ON storage.objects;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create profile policies
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.users.id = auth.uid()
        AND auth.users.role = 'admin'
    ));

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Grant permissions on profiles
GRANT ALL ON public.profiles TO authenticated;

-- Update the user_recordings policies to be more permissive for testing
DROP POLICY IF EXISTS "Users can view their own recordings" ON public.user_recordings;
CREATE POLICY "Users can view their own recordings"
    ON public.user_recordings FOR SELECT
    USING (true);  -- Allow all authenticated users to view recordings

DROP POLICY IF EXISTS "Users can insert their own recordings" ON public.user_recordings;
CREATE POLICY "Users can insert their own recordings"
    ON public.user_recordings FOR INSERT
    WITH CHECK (true);  -- Allow all authenticated users to insert recordings

-- Update storage policies to be more permissive
DROP POLICY IF EXISTS "Anyone can view recordings" ON storage.objects;
CREATE POLICY "Anyone can view recordings"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'recordings');

DROP POLICY IF EXISTS "Authenticated users can upload recordings" ON storage.objects;
CREATE POLICY "Authenticated users can upload recordings"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'recordings');

-- Grant necessary permissions
GRANT ALL ON public.user_recordings TO authenticated;
GRANT ALL ON storage.objects TO authenticated;

-- Drop all existing storage policies first
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Owner Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete Access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view recordings" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own recordings" ON storage.objects;

-- Create unified storage policies
CREATE POLICY "Public Access"
    ON storage.objects FOR SELECT
    USING ( bucket_id = 'recordings' );

CREATE POLICY "Authenticated Upload Access"
    ON storage.objects FOR INSERT
    WITH CHECK ( 
        bucket_id = 'recordings' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Owner Update Access"
    ON storage.objects FOR UPDATE
    USING ( bucket_id = 'recordings' );

CREATE POLICY "Owner Delete Access"
    ON storage.objects FOR DELETE
    USING ( bucket_id = 'recordings' );

-- Grant full access to storage
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Add more permissive RLS policies for user_recordings
DROP POLICY IF EXISTS "Public View Access" ON public.user_recordings;
DROP POLICY IF EXISTS "Authenticated Insert Access" ON public.user_recordings;
DROP POLICY IF EXISTS "Owner Update Access" ON public.user_recordings;
DROP POLICY IF EXISTS "Owner Delete Access" ON public.user_recordings;
DROP POLICY IF EXISTS "Users can view their own recordings" ON public.user_recordings;
DROP POLICY IF EXISTS "Users can insert their own recordings" ON public.user_recordings;
DROP POLICY IF EXISTS "Users can update their own recordings" ON public.user_recordings;
DROP POLICY IF EXISTS "Users can delete their own recordings" ON public.user_recordings;

-- Create unified user_recordings policies
CREATE POLICY "Public View Access"
    ON public.user_recordings FOR SELECT
    USING (true);

CREATE POLICY "Authenticated Insert Access"
    ON public.user_recordings FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Owner Update Access"
    ON public.user_recordings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Owner Delete Access"
    ON public.user_recordings FOR DELETE
    USING (auth.uid() = user_id); 