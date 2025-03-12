import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MicIcon, StopCircleIcon, Loader2Icon, PlayIcon, CheckCircleIcon, AlertCircleIcon, TimerIcon, InfoIcon, HelpCircle, BarChart2Icon, RefreshCw, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { uploadVoiceRecording, saveRecordingMetadata } from '../utils/supabaseClient';
import { getUserProgress, updateUserProgress, supabase } from '../lib/supabase';
import { scripts, Script } from '../data/recordingScripts';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const RECORDING_TIME_LIMIT = 7; // 7 seconds
const COUNTDOWN_TIME = 3; // 3 seconds countdown before recording

interface UserProgress {
  completedScripts: string[];
  currentCategory: string;
  lastUpdated: string;
}

const getCategoryDescription = (categoryId: string): string => {
  switch (categoryId) {
    case 'HIGH_FLUENCY':
      return 'Scripts designed for high fluency practice with complex topics and natural flow.';
    case 'MEDIUM_FLUENCY':
      return 'Moderate complexity scripts for practicing everyday conversations and descriptions.';
    case 'LOW_FLUENCY':
      return 'Technical and complex scripts that challenge pronunciation and understanding.';
    case 'CLEAR_PRONUNCIATION':
      return 'Scripts focusing on clear articulation and precise pronunciation of words.';
    case 'UNCLEAR_PRONUNCIATION':
      return 'Challenging tongue twisters and difficult word combinations for practice.';
    case 'FAST_TEMPO':
      return 'Quick-paced scripts simulating news reports and fast speech scenarios.';
    case 'MEDIUM_TEMPO':
      return 'Natural pace scripts for practicing regular conversational speed.';
    case 'SLOW_TEMPO':
      return 'Deliberately slow scripts for meditation and careful instruction delivery.';
    default:
      return 'Practice scripts for voice recording.';
  }
};

