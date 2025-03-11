import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DownloadIcon, TrashIcon, PlayIcon, FileAudioIcon } from 'lucide-react';
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
  updated_at?: string;
  user_id: string;
  category?: string;
  file_size?: number;
  mime_type?: string;
  is_processed?: boolean;
  user?: {
    full_name?: string;
    email: string;
  };
};

type UserCardProps = {
  recording: Recording;
  onDelete?: (id: string) => void;
  showUser?: boolean;
  viewMode?: 'list' | 'grid';
};

const UserCard: React.FC<UserCardProps> = ({ recording, onDelete, showUser = false, viewMode = 'list' }) => {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return 'Unknown size';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getStorageFilePath = (fileUrl: string) => {
    // If it's a full URL, extract just the path part
    if (fileUrl.startsWith('http')) {
      try {
        const url = new URL(fileUrl);
        // Extract everything after '/recordings/'
        const match = url.pathname.match(/\/recordings\/(.+)/);
        if (match) {
          return match[1];
        }
      } catch (e) {
        console.error('Error parsing URL:', e);
      }
    }
    // If not a URL or parsing failed, use the path as is
    return fileUrl;
  };
  
  const handlePlay = async () => {
    try {
      // If we already have a signed URL, use it directly
      if (recording.file_url.includes('?token=')) {
        const audio = new Audio(recording.file_url);
        audio.play();
        return;
      }

      // Otherwise, get a new signed URL
      const { data, error } = await supabase
        .storage
        .from('recordings')
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
      // If we already have a signed URL, use it directly
      let downloadUrl = recording.file_url;
      
      if (!downloadUrl.includes('?token=')) {
        // Get a new signed URL
        const { data, error } = await supabase
          .storage
          .from('recordings')
          .createSignedUrl(recording.file_url, 60); // 60 seconds expiry
          
        if (error) throw error;
        
        if (data?.signedUrl) {
          downloadUrl = data.signedUrl;
        }
      }
      
      // Create a temporary link and trigger download
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = recording.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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
  
  if (viewMode === 'grid') {
    return (
      <Card className="overflow-hidden transition-all hover:shadow-md h-full flex flex-col">
        <CardHeader className="pb-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileAudioIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base font-medium line-clamp-1">{recording.title}</CardTitle>
                {showUser && recording.user && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    By: {recording.user.full_name || recording.user.email}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex flex-col flex-grow">
          {recording.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {recording.description}
            </p>
          )}
          
          <div className="mt-auto pt-4 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span>{formatDuration(recording.duration)}</span>
              <span>{formatFileSize(recording.file_size)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(createdAt, { addSuffix: true })}
              </span>
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
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileAudioIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{recording.title}</CardTitle>
              {showUser && recording.user && (
                <p className="text-sm text-muted-foreground mt-1">
                  By: {recording.user.full_name || recording.user.email}
                </p>
              )}
            </div>
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
          <div className="flex items-center space-x-3">
            <span>{formatDuration(recording.duration)}</span>
            <span>{formatFileSize(recording.file_size)}</span>
          </div>
          <span>{formatDistanceToNow(createdAt, { addSuffix: true })}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserCard;
