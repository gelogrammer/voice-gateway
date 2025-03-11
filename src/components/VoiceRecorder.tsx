
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { toast } from "sonner";
import { MicIcon, StopCircleIcon, Loader2Icon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadVoiceRecording, saveRecordingMetadata } from '../utils/supabaseClient';

const VoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { user } = useAuth();
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl;
    }
    
    return () => {
      // Clean up blob URL when component unmounts
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);
  
  const startTimer = () => {
    startTimeRef.current = Date.now() - duration * 1000;
    timerRef.current = window.setInterval(() => {
      setDuration((Date.now() - startTimeRef.current) / 1000);
    }, 100);
  };
  
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };
  
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const startRecording = async () => {
    try {
      audioChunks.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      mediaRecorder.current = new MediaRecorder(stream);
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };
      
      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      };
      
      mediaRecorder.current.start();
      setIsRecording(true);
      startTimer();
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to access microphone. Please check your permissions.');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      
      // Stop all tracks on the stream
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      
      setIsRecording(false);
      stopTimer();
    }
  };
  
  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setTitle('');
    setDescription('');
  };
  
  const handleSubmit = async () => {
    if (!user || !audioBlob) return;
    
    if (!title.trim()) {
      toast.error('Please enter a title for your recording');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Create a File object from the Blob
      const file = new File([audioBlob], `recording_${Date.now()}.wav`, { 
        type: 'audio/wav',
        lastModified: Date.now()
      });
      
      // Upload to Supabase Storage
      const data = await uploadVoiceRecording(file, user.id);
      
      if (!data) {
        throw new Error('Failed to upload recording');
      }
      
      // Get the public URL
      const fileUrl = `${data.path}`;
      
      // Save metadata to the database
      await saveRecordingMetadata(
        user.id,
        fileUrl,
        duration,
        title,
        description
      );
      
      toast.success('Recording saved successfully!');
      resetRecording();
    } catch (error) {
      console.error('Error saving recording:', error);
      toast.error('Failed to save recording');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md mx-auto animate-fade-in">
      <CardHeader>
        <CardTitle>Record Voice Sample</CardTitle>
        <CardDescription>
          Speak clearly into your microphone. Your recording will be analyzed for speech rate and emotion.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center p-6">
          {isRecording ? (
            <div className="relative">
              <div className="absolute inset-0 bg-destructive/20 rounded-full animate-pulse-recording"></div>
              <Button
                variant="destructive"
                size="lg"
                className="h-24 w-24 rounded-full relative"
                onClick={stopRecording}
              >
                <StopCircleIcon size={40} />
              </Button>
            </div>
          ) : (
            <Button
              variant="default"
              size="lg"
              className="h-24 w-24 rounded-full bg-voice-blue hover:bg-voice-blue-dark"
              onClick={startRecording}
              disabled={!!audioBlob || isSubmitting}
            >
              <MicIcon size={40} />
            </Button>
          )}
        </div>
        
        <div className="text-center font-mono text-xl">
          {formatDuration(duration)}
        </div>
        
        {audioUrl && (
          <div className="mt-4">
            <audio ref={audioRef} controls className="w-full" />
          </div>
        )}
        
        {audioBlob && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Recording Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your recording"
                disabled={isSubmitting}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes or description"
                disabled={isSubmitting}
                rows={3}
              />
            </div>
          </div>
        )}
      </CardContent>
      
      {audioBlob && (
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={resetRecording}
            disabled={isSubmitting}
          >
            Reset
          </Button>
          
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Recording'
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default VoiceRecorder;
