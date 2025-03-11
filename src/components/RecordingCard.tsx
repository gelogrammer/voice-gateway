import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayIcon, StopCircleIcon, Trash2Icon } from 'lucide-react';
import { Recording } from '@/types/recording';
import { deleteRecording } from '@/utils/supabaseClient';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface RecordingCardProps {
  recording: Recording;
  onDelete?: () => void;
}

const RecordingCard = ({ recording, onDelete }: RecordingCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio] = useState(new Audio(recording.file_url));

  const handlePlayPause = () => {
    if (isPlaying) {
      audio.pause();
      audio.currentTime = 0;
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDelete = async () => {
    try {
      await deleteRecording(recording.id);
      toast.success('Recording deleted successfully');
      onDelete?.();
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast.error('Failed to delete recording');
    }
  };

  // Clean up audio on unmount
  audio.onended = () => setIsPlaying(false);

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
            >
              {isPlaying ? (
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