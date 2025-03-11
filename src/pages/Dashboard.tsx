import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getRecordings, deleteRecording } from '../utils/supabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, MicIcon, BarChart2Icon } from 'lucide-react';
import { toast } from 'sonner';
import ScriptRecorder from '../components/ScriptRecorder';
import UserCard from '../components/UserCard';
import { scripts } from '../data/recordingScripts';
import { Recording } from '../types/recording';
import { ScrollArea } from '@/components/ui/scroll-area';
import RecordingCard from '../components/RecordingCard';

const Dashboard = () => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('record');

  const fetchRecordings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await getRecordings(user.id);
      // Map the response to ensure it matches the Recording type
      const formattedRecordings: Recording[] = data.map((recording: any) => ({
        ...recording,
        user_id: recording.user_id || user.id, // Ensure user_id is present
        profiles: recording.profiles || []
      }));
      setRecordings(formattedRecordings);
    } catch (error) {
      console.error('Error fetching recordings:', error);
      toast.error('Failed to fetch recordings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, [user]);

  if (loading) {
    return <LoadingSpinner />;
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-3xl font-bold">Voice Recording Dashboard</CardTitle>
                  <CardDescription className="mt-2 text-lg">
                    Record and analyze your voice samples for speech pattern analysis
                  </CardDescription>
                </div>
                <Button onClick={fetchRecordings} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Progress Overview</CardTitle>
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
                  <div className="bg-primary/10 rounded-lg p-3 text-center">
                    <MicIcon className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <div className="text-2xl font-bold">{completedScripts}</div>
                    <div className="text-xs text-muted-foreground">Recordings</div>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-3 text-center">
                    <BarChart2Icon className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <div className="text-2xl font-bold">{progressPercentage.toFixed(0)}%</div>
                    <div className="text-xs text-muted-foreground">Complete</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab} 
          className="space-y-4"
        >
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto bg-muted/50 p-1 rounded-lg">
            <TabsTrigger 
              value="record"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <MicIcon className="h-4 w-4 mr-2" />
              Record New
            </TabsTrigger>
            <TabsTrigger 
              value="recordings"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <BarChart2Icon className="h-4 w-4 mr-2" />
              My Recordings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="record" className="mt-6 focus-visible:outline-none">
            <ScriptRecorder />
          </TabsContent>

          <TabsContent value="recordings" className="mt-6 focus-visible:outline-none">
            <Card>
              <CardHeader>
                <CardTitle>Your Recordings</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  {loading ? (
                    <div>Loading...</div>
                  ) : recordings.length === 0 ? (
                    <div>No recordings found</div>
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
