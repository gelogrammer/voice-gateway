import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getRecordings, deleteRecording } from '../utils/supabaseClient';
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
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('record');

  const fetchRecordings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await getRecordings(user.id);
      
      if (!data) {
        throw new Error('No data received from server');
      }

      // Map the response to ensure it matches the Recording type
      const formattedRecordings: Recording[] = data.map((recording: any) => ({
        ...recording,
        user_id: recording.user_id || user.id,
        profiles: recording.profiles || []
      }));
      setRecordings(formattedRecordings);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      setError('Failed to load recordings. Please try again.');
      toast.error('Failed to fetch recordings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchRecordings();
    }
  }, [user, authLoading]);

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
      toast.success('Recording deleted successfully');
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast.error('Failed to delete recording');
    }
  };

  // Calculate progress statistics
  const totalScripts = scripts.length;
  const completedScripts = recordings.length;
  const progressPercentage = (completedScripts / totalScripts) * 100;

  // Group recordings by category
  const recordingsByCategory = recordings.reduce((acc, recording) => {
    const category = recording.title.split(' - ')[0];
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(recording);
    return acc;
  }, {} as Record<string, Recording[]>);

  return (
    <div className="container mx-auto py-6 bg-background min-h-screen">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Voice Recording Dashboard
                  </CardTitle>
                  <CardDescription className="mt-2 text-lg">
                    Record and analyze your voice samples for speech pattern analysis
                  </CardDescription>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={fetchRecordings} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Refresh your recordings list</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
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
                      {completedScripts}/{totalScripts} Scripts
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/10 rounded-lg p-3 text-center hover:bg-primary/15 transition-colors">
                    <MicIcon className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <div className="text-2xl font-bold">{completedScripts}</div>
                    <div className="text-xs text-muted-foreground">Recordings</div>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-3 text-center hover:bg-primary/15 transition-colors">
                    <BarChart2Icon className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <div className="text-2xl font-bold">{progressPercentage.toFixed(0)}%</div>
                    <div className="text-xs text-muted-foreground">Complete</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs Section */}
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="space-y-4"
        >
          <div className="flex justify-center mb-6">
            <TabsList className="inline-flex h-10 items-center justify-center rounded-full bg-white p-1 shadow-[0_2px_10px] shadow-black/5">
              <TabsTrigger 
                value="record"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-6 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[#0ea5e9] data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-muted/50"
              >
                <MicIcon className="h-4 w-4 mr-2" />
                Record New
              </TabsTrigger>
              <TabsTrigger 
                value="recordings"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full px-6 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[#0ea5e9] data-[state=active]:text-white data-[state=active]:shadow-sm hover:bg-muted/50"
              >
                <BarChart2Icon className="h-4 w-4 mr-2" />
                My Recordings
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="record" className="focus-visible:outline-none">
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <div>
                  <CardTitle className="text-xl">New Recording</CardTitle>
                  <CardDescription>Select a script and start recording your voice</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
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
                        <RecordingCard key={recording.id} recording={recording} />
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