const ScriptRecorder = () => {
  const { user } = useAuth();
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Add refs for Supabase subscriptions
  const progressSubscription = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const recordingsSubscription = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

  // Handle category change
  const handleCategoryChange = (newCategory: string) => {
    setCurrentCategory(newCategory);
    // Reset current script when changing categories
    if (currentScript) {
      resetRecording();
    }
  };

  // Load progress from localStorage on mount
  useEffect(() => {
    if (user) {
      const savedProgress = localStorage.getItem(`userProgress_${user.id}`);
      if (savedProgress) {
        try {
          const { completedScripts: saved, currentCategory: savedCategory } = JSON.parse(savedProgress);
          setCompletedScripts(new Set(saved));
          setCurrentCategory(savedCategory);
        } catch (error) {
          console.error('Error parsing saved progress:', error);
          // If there's an error, use defaults
          setCompletedScripts(new Set());
          setCurrentCategory('HIGH_FLUENCY');
        }
      }
      syncWithSupabase();
    }
  }, [user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to user_progress changes
    progressSubscription.current = supabase.channel('user_progress_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_progress',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE') {
            const { completed_scripts, current_category } = payload.new;
            setCompletedScripts(new Set(completed_scripts));
            setCurrentCategory(current_category);
            
            // Update localStorage
            const progress = {
              completedScripts: completed_scripts,
              currentCategory: current_category,
              lastUpdated: new Date().toISOString()
            };
            localStorage.setItem(`userProgress_${user.id}`, JSON.stringify(progress));
          }
        }
      )
      .subscribe();

    // Subscribe to user_recordings changes
    recordingsSubscription.current = supabase.channel('user_recordings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_recordings',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          // Handle recording changes if needed
          if (payload.eventType === 'DELETE') {
            // You might want to update UI or state here
            toast.success('Recording deleted successfully');
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      if (progressSubscription.current) {
        supabase.removeChannel(progressSubscription.current);
      }
      if (recordingsSubscription.current) {
        supabase.removeChannel(recordingsSubscription.current);
      }
    };
  }, [user]);

  // Update syncWithSupabase to handle real-time updates
  const syncWithSupabase = async () => {
    if (!user) return;

    try {
      setIsSyncing(true);
      const { data, error } = await getUserProgress(user.id);

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        // Compare timestamps before updating
        const localProgress = localStorage.getItem(`userProgress_${user.id}`);
        const localData = localProgress ? JSON.parse(localProgress) : null;
        
        if (!localData || new Date(data.last_updated) > new Date(localData.lastUpdated)) {
          setCompletedScripts(new Set(data.completed_scripts));
          setCurrentCategory(data.current_category);
          
          // Update localStorage
          const progress = {
            completedScripts: data.completed_scripts,
            currentCategory: data.current_category,
            lastUpdated: data.last_updated
          };
          localStorage.setItem(`userProgress_${user.id}`, JSON.stringify(progress));
        }
      }
    } catch (error) {
      console.error('Error syncing with Supabase:', error);
    } finally {
      setIsSyncing(false);
    }
  };

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

      // Get user's email
      const userEmail = user.email;
      if (!userEmail) {
        throw new Error('User email not found');
      }

      // Format the username from email (remove @domain.com and special characters)
      const userName = userEmail
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      
      const wavBlob = await convertToWav(audioBlob);
      
      // Create filename with userName_CATEGORY_scriptId_timestamp format for uniqueness
      const fileName = `${userName}_${currentScript.category}_${currentScript.id}_${Date.now()}.wav`;
      
      const file = new File([wavBlob], fileName, {
        type: 'audio/wav',
        lastModified: Date.now()
      });
      
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Recording file too large. Please try again.');
        return;
      }
      
      const data = await uploadVoiceRecording(file, user.id, userEmail);
      
      if (!data) {
        throw new Error('Failed to upload recording');
      }
      
      const fileUrl = `${data.path}`;
      
      try {
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
      } catch (metadataError) {
        console.error('Error saving recording metadata:', metadataError);
        // Try to delete the uploaded file if metadata save fails
        try {
          await supabase.storage.from('recordings').remove([data.path]);
        } catch (deleteError) {
          console.error('Error cleaning up file after metadata save failure:', deleteError);
        }
        throw new Error(`Failed to save recording metadata: ${metadataError instanceof Error ? metadataError.message : 'Unknown error'}`);
      }
      
      // Update completed scripts
      const newCompletedScripts = new Set(completedScripts);
      newCompletedScripts.add(currentScript.id);
      setCompletedScripts(newCompletedScripts);
      
      // Sync progress with Supabase
      await updateUserProgress(user.id, {
        completed_scripts: Array.from(newCompletedScripts),
        current_category: currentCategory
      });
      
      // Update localStorage
      const progress = {
        completedScripts: Array.from(newCompletedScripts),
        currentCategory: currentCategory,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(`userProgress_${user.id}`, JSON.stringify(progress));
      
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
    { id: 'HIGH_FLUENCY', label: 'High Fluency', icon: '🎯', color: 'from-green-500/20 to-green-500/10' },
    { id: 'MEDIUM_FLUENCY', label: 'Medium Fluency', icon: '📊', color: 'from-blue-500/20 to-blue-500/10' },
    { id: 'LOW_FLUENCY', label: 'Low Fluency', icon: '📝', color: 'from-yellow-500/20 to-yellow-500/10' },
    { id: 'CLEAR_PRONUNCIATION', label: 'Clear Pronunciation', icon: '🗣️', color: 'from-purple-500/20 to-purple-500/10' },
    { id: 'UNCLEAR_PRONUNCIATION', label: 'Unclear Pronunciation', icon: '🔄', color: 'from-orange-500/20 to-orange-500/10' },
    { id: 'FAST_TEMPO', label: 'Fast Tempo', icon: '⚡', color: 'from-red-500/20 to-red-500/10' },
    { id: 'MEDIUM_TEMPO', label: 'Medium Tempo', icon: '➡️', color: 'from-indigo-500/20 to-indigo-500/10' },
    { id: 'SLOW_TEMPO', label: 'Slow Tempo', icon: '🐢', color: 'from-teal-500/20 to-teal-500/10' }
  ];
  
  // Update resetAllProgress to handle real-time updates
  const resetAllProgress = async () => {
    if (!user || !window.confirm('Are you sure you want to reset all progress? This action cannot be undone.')) return;
    
    try {
      setIsResetting(true);
      
      // Reset progress in Supabase first
      const { error } = await updateUserProgress(user.id, {
        completed_scripts: [],
        current_category: 'HIGH_FLUENCY'
      });
      
      if (error) throw error;
      
      // Clear local state
      setCompletedScripts(new Set());
      setCurrentCategory('HIGH_FLUENCY');
      
      // Clear localStorage
      localStorage.removeItem(`userProgress_${user.id}`);
      
      toast.success('Progress reset successfully');
    } catch (error) {
      console.error('Error resetting progress:', error);
      toast.error('Failed to reset progress');
    } finally {
      setIsResetting(false);
    }
  };

  // Update deleteAllRecordings to handle real-time updates
  const deleteAllRecordings = async () => {
    if (!user || !window.confirm('Are you sure you want to delete all recordings? This action cannot be undone.')) return;
    
    try {
      setIsResetting(true);
      
      // Get all recordings for the user
      const { data: recordings, error: fetchError } = await supabase
        .from('user_recordings')
        .select('id, file_url')
        .eq('user_id', user.id);
      
      if (fetchError) throw fetchError;
      
      if (recordings && recordings.length > 0) {
        // Delete files from storage first
        const filePaths = recordings.map(rec => {
          // Get the full path including the folder name
          const parts = rec.file_url.split('/');
          return parts[parts.length - 2] + '/' + parts[parts.length - 1];
        }).filter(Boolean);

        if (filePaths.length > 0) {
          console.log('Deleting files:', filePaths); // Debug log
          const { error: storageError } = await supabase.storage
            .from('recordings')
            .remove(filePaths);
          
          if (storageError) {
            console.error('Error deleting files from storage:', storageError);
          }
        }
        
        // Then delete records from the database
        const { error: deleteError } = await supabase
          .from('user_recordings')
          .delete()
          .eq('user_id', user.id);
        
        if (deleteError) throw deleteError;
        
        toast.success('All recordings deleted successfully');
      } else {
        toast.info('No recordings to delete');
      }
    } catch (error) {
      console.error('Error deleting recordings:', error);
      toast.error('Failed to delete recordings');
    } finally {
      setIsResetting(false);
    }
  };

  // Add new function to reset category progress
  const resetCategoryProgress = async (categoryId: string) => {
    if (!user || !window.confirm(`Are you sure you want to reset progress for ${categoryId}? This action cannot be undone.`)) return;
    
    try {
      setIsResetting(true);
      
      // Get current completed scripts
      const currentCompleted = Array.from(completedScripts);
      
      // Filter out scripts from this category
      const filteredScripts = currentCompleted.filter(scriptId => {
        const script = scripts.find(s => s.id === scriptId);
        return script?.category !== categoryId;
      });
      
      // Update progress in Supabase
      const { error } = await updateUserProgress(user.id, {
        completed_scripts: filteredScripts,
        current_category: currentCategory
      });
      
      if (error) throw error;
      
      // Update local state
      setCompletedScripts(new Set(filteredScripts));
      
      // Update localStorage
      const progress = {
        completedScripts: filteredScripts,
        currentCategory: currentCategory,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(`userProgress_${user.id}`, JSON.stringify(progress));
      
      toast.success(`Progress reset for ${categoryId}`);
    } catch (error) {
      console.error('Error resetting category progress:', error);
      toast.error('Failed to reset category progress');
    } finally {
      setIsResetting(false);
    }
  };

  // Add new function to delete category recordings
  const deleteCategoryRecordings = async (categoryId: string) => {
    if (!user || !window.confirm(`Are you sure you want to delete all recordings for ${categoryId}? This action cannot be undone.`)) return;
    
    try {
      setIsResetting(true);
      
      // Get all recordings for the user in this category
      const { data: recordings, error: fetchError } = await supabase
        .from('user_recordings')
        .select('id, file_url')
        .eq('user_id', user.id)
        .eq('category', categoryId);
      
      if (fetchError) throw fetchError;
      
      if (recordings && recordings.length > 0) {
        // Delete files from storage first
        const filePaths = recordings.map(rec => {
          // Get the full path including the folder name
          const parts = rec.file_url.split('/');
          return parts[parts.length - 2] + '/' + parts[parts.length - 1];
        }).filter(Boolean);

        if (filePaths.length > 0) {
          console.log('Deleting files:', filePaths); // Debug log
          const { error: storageError } = await supabase.storage
            .from('recordings')
            .remove(filePaths);
          
          if (storageError) {
            console.error('Error deleting files from storage:', storageError);
          }
        }
        
        // Then delete records from the database
        const { error: deleteError } = await supabase
          .from('user_recordings')
          .delete()
          .eq('user_id', user.id)
          .eq('category', categoryId);
        
        if (deleteError) throw deleteError;
        
        toast.success(`Recordings deleted for ${categoryId}`);
      } else {
        toast.info(`No recordings to delete for ${categoryId}`);
      }
    } catch (error) {
      console.error('Error deleting category recordings:', error);
      toast.error('Failed to delete category recordings');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="container mx-auto p-2 sm:p-4 max-w-5xl">
      <Card className="mb-4 sm:mb-6 bg-gradient-to-br from-primary/5 via-primary/10 to-background border-2 border-primary/20">
        <CardHeader className="p-3">
          {/* Mobile Header - Collapsible */}
          <div className="block lg:hidden">
            <div 
              className="flex items-start gap-3 cursor-pointer"
              onClick={() => setIsInstructionsOpen(!isInstructionsOpen)}
            >
              {/* Left side with icon and title */}
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MicIcon className="h-6 w-6 text-primary" />
                </div>
              </div>

              {/* Middle content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-lg font-semibold text-foreground leading-none">
                    Voice Recording Session
                  </CardTitle>
                  <Button variant="ghost" size="icon" className="h-9 w-9 ml-2">
                    <ChevronDown className={cn("h-5 w-5 transition-transform", isInstructionsOpen ? "transform rotate-180" : "")} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="bg-primary/5 text-primary text-sm px-2.5 py-1">Research Lab</Badge>
                  <Badge variant="outline" className="bg-primary/5 text-primary text-sm px-2.5 py-1">Voice Analysis</Badge>
                </div>
              </div>
            </div>

            {/* Mobile Collapsible Content */}
            <div className={cn("mt-4 space-y-3", !isInstructionsOpen && "hidden")}>
              {/* Session Info */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-primary/5 rounded-lg p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TimerIcon className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium">Session: {RECORDING_TIME_LIMIT}s</span>
                  </div>
                </div>
                <div className="bg-primary/5 rounded-lg p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart2Icon className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium">Categories: {categories.length}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <CardDescription className="text-xs leading-relaxed text-foreground/90">
                Contribute to our research on Real-Time Speech Rate and Emotion Analysis. Your recordings help train our deep learning models.
              </CardDescription>

              {/* Features */}
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BarChart2Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-xs block">Real-time Analysis</span>
                    <span className="text-xs text-muted-foreground block">Instant processing</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <TimerIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-xs block">Instant Feedback</span>
                    <span className="text-xs text-muted-foreground block">Quick results</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MicIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-xs block">Speech Recognition</span>
                    <span className="text-xs text-muted-foreground block">Advanced detection</span>
                  </div>
                </div>
              </div>

              {/* Help Button */}
              <div className="pt-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-2">
                        <InfoIcon className="h-4 w-4" />
                        View Recording Instructions
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[250px]">
                      <p className="text-xs">Complete all scripts in each category before moving to the next. Each recording has a {RECORDING_TIME_LIMIT}-second time limit.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>

          {/* Desktop Header - Always visible */}
          <div className="hidden lg:block">
            <div className="flex flex-col gap-6">
              {/* Title and Session Info */}
              <div className="flex items-start lg:items-center justify-between gap-4 flex-wrap">
                <div className="space-y-2 min-w-0">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">
                      Research Lab
                    </Badge>
                    <Badge variant="outline" className="bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">
                      Voice Analysis
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl xl:text-3xl font-bold text-foreground">
                    Voice Recording Session
                  </CardTitle>
                </div>
                
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="bg-primary/5 rounded-lg p-3 space-y-1.5">
                    <p className="font-medium flex items-center gap-2 text-sm whitespace-nowrap">
                      <TimerIcon className="h-4 w-4 text-primary flex-shrink-0" />
                      Session Time: {RECORDING_TIME_LIMIT}s
                    </p>
                    <p className="font-medium flex items-center gap-2 text-sm whitespace-nowrap">
                      <BarChart2Icon className="h-4 w-4 text-primary flex-shrink-0" />
                      Categories: {categories.length}
                    </p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="rounded-full w-10 h-10 border-2 flex-shrink-0">
                          <InfoIcon className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-sm">
                        <p className="text-sm">Complete all scripts in each category before moving to the next. Each recording has a {RECORDING_TIME_LIMIT}-second time limit.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {/* Description and Features */}
              <div className="space-y-6">
                <CardDescription className="text-base xl:text-lg leading-relaxed text-foreground/90 max-w-3xl">
                  Contribute to our research on Real-Time Speech Rate and Emotion Analysis. Your recordings help train our deep learning models to provide instant feedback on speech patterns and emotional expression.
                </CardDescription>
                
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/10">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <BarChart2Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">Real-time Analysis</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        Instant processing of speech patterns and metrics
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/10">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <TimerIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">Instant Feedback</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        Real-time evaluation and performance metrics
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/10">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MicIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm truncate">Speech Recognition</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        Advanced pattern detection and analysis
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Instructions Card - Collapsible on mobile */}
      <Card className="mb-4 sm:mb-6 bg-gradient-to-br from-primary/5 via-primary/10 to-background border-2 border-primary/20">
        <CardHeader className="cursor-pointer" onClick={() => setIsInstructionsOpen(!isInstructionsOpen)}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <HelpCircle className="h-6 w-6 text-primary" />
              How to Use talk.twah
            </CardTitle>
            <Button variant="ghost" size="icon" className="sm:hidden">
              <ChevronDown className={cn("h-4 w-4 transition-transform", isInstructionsOpen ? "transform rotate-180" : "")} />
            </Button>
          </div>
          <CardDescription className="text-muted-foreground">
            Follow these steps to get started with voice recording
          </CardDescription>
        </CardHeader>
        <CardContent className={cn("sm:block", !isInstructionsOpen && "hidden")}>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="recording" className="border-none">
              <AccordionTrigger className="hover:no-underline py-4 px-4 rounded-lg hover:bg-primary/5 data-[state=open]:bg-primary/5 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MicIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-base">Recording Instructions</div>
                    <div className="text-sm text-muted-foreground">Learn how to record your voice samples</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 mt-2">
                  <div className="grid gap-3">
                    {[
                      { step: 1, text: "Select a category from the list on the left", icon: "📂" },
                      { step: 2, text: "Choose a script you'd like to record", icon: "📝" },
                      { step: 3, text: "Ensure you're in a quiet environment", icon: "🔇" },
                      { step: 4, text: "Click 'Start Recording' and wait for countdown", icon: "⏱️" },
                      { step: 5, text: "Read the script clearly at the indicated tempo", icon: "🗣️" },
                      { step: 6, text: "Recording stops automatically after time limit", icon: "⏹️" },
                      { step: 7, text: "Review and save your recording", icon: "✅" }
                    ].map(({ step, text, icon }) => (
                      <div key={step} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-lg">{icon}</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">Step {step}</div>
                          <div className="text-sm text-muted-foreground">{text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tips" className="border-none">
              <AccordionTrigger className="hover:no-underline py-4 px-4 rounded-lg hover:bg-primary/5 data-[state=open]:bg-primary/5 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <InfoIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-base">Recording Tips</div>
                    <div className="text-sm text-muted-foreground">Best practices for quality recordings</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid gap-3 mt-2">
                  <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <TimerIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Time Limit</div>
                      <div className="text-sm text-muted-foreground">Each recording has a {RECORDING_TIME_LIMIT}-second time limit</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <MicIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Equipment</div>
                      <div className="text-sm text-muted-foreground">Use a good quality microphone if available</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <AlertCircleIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Positioning</div>
                      <div className="text-sm text-muted-foreground">Maintain consistent distance from microphone</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <PlayIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Quality Check</div>
                      <div className="text-sm text-muted-foreground">Review recordings to ensure quality before saving</div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="progress" className="border-none">
              <AccordionTrigger className="hover:no-underline py-4 px-4 rounded-lg hover:bg-primary/5 data-[state=open]:bg-primary/5 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <BarChart2Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-base">Progress Tracking</div>
                    <div className="text-sm text-muted-foreground">Monitor your recording progress</div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid gap-3 mt-2">
                  <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircleIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Completion Status</div>
                      <div className="text-sm text-muted-foreground">Track completed scripts with checkmarks</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <BarChart2Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Category Progress</div>
                      <div className="text-sm text-muted-foreground">View progress bars for each category</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <RefreshCw className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Auto-Save</div>
                      <div className="text-sm text-muted-foreground">Progress is automatically saved as you record</div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Mobile Category Selector */}
      <div className="block md:hidden mb-4">
        <select
          value={currentCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="w-full p-2 rounded-lg border border-border/50 bg-background"
        >
          {categories.map(category => {
            const categoryScripts = getCategoryScripts(category.id);
            const completedCount = categoryScripts.filter(s => completedScripts.has(s.id)).length;
            return (
              <option key={category.id} value={category.id}>
                {category.icon} {category.label} ({completedCount}/{categoryScripts.length})
              </option>
            );
          })}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Categories Panel - Hidden on mobile */}
        <Card className="hidden md:block md:col-span-1 border border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MicIcon className="h-5 w-5 text-primary" />
              Categories
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Select a category to start recording
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {categories.map(category => {
                const categoryScripts = getCategoryScripts(category.id);
                const completedCount = categoryScripts.filter(s => completedScripts.has(s.id)).length;
                const progress = (completedCount / categoryScripts.length) * 100;
                
                return (
                  <HoverCard key={category.id}>
                    <HoverCardTrigger asChild>
                      <div className="space-y-4">
                        <button
                          onClick={() => handleCategoryChange(category.id)}
                          className={cn(
                            "w-full p-4 rounded-lg transition-all hover:shadow-md border space-y-2",
                            currentCategory === category.id && "ring-2 ring-primary ring-offset-2",
                            progress === 100 
                              ? "bg-green-50/80 border-green-200 hover:bg-green-100" 
                              : cn("border-border/50", category.color)
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm",
                                progress === 100 
                                  ? "text-green-600"
                                  : `text-${category.color.split('-')[0]}-600`
                              )}>
                                <span className="text-xl">{category.icon}</span>
                              </div>
                              <div className="flex flex-col items-start">
                                <span className={cn(
                                  "font-medium text-sm",
                                  progress === 100 ? "text-green-700" : "text-gray-900"
                                )}>
                                  {category.label}
                                </span>
                                <span className={cn(
                                  "text-sm",
                                  progress === 100 ? "text-green-600" : "text-muted-foreground"
                                )}>
                                  {completedCount}/{categoryScripts.length}
                                </span>
                              </div>
                            </div>
                            {progress === 100 && (
                              <div className="w-6 h-6 rounded-full flex items-center justify-center bg-white shadow-sm text-green-600">
                                <CheckCircleIcon className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <Progress 
                            value={progress} 
                            className={cn(
                              "h-1.5 rounded-full",
                              progress === 100
                                ? "bg-green-100 [&>div]:bg-green-500"
                                : `bg-${category.color.split('-')[0]}-200 [&>div]:bg-${category.color.split('-')[0]}-600`
                            )} 
                          />
                        </button>

                        {/* Category management buttons */}
                        <div className="grid grid-cols-2 gap-2 px-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              resetCategoryProgress(category.id);
                            }}
                            disabled={isResetting || completedCount === 0}
                            className="w-full text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                          >
                            {isResetting ? (
                              <Loader2Icon className="h-3 w-3 animate-spin" />
                            ) : (
                              'Reset Progress'
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              deleteCategoryRecordings(category.id);
                            }}
                            disabled={isResetting}
                            className="w-full text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                          >
                            {isResetting ? (
                              <Loader2Icon className="h-3 w-3 animate-spin" />
                            ) : (
                              'Delete Recordings'
                            )}
                          </Button>
                        </div>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent side="right" align="start" className="w-80">
                      <div className="space-y-2">
                        <h4 className="font-medium">{category.label}</h4>
                        <p className="text-sm text-muted-foreground">
                          {getCategoryDescription(category.id)}
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Scripts Panel */}
        <Card className="md:col-span-2 border border-border/50 shadow-sm h-full flex flex-col">
          <CardHeader className="pb-3 border-b flex-shrink-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg font-medium">
                  <TimerIcon className="h-5 w-5 text-primary" />
                  Recording Scripts
                </CardTitle>
                <CardDescription>
                  Read and record each script in the selected category
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {hasPermission === false && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={requestMicrophonePermission}
                    className="gap-2 w-full sm:w-auto"
                  >
                    <AlertCircleIcon className="h-4 w-4" />
                    Enable Microphone
                  </Button>
                )}
                <Badge variant="outline" className="text-sm font-medium px-3 py-1">
                  <TimerIcon className="h-3.5 w-3.5 mr-1 inline-block" />
                  {RECORDING_TIME_LIMIT}s per recording
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="space-y-3 sm:space-y-4">
              {getCategoryScripts(currentCategory).map((script) => (
                <Card 
                  key={script.id} 
                  className={cn(
                    "transition-all border shadow-sm hover:shadow-md",
                    completedScripts.has(script.id) 
                      ? "bg-primary/5 border-primary/20" 
                      : "hover:border-primary/20",
                    currentScript?.id === script.id && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-base flex flex-wrap items-center gap-2">
                          {script.title}
                          {completedScripts.has(script.id) && (
                            <Badge variant="default" className="bg-primary/20 text-primary hover:bg-primary/30">
                              <CheckCircleIcon className="h-3.5 w-3.5 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="text-sm leading-relaxed">
                          {script.text}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4 pt-0">
                    {currentScript?.id === script.id ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center py-4">
                          {countdown > 0 ? (
                            <div className="text-5xl sm:text-6xl font-bold text-primary animate-bounce">
                              {countdown}
                            </div>
                          ) : isRecording ? (
                            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
                              <div className="relative">
                                <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping" />
                                <Progress
                                  value={(duration / RECORDING_TIME_LIMIT) * 100}
                                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full"
                                />
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-14 w-14 sm:h-16 sm:w-16 rounded-full animate-pulse shadow-lg"
                                  onClick={stopRecording}
                                >
                                  <StopCircleIcon size={28} />
                                </Button>
                              </div>
                              <div className="text-center">
                                <p className="font-mono text-2xl sm:text-3xl text-primary">
                                  {(RECORDING_TIME_LIMIT - duration).toFixed(1)}s
                                </p>
                                <p className="text-sm text-muted-foreground">remaining</p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 w-full">
                              {audioUrl && (
                                <>
                                  <div className="bg-muted/50 rounded-lg p-3 sm:p-4 border border-border/50">
                                    <audio ref={audioRef} controls className="w-full" />
                                  </div>
                                  <div className="flex justify-center gap-3 sm:gap-4">
                                    <Button
                                      onClick={handleSubmit}
                                      disabled={isSubmitting}
                                      className="w-28 sm:w-32 bg-primary hover:bg-primary/90 shadow-sm"
                                    >
                                      {isSubmitting ? (
                                        <>
                                          <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                                          Saving...
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircleIcon className="mr-2 h-4 w-4" />
                                          Save
                                        </>
                                      )}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={resetRecording}
                                      disabled={isSubmitting}
                                      className="w-28 sm:w-32 shadow-sm"
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
                          "w-full gap-2 transition-all shadow-sm",
                          completedScripts.has(script.id) 
                            ? "bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                            : "bg-primary hover:bg-primary/90"
                        )}
                      >
                        {completedScripts.has(script.id) ? (
                          <>
                            <CheckCircleIcon className="h-4 w-4" />
                            Completed
                          </>
                        ) : (
                          <>
                            <MicIcon className="h-4 w-4" />
                            Start Recording
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScriptRecorder; 