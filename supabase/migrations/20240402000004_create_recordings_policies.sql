-- Enable Row Level Security
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can insert own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can update own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can delete own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Admins can view all recordings" ON public.recordings;
DROP POLICY IF EXISTS "Admins can delete any recording" ON public.recordings;

-- Create policies for regular users
CREATE POLICY "Users can view own recordings"
    ON public.recordings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recordings"
    ON public.recordings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recordings"
    ON public.recordings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recordings"
    ON public.recordings FOR DELETE
    USING (auth.uid() = user_id);

-- Create policies for admins
CREATE POLICY "Admins can view all recordings"
    ON public.recordings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.role = 'admin'
        )
    );

CREATE POLICY "Admins can delete any recording"
    ON public.recordings FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND auth.users.role = 'admin'
        )
    );

-- Grant permissions
GRANT ALL ON public.recordings TO authenticated; 