import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MicIcon, StopCircleIcon, Loader2Icon, PlayIcon, CheckCircleIcon, AlertCircleIcon, TimerIcon, InfoIcon, HelpCircle, BarChart2Icon, RefreshCw } from 'lucide-react';
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

  // Sync with Supabase
  const syncWithSupabase = async () => {
    if (!user) return;

    try {
      setIsSyncing(true);
      const { data, error } = await getUserProgress(user.id);

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
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
          const progress: UserProgress = {
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

  // Update Supabase whenever progress changes
  useEffect(() => {
    if (user && !isSyncing) {
      const saveProgress = async () => {
        try {
          setIsSyncing(true);
          
          // Save to localStorage
          const progress: UserProgress = {
            completedScripts: Array.from(completedScripts),
            currentCategory,
            lastUpdated: new Date().toISOString()
          };
          localStorage.setItem(`userProgress_${user.id}`, JSON.stringify(progress));

          // Save to Supabase using the helper function
          const { error } = await updateUserProgress(user.id, {
            completed_scripts: Array.from(completedScripts),
            current_category: currentCategory
          });

          if (error) throw error;
        } catch (error) {
          console.error('Error saving progress:', error);
          // Show error toast only for non-network errors
          if (error instanceof Error && !error.message.includes('network')) {
            toast.error('Failed to save progress');
          }
        } finally {
          setIsSyncing(false);
        }
      };

      // Debounce the save operation
      const timeoutId = setTimeout(saveProgress, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [completedScripts, currentCategory, user]);

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
  
  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <Card className="mb-6 bg-gradient-to-br from-primary/5 via-primary/10 to-background border-2 border-primary/20">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Voice Recording Session
              </CardTitle>
              <CardDescription className="text-lg mt-2">
                Record yourself reading each script to help improve voice recognition systems.
              </CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-full">
                    <InfoIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-sm">
                  <p>Complete all scripts in each category before moving to the next. Each recording has a {RECORDING_TIME_LIMIT}-second time limit.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
      </Card>

      <Card className="mb-6 bg-gradient-to-br from-primary/5 via-primary/10 to-background border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold">
            <HelpCircle className="h-6 w-6 text-primary" />
            How to Use talk.twah
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Follow these steps to get started with voice recording
          </CardDescription>
        </CardHeader>
        <CardContent>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Categories Panel */}
        <Card className="md:col-span-1 border border-border/50 shadow-sm">
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
                      <button
                        onClick={() => handleCategoryChange(category.id)}
                        className={cn(
                          "w-full p-4 rounded-lg transition-all",
                          "hover:shadow-md",
                          "border border-border/50",
                          "space-y-2",
                          currentCategory === category.id && "ring-2 ring-primary ring-offset-2",
                          category.id === 'HIGH_FLUENCY' && "bg-[#e7f8ef]",
                          category.id === 'MEDIUM_FLUENCY' && "bg-[#e7f1f8]",
                          category.id === 'LOW_FLUENCY' && "bg-[#fdf7e7]",
                          category.id === 'CLEAR_PRONUNCIATION' && "bg-[#f5e7f8]",
                          category.id === 'UNCLEAR_PRONUNCIATION' && "bg-[#f8e7e7]",
                          category.id === 'FAST_TEMPO' && "bg-[#ffe7e7]",
                          category.id === 'MEDIUM_TEMPO' && "bg-[#e7eaf8]",
                          category.id === 'SLOW_TEMPO' && "bg-[#e7f8f5]",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              "bg-white shadow-sm",
                              category.id === 'HIGH_FLUENCY' && "text-green-600",
                              category.id === 'MEDIUM_FLUENCY' && "text-blue-600",
                              category.id === 'LOW_FLUENCY' && "text-yellow-600",
                              category.id === 'CLEAR_PRONUNCIATION' && "text-purple-600",
                              category.id === 'UNCLEAR_PRONUNCIATION' && "text-red-600",
                              category.id === 'FAST_TEMPO' && "text-orange-600",
                              category.id === 'MEDIUM_TEMPO' && "text-indigo-600",
                              category.id === 'SLOW_TEMPO' && "text-teal-600",
                            )}>
                              <span className="text-xl">{category.icon}</span>
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="font-medium text-sm text-gray-900">
                                {category.label}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {completedCount}/{categoryScripts.length}
                              </span>
                            </div>
                          </div>
                          {progress === 100 && (
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center",
                              "bg-white shadow-sm",
                              category.id === 'HIGH_FLUENCY' && "text-green-600",
                              category.id === 'MEDIUM_FLUENCY' && "text-blue-600",
                              category.id === 'LOW_FLUENCY' && "text-yellow-600",
                              category.id === 'CLEAR_PRONUNCIATION' && "text-purple-600",
                              category.id === 'UNCLEAR_PRONUNCIATION' && "text-red-600",
                              category.id === 'FAST_TEMPO' && "text-orange-600",
                              category.id === 'MEDIUM_TEMPO' && "text-indigo-600",
                              category.id === 'SLOW_TEMPO' && "text-teal-600",
                            )}>
                              <CheckCircleIcon className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <Progress 
                          value={progress} 
                          className={cn(
                            "h-1.5 rounded-full",
                            category.id === 'HIGH_FLUENCY' && "bg-green-200 [&>div]:bg-green-600",
                            category.id === 'MEDIUM_FLUENCY' && "bg-blue-200 [&>div]:bg-blue-600",
                            category.id === 'LOW_FLUENCY' && "bg-yellow-200 [&>div]:bg-yellow-600",
                            category.id === 'CLEAR_PRONUNCIATION' && "bg-purple-200 [&>div]:bg-purple-600",
                            category.id === 'UNCLEAR_PRONUNCIATION' && "bg-red-200 [&>div]:bg-red-600",
                            category.id === 'FAST_TEMPO' && "bg-orange-200 [&>div]:bg-orange-600",
                            category.id === 'MEDIUM_TEMPO' && "bg-indigo-200 [&>div]:bg-indigo-600",
                            category.id === 'SLOW_TEMPO' && "bg-teal-200 [&>div]:bg-teal-600",
                          )} 
                        />
                      </button>
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
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-lg font-medium">
                  <TimerIcon className="h-5 w-5 text-primary" />
                  Recording Scripts
                </CardTitle>
                <CardDescription>
                  Read and record each script in the selected category
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {hasPermission === false && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={requestMicrophonePermission}
                    className="gap-2"
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
          <CardContent className="p-4">
            <div className="space-y-4">
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
                  <CardHeader className="p-4 pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-base flex items-center gap-2">
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
                  <CardContent className="p-4 pt-0">
                    {currentScript?.id === script.id ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-center py-4">
                          {countdown > 0 ? (
                            <div className="text-6xl font-bold text-primary animate-bounce">
                              {countdown}
                            </div>
                          ) : isRecording ? (
                            <div className="flex items-center gap-8">
                              <div className="relative">
                                <div className="absolute inset-0 bg-primary/10 rounded-full animate-ping" />
                                <Progress
                                  value={(duration / RECORDING_TIME_LIMIT) * 100}
                                  className="w-24 h-24 rounded-full"
                                />
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-16 w-16 rounded-full animate-pulse shadow-lg"
                                  onClick={stopRecording}
                                >
                                  <StopCircleIcon size={32} />
                                </Button>
                              </div>
                              <div className="text-center">
                                <p className="font-mono text-3xl text-primary">
                                  {(RECORDING_TIME_LIMIT - duration).toFixed(1)}s
                                </p>
                                <p className="text-sm text-muted-foreground">remaining</p>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4 w-full">
                              {audioUrl && (
                                <>
                                  <div className="bg-muted/50 rounded-lg p-4 border border-border/50">
                                    <audio ref={audioRef} controls className="w-full" />
                                  </div>
                                  <div className="flex justify-center gap-4">
                                    <Button
                                      onClick={handleSubmit}
                                      disabled={isSubmitting}
                                      className="w-32 bg-primary hover:bg-primary/90 shadow-sm"
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
                                      className="w-32 shadow-sm"
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