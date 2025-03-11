
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import VoiceRecorder from '../components/VoiceRecorder';
import UserCard, { Recording } from '../components/UserCard';
import { getRecordings, deleteRecording } from '../utils/supabaseClient';
import { toast } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2Icon, RefreshCwIcon } from 'lucide-react';

const Dashboard = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recordings');
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchRecordings();
  }, [user, navigate]);
  
  const fetchRecordings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await getRecordings(user.id);
      
      if (data) {
        setRecordings(data);
      }
    } catch (error) {
      console.error('Error fetching recordings:', error);
      toast.error('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteRecording = async (id: string) => {
    try {
      await deleteRecording(id);
      setRecordings(recordings.filter(recording => recording.id !== id));
      toast.success('Recording deleted successfully');
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast.error('Failed to delete recording');
    }
  };
  
  return (
    <div className="page-container">
      <NavBar />
      
      <div className="page-content">
        <div className="container-tight">
          <div className="mb-8">
            <h1 className="text-3xl font-medium animate-fade-in">User Dashboard</h1>
            <p className="text-muted-foreground animate-fade-in">
              Record and manage your voice samples for analysis
            </p>
          </div>
          
          <Tabs defaultValue="recordings" onValueChange={setActiveTab} className="animate-fade-in">
            <TabsList className="grid w-full grid-cols-2 max-w-md mb-8">
              <TabsTrigger value="recordings">My Recordings</TabsTrigger>
              <TabsTrigger value="record">Record New</TabsTrigger>
            </TabsList>
            
            <TabsContent value="recordings" className="mt-4 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-medium">Your Voice Recordings</h2>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={fetchRecordings}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2Icon className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCwIcon className="h-4 w-4 mr-1" />
                  )}
                  Refresh
                </Button>
              </div>
              
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : recordings.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {recordings.map((recording) => (
                    <UserCard
                      key={recording.id}
                      recording={recording}
                      onDelete={handleDeleteRecording}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>No recordings yet</CardTitle>
                    <CardDescription>
                      Record your first voice sample to get started
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <Button onClick={() => setActiveTab('record')}>
                      Record Now
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="record" className="mt-4 animate-fade-in">
              <h2 className="text-xl font-medium mb-6">Record New Voice Sample</h2>
              <VoiceRecorder />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
