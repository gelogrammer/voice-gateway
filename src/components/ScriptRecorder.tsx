import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MicIcon, StopCircleIcon, Loader2Icon, PlayIcon, CheckCircleIcon, AlertCircleIcon, TimerIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadVoiceRecording, saveRecordingMetadata } from '../utils/supabaseClient';
import { scripts, Script } from '../data/recordingScripts';
import { cn } from '@/lib/utils';

const RECORDING_TIME_LIMIT = 7; // 7 seconds
const COUNTDOWN_TIME = 3; // 3 seconds countdown before recording

const ScriptRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentScript, setCurrentScript] = useState<Script | null>(null);
  const [completedScripts, setCompletedScripts] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentCategory, setCurrentCategory] = useState('HIGH_FLUENCY');
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  const { user } = useAuth();
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl;
    }
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Check for microphone permission on component mount
  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately after permission check
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
    } catch (error) {
      console.error('Microphone permission error:', error);
      setHasPermission(false);
      toast.error('Please allow microphone access to record audio');
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      return true;
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      toast.error('Failed to access microphone. Please check your browser settings.');
      setHasPermission(false);
      return false;
    }
  };

  const startCountdown = async (script: Script) => {
    // First ensure we have microphone permission
    if (!hasPermission) {
      const granted = await requestMicrophonePermission();
      if (!granted) return;
    }

    setCurrentScript(script);
    setCountdown(COUNTDOWN_TIME);
    
    countdownRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          startRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setDuration(elapsed);
      
      if (elapsed >= RECORDING_TIME_LIMIT) {
        stopRecording();
      }
    }, 100);
  };
  
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };
  
  const startRecording = async () => {
    try {
      audioChunks.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1
        } 
      });
      
      mediaRecorder.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000 // 128kbps for good quality
      });
      
      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };
      
      mediaRecorder.current.onstop = async () => {
        try {
          const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
          // Validate audio size and duration
          if (audioBlob.size < 1024) { // Less than 1KB
            throw new Error('Recording too short or empty');
          }
          setAudioBlob(audioBlob);
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);
        } catch (error) {
          console.error('Error processing recording:', error);
          toast.error('Failed to process recording. Please try again.');
          resetRecording();
        }
      };

      mediaRecorder.current.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        toast.error('Recording error occurred. Please try again.');
        stopRecording();
      };
      
      mediaRecorder.current.start(1000);
      setIsRecording(true);
      startTimer();
    } catch (error) {
      console.error('Error starting recording:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please check your browser settings.');
        setHasPermission(false);
      } else {
        toast.error('Failed to start recording. Please try again.');
      }
    }
  };
  
  const stopRecording = () => {
    try {
      if (mediaRecorder.current && isRecording) {
        mediaRecorder.current.stop();
        mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        stopTimer();
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast.error('Failed to stop recording');
    }
  };
  
  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setCurrentScript(null);
    setCountdown(0);
  };
  
  const handleSubmit = async () => {
    if (!user || !audioBlob || !currentScript) {
      toast.error('Missing required data for saving recording');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Show upload progress toast
      const uploadToast = toast.loading('Uploading recording...');
      
      // Convert webm to wav for better compatibility
      const wavBlob = await convertToWav(audioBlob);
      
      const file = new File([wavBlob], `${currentScript.id}_${Date.now()}.wav`, {
        type: 'audio/wav',
        lastModified: Date.now()
      });
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Recording file too large. Please try again.');
        return;
      }
      
      const data = await uploadVoiceRecording(file, user.id);
      
      if (!data) {
        throw new Error('Failed to upload recording');
      }
      
      const fileUrl = `${data.path}`;
      
      // Save metadata with more information
      await saveRecordingMetadata({
        user_id: user.id,
        file_url: fileUrl,
        duration,
        title: `${currentScript.category} - ${currentScript.title}`,
        script_text: currentScript.text,
        category: currentScript.category,
        file_size: file.size,
        mime_type: file.type
      });
      
      setCompletedScripts(prev => new Set([...prev, currentScript.id]));
      toast.success('Recording saved successfully!', {
        id: uploadToast
      });
      resetRecording();
    } catch (error) {
      console.error('Error saving recording:', error);
      toast.error(
        error instanceof Error 
          ? `Failed to save recording: ${error.message}`
          : 'Failed to save recording'
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Helper function to convert blob to wav format
  const convertToWav = async (blob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        // For now, return the original blob
        // In a production environment, you would want to implement
        // proper audio conversion using Web Audio API or a library
        resolve(blob);
      } catch (error) {
        reject(error);
      }
    });
  };
  
  const getCategoryScripts = (category: string) => {
    return scripts.filter(script => script.category === category);
  };
  
  const categories = [
    { id: 'HIGH_FLUENCY', label: 'High Fluency', icon: '🎯' },
    { id: 'MEDIUM_FLUENCY', label: 'Medium Fluency', icon: '📊' },
    { id: 'LOW_FLUENCY', label: 'Low Fluency', icon: '📝' },
    { id: 'CLEAR_PRONUNCIATION', label: 'Clear Pronunciation', icon: '🗣️' },
    { id: 'UNCLEAR_PRONUNCIATION', label: 'Unclear Pronunciation', icon: '🔄' },
    { id: 'FAST_TEMPO', label: 'Fast Tempo', icon: '⚡' },
    { id: 'MEDIUM_TEMPO', label: 'Medium Tempo', icon: '➡️' },
    { id: 'SLOW_TEMPO', label: 'Slow Tempo', icon: '🐢' }
  ];
  
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="mb-6 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="text-2xl">Script Recording Session</CardTitle>
          <CardDescription className="text-lg">
            Record yourself reading each script. You have 7 seconds for each recording.
            Complete all scripts in each category before moving to the next.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MicIcon className="h-5 w-5 text-primary" />
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs
              value={currentCategory}
              onValueChange={setCurrentCategory}
              orientation="vertical"
              className="w-full"
            >
              <TabsList className="flex flex-col h-auto space-y-2">
                {categories.map(category => {
                  const categoryScripts = getCategoryScripts(category.id);
                  const completedCount = categoryScripts.filter(s => completedScripts.has(s.id)).length;
                  const progress = (completedCount / categoryScripts.length) * 100;
                  
                  return (
                    <TabsTrigger
                      key={category.id}
                      value={category.id}
                      className={cn(
                        "justify-start transition-all",
                        progress === 100 && "bg-primary/10"
                      )}
                    >
                      <div className="w-full">
                        <div className="flex justify-between items-center mb-2">
                          <span className="flex items-center gap-2">
                            <span>{category.icon}</span>
                            <span>{category.label}</span>
                          </span>
                          <Badge variant={progress === 100 ? "default" : "outline"}>
                            {completedCount}/{categoryScripts.length}
                          </Badge>
                        </div>
                        <Progress 
                          value={progress} 
                          className={cn(
                            "h-1",
                            progress === 100 && "bg-primary"
                          )} 
                        />
                      </div>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <TimerIcon className="h-5 w-5 text-primary" />
                Recording Scripts
              </CardTitle>
              <div className="flex items-center gap-2">
                {hasPermission === false && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={requestMicrophonePermission}
                    className="text-destructive"
                  >
                    <AlertCircleIcon className="h-4 w-4 mr-2" />
                    Enable Microphone
                  </Button>
                )}
                <Badge variant="outline" className="text-sm">
                  {RECORDING_TIME_LIMIT}s per recording
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              {getCategoryScripts(currentCategory).map((script) => (
                <Card key={script.id} className={cn(
                  "mb-4 transition-all",
                  completedScripts.has(script.id) && "bg-primary/5 border-primary/20",
                  currentScript?.id === script.id && "ring-2 ring-primary ring-offset-2"
                )}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {script.title}
                        {completedScripts.has(script.id) && (
                          <CheckCircleIcon className="h-5 w-5 text-primary" />
                        )}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-4 leading-relaxed">{script.text}</p>
                    {currentScript?.id === script.id ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center">
                          {countdown > 0 ? (
                            <div className="text-4xl font-bold text-primary animate-bounce">
                              {countdown}
                            </div>
                          ) : isRecording ? (
                            <>
                              <div className="relative">
                                <Progress
                                  value={(duration / RECORDING_TIME_LIMIT) * 100}
                                  className="w-24 h-24 rounded-full"
                                />
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full animate-pulse"
                                  onClick={stopRecording}
                                >
                                  <StopCircleIcon size={32} />
                                </Button>
                              </div>
                              <div className="ml-4 text-center">
                                <p className="font-mono text-2xl text-primary">
                                  {(RECORDING_TIME_LIMIT - duration).toFixed(1)}s
                                </p>
                                <p className="text-sm text-muted-foreground">remaining</p>
                              </div>
                            </>
                          ) : (
                            <div className="space-y-4 w-full">
                              {audioUrl && (
                                <>
                                  <div className="bg-muted/50 rounded-lg p-4">
                                    <audio ref={audioRef} controls className="w-full" />
                                  </div>
                                  <div className="flex justify-center gap-2">
                                    <Button
                                      onClick={handleSubmit}
                                      disabled={isSubmitting}
                                      className="w-32"
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
                                    <Button
                                      variant="outline"
                                      onClick={resetRecording}
                                      disabled={isSubmitting}
                                      className="w-32"
                                    >
                                      Reset
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => startCountdown(script)}
                        disabled={isRecording || completedScripts.has(script.id)}
                        className={cn(
                          "w-full",
                          completedScripts.has(script.id) && "bg-primary/10 hover:bg-primary/20"
                        )}
                      >
                        {completedScripts.has(script.id) ? (
                          <>
                            <CheckCircleIcon className="mr-2 h-4 w-4" />
                            Completed
                          </>
                        ) : (
                          <>
                            <MicIcon className="mr-2 h-4 w-4" />
                            Start Recording
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScriptRecorder; 