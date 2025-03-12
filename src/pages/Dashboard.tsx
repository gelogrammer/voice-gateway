import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { getRecordings, deleteRecording } from '../utils/supabaseClient';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, MicIcon, BarChart2Icon, HelpCircle, InfoIcon } from 'lucide-react';
import { toast } from 'sonner';
import ScriptRecorder from '../components/ScriptRecorder';
import UserCard from '../components/UserCard';
import { scripts } from '../data/recordingScripts';
import { Recording } from '../types/recording';
import { ScrollArea } from '@/components/ui/scroll-area';
import RecordingCard from '../components/RecordingCard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { totalRecordings, completionPercentage, updateProgress, isLoading: progressLoading } = useProgress();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('record');
  
  // Add ref for subscription
  const recordingsSubscription = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchRecordings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('user_recordings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      if (!data) throw new Error('No data received from server');

      const formattedRecordings: Recording[] = data.map((recording: any) => ({
        ...recording,
        user_id: recording.user_id || user.id,
        profiles: recording.profiles || []
      }));
      setRecordings(formattedRecordings);
      
      await updateProgress();
    } catch (error) {
      console.error('Error fetching recordings:', error);
      setError('Failed to load recordings. Please try again.');
      toast.error('Failed to fetch recordings');
    } finally {
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'recordings') {
      fetchRecordings();
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user) return;

    // Subscribe to user_recordings changes
    recordingsSubscription.current = supabase.channel('recordings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_recordings',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          // Always fetch fresh data on any change
          if (activeTab === 'recordings') {
            await fetchRecordings();
          }
        }
      )
      .subscribe();

    // Initial fetch if on recordings tab
    if (activeTab === 'recordings') {
      fetchRecordings();
    }

    // Cleanup subscription
    return () => {
      if (recordingsSubscription.current) {
        supabase.removeChannel(recordingsSubscription.current);
      }
    };
  }, [user, activeTab]);

  // Show loading spinner while auth is being checked
  if (authLoading) {
    return <LoadingSpinner />;
  }

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="text-destructive mb-4">{error}</div>
        <Button onClick={fetchRecordings} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  // Show not authenticated state
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="text-muted-foreground mb-4">Please log in to access the dashboard</div>
      </div>
    );
  }

  const handleDeleteRecording = async (id: string) => {
    try {
      await deleteRecording(id);
      setRecordings(recordings.filter(rec => rec.id !== id));
      // Update progress after deleting recording
      await updateProgress();
      toast.success('Recording deleted successfully');
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast.error('Failed to delete recording');
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 bg-background min-h-screen">
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8">
        {/* Header Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          <Card className="md:col-span-2 overflow-hidden">
            <CardHeader className="relative pb-6 sm:pb-8">
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 sm:mb-6">
                  <CardTitle className="text-3xl sm:text-4xl font-bold tracking-tight">
                    <span className="bg-gradient-to-r from-blue-900 to-blue-600 bg-clip-text text-transparent">
                      talk.twah
                    </span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                    <span className="text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
                      Research Lab
                    </span>
                  </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  <div className="max-w-2xl">
                    <p className="text-lg sm:text-xl leading-relaxed text-foreground/90">
                      Help advance our research in 
                      <span className="font-medium text-blue-700 dark:text-blue-400"> real-time speech analysis </span> 
                      using deep reinforcement learning.
                    </p>
                    <p className="text-lg sm:text-xl leading-relaxed text-foreground/90 mt-2">
                      Your voice samples contribute to developing 
                      <span className="font-medium text-blue-700 dark:text-blue-400"> intelligent feedback systems </span> 
                      for speech rate and emotion detection.
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-blue-600 to-blue-900 rounded-full"></div>
                    <div className="pl-4 sm:pl-6">
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Each recording helps train our AI to better understand human speech patterns, 
                        enabling more accurate real-time feedback for speech therapy and communication training.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-blue-600/5 rounded-full blur-3xl -z-0"></div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                Progress Overview
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Track your recording progress here</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Total Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {totalRecordings}/{scripts.length} Scripts
                    </span>
                  </div>
                  <Progress value={completionPercentage} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/10 rounded-lg p-3 text-center hover:bg-primary/15 transition-colors">
                    <MicIcon className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <div className="text-2xl font-bold">{totalRecordings}</div>
                    <div className="text-xs text-muted-foreground">Recordings</div>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-3 text-center hover:bg-primary/15 transition-colors">
                    <BarChart2Icon className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <div className="text-2xl font-bold">{completionPercentage}%</div>
                    <div className="text-xs text-muted-foreground">Complete</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs Section */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <div className="flex justify-center mb-6">
            <TabsList className="inline-flex h-9 sm:h-10 items-center justify-center rounded-full bg-white p-1 shadow-[0_2px_10px] shadow-black/5">
              <TabsTrigger 
                value="record"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 sm:px-6 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[#0ea5e9] data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-muted/50"
              >
                <MicIcon className="h-4 w-4 mr-1 sm:mr-2" />
                Record New
              </TabsTrigger>
              <TabsTrigger 
                value="recordings"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-4 sm:px-6 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[#0ea5e9] data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-muted/50"
              >
                <BarChart2Icon className="h-4 w-4 mr-1 sm:mr-2" />
                My Recordings
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="record" className="mt-6 focus-visible:outline-none">
            <Card className="border-2 border-primary/20">
              <CardContent className="p-0">
                <ScriptRecorder />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recordings" className="mt-6 focus-visible:outline-none">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Your Recordings</CardTitle>
                <CardDescription>Review and manage your recorded voice samples</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  {loading ? (
                    <div className="flex items-center justify-center p-8">
                      <LoadingSpinner />
                    </div>
                  ) : recordings.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      <MicIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No recordings found. Start by recording your first voice sample!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recordings.map((recording) => (
                        <RecordingCard 
                          key={recording.id} 
                          recording={recording} 
                          onDelete={handleDeleteRecording}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
