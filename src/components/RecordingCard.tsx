import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayIcon, StopCircleIcon, Trash2Icon } from 'lucide-react';
import { Recording } from '@/types/recording';
import { deleteRecording, supabase } from '@/utils/supabaseClient';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface RecordingCardProps {
  recording: Recording;
  onDelete?: (id: string) => void;
}

const RecordingCard = ({ recording, onDelete }: RecordingCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Cleanup audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayPause = async () => {
    try {
      if (isPlaying && audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
        return;
      }

      setIsLoading(true);

      // Extract the path from the file_url
      let path = recording.file_url;
      
      // If it's a full URL, extract just the path part
      if (path.startsWith('http')) {
        try {
          const url = new URL(path);
          // Extract everything after '/recordings/'
          const match = url.pathname.match(/\/recordings\/(.+)/);
          if (match) {
            path = match[1];
          }
        } catch (e) {
          console.error('Error parsing URL:', e);
          // If URL parsing fails, try using the path as is
        }
      }
      
      if (!path) {
        throw new Error('No valid file path available');
      }

      // Get a fresh signed URL
      const { data, error } = await supabase
        .storage
        .from('recordings')
        .createSignedUrl(path, 60); // 60 seconds expiry

      if (error || !data?.signedUrl) {
        throw error || new Error('Failed to get signed URL');
      }

      // Create or update audio element
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.onended = () => {
          setIsPlaying(false);
          setIsLoading(false);
        };
        audioRef.current.onerror = (e) => {
          console.error('Audio error:', e);
          toast.error('Error playing audio');
          setIsPlaying(false);
          setIsLoading(false);
        };
      }

      audioRef.current.src = data.signedUrl;
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error('Failed to play recording');
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRecording(recording.id);
      toast.success('Recording deleted successfully');
      onDelete?.(recording.id);
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast.error('Failed to delete recording');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {recording.title}
        </CardTitle>
        <Badge variant={recording.is_processed ? "default" : "secondary"}>
          {recording.category}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Duration: {recording.duration.toFixed(1)}s
            </p>
            <p className="text-xs text-muted-foreground">
              Recorded {formatDistanceToNow(new Date(recording.created_at))} ago
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePlayPause}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : isPlaying ? (
                <StopCircleIcon className="h-4 w-4" />
              ) : (
                <PlayIcon className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2Icon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecordingCard; 