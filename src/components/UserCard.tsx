
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DownloadIcon, TrashIcon, PlayIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from "sonner";
import { supabase } from '../utils/supabaseClient';

export type Recording = {
  id: string;
  title: string;
  description?: string;
  duration: number;
  file_url: string;
  created_at: string;
  user_id: string;
  user?: {
    full_name?: string;
    email: string;
  };
};

type UserCardProps = {
  recording: Recording;
  onDelete?: (id: string) => void;
  showUser?: boolean;
};

const UserCard: React.FC<UserCardProps> = ({ recording, onDelete, showUser = false }) => {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const handlePlay = async () => {
    try {
      // Get a temporary URL for the file
      const { data, error } = await supabase
        .storage
        .from('voice-recordings')
        .createSignedUrl(recording.file_url, 60); // 60 seconds expiry
        
      if (error) throw error;
      
      if (data?.signedUrl) {
        // Create an audio element and play
        const audio = new Audio(data.signedUrl);
        audio.play();
      }
    } catch (error) {
      console.error('Error playing recording:', error);
      toast.error('Failed to play recording');
    }
  };
  
  const handleDownload = async () => {
    try {
      // Get a temporary URL for the file
      const { data, error } = await supabase
        .storage
        .from('voice-recordings')
        .createSignedUrl(recording.file_url, 60); // 60 seconds expiry
        
      if (error) throw error;
      
      if (data?.signedUrl) {
        // Create a temporary link and trigger download
        const a = document.createElement('a');
        a.href = data.signedUrl;
        a.download = `${recording.title}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading recording:', error);
      toast.error('Failed to download recording');
    }
  };
  
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this recording?')) {
      onDelete && onDelete(recording.id);
    }
  };
  
  const createdAt = new Date(recording.created_at);
  
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{recording.title}</CardTitle>
            {showUser && recording.user && (
              <p className="text-sm text-muted-foreground mt-1">
                By: {recording.user.full_name || recording.user.email}
              </p>
            )}
          </div>
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handlePlay}
              className="h-8 w-8"
            >
              <PlayIcon size={16} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleDownload}
              className="h-8 w-8"
            >
              <DownloadIcon size={16} />
            </Button>
            {onDelete && (
              <Button 
                variant="ghost"

                size="icon" 
                onClick={handleDelete}
                className="h-8 w-8 text-destructive"
              >
                <TrashIcon size={16} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {recording.description && (
          <p className="text-sm text-muted-foreground mb-3">
            {recording.description}
          </p>
        )}
        
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>Duration: {formatDuration(recording.duration)}</span>
          <span>{formatDistanceToNow(createdAt, { addSuffix: true })}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserCard;
