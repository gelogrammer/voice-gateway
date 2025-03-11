
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/NavBar';
import Footer from '../components/Footer';
import UserCard, { Recording } from '../components/UserCard';
import { getAllRecordings, getAllUsers, deleteRecording } from '../utils/supabaseClient';
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2Icon, RefreshCwIcon, DownloadIcon, UserIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';

type User = {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  created_at: string;
};

const AdminDashboard = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (user.role !== 'admin') {
      navigate('/dashboard');
      toast.error('You do not have permission to access the admin dashboard');
      return;
    }
    
    fetchData();
  }, [user, navigate]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [recordingsData, usersData] = await Promise.all([
        getAllRecordings(),
        getAllUsers(),
      ]);
      
      if (recordingsData) {
        setRecordings(recordingsData);
      }
      
      if (usersData) {
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
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
  
  const exportAllData = () => {
    try {
      // Prepare data for export
      const dataStr = JSON.stringify({ recordings, users }, null, 2);
      
      // Create blob and download
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voice_gateway_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };
  
  const filteredRecordings = recordings.filter(recording => {
    const searchLower = searchTerm.toLowerCase();
    return (
      recording.title.toLowerCase().includes(searchLower) ||
      (recording.description?.toLowerCase().includes(searchLower)) ||
      (recording.user?.full_name?.toLowerCase().includes(searchLower)) ||
      (recording.user?.email.toLowerCase().includes(searchLower))
    );
  });
  
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      (user.full_name?.toLowerCase().includes(searchLower))
    );
  });
  
  return (
    <div className="page-container">
      <NavBar />
      
      <div className="page-content">
        <div className="container-tight">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-medium animate-fade-in">Admin Dashboard</h1>
              <p className="text-muted-foreground animate-fade-in">
                Manage users and recordings
              </p>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline"
                onClick={fetchData}
                disabled={loading}
              >
                {loading ? (
                  <Loader2Icon className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCwIcon className="h-4 w-4 mr-1" />
                )}
                Refresh
              </Button>
              
              <Button onClick={exportAllData}>
                <DownloadIcon className="h-4 w-4 mr-1" />
                Export Data
              </Button>
            </div>
          </div>
          
          <div className="mb-6">
            <Input
              placeholder="Search users or recordings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          
          <Tabs defaultValue="recordings" className="animate-fade-in">
            <TabsList className="grid w-full grid-cols-2 max-w-md mb-8">
              <TabsTrigger value="recordings">All Recordings</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>
            
            <TabsContent value="recordings" className="mt-4 animate-fade-in">
              <h2 className="text-xl font-medium mb-6">All Voice Recordings</h2>
              
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredRecordings.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {filteredRecordings.map((recording) => (
                    <UserCard
                      key={recording.id}
                      recording={recording}
                      onDelete={handleDeleteRecording}
                      showUser={true}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>No recordings found</CardTitle>
                    <CardDescription>
                      {searchTerm 
                        ? 'No recordings match your search criteria' 
                        : 'No recordings have been uploaded yet'}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="users" className="mt-4 animate-fade-in">
              <h2 className="text-xl font-medium mb-6">Registered Users</h2>
              
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredUsers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredUsers.map((user) => (
                    <Card key={user.id} className="animate-fade-in hover:shadow-md transition-all">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="flex items-center space-x-2">
                          <div className="p-2 rounded-full bg-voice-blue/10 text-voice-blue">
                            <UserIcon size={16} />
                          </div>
                          <CardTitle className="text-lg">{user.full_name || 'Unnamed User'}</CardTitle>
                        </div>
                        <div className="text-xs px-2 py-1 rounded bg-secondary">
                          {user.role}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Joined: {new Date(user.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>No users found</CardTitle>
                    <CardDescription>
                      {searchTerm 
                        ? 'No users match your search criteria' 
                        : 'No users have registered yet'}
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default AdminDashboard;
