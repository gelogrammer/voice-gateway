-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security on the bucket
CREATE POLICY "Users can upload their own recordings"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'recordings' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own recordings"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'recordings' AND
        (
            auth.uid()::text = (storage.foldername(name))[1] OR
            EXISTS (
                SELECT 1 FROM auth.users
                WHERE auth.users.id = auth.uid()
                AND auth.users.role = 'admin'
            )
        )
    );

CREATE POLICY "Users can update their own recordings"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'recordings' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own recordings"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'recordings' AND
        auth.uid()::text = (storage.foldername(name))[1]
    ); 