import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UserCard, { Recording } from '../components/UserCard';
import { getAllRecordings, getAllUsers, deleteRecording, supabase } from '../utils/supabaseClient';
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2Icon, 
  RefreshCwIcon, 
  DownloadIcon, 
  UserIcon, 
  FolderIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  SearchIcon,
  XIcon,
  LayoutGridIcon,
  LayoutListIcon,
  SlidersHorizontalIcon
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

type User = {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  created_at: string;
};

type RecordingsByFolder = {
  [key: string]: Recording[];
};

type ViewMode = 'list' | 'grid';
type SortOption = 'name' | 'date' | 'size';

const AdminDashboard = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [recordingsByFolder, setRecordingsByFolder] = useState<RecordingsByFolder>({});
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (!isAdmin) {
      navigate('/dashboard');
      toast.error('You do not have permission to access the admin dashboard');
      return;
    }
    
    fetchData();
  }, [user, isAdmin, navigate]);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [recordingsData, usersData] = await Promise.all([
        getAllRecordings(),
        getAllUsers(),
      ]);
      
      if (recordingsData) {
        const formattedRecordings: Recording[] = recordingsData.map((recording: any) => ({
          ...recording,
          user_id: recording.user_id || user.id,
          profiles: recording.profiles || []
        }));
        setRecordings(formattedRecordings);

        // Organize recordings by folder
        const byFolder = formattedRecordings.reduce((acc, recording) => {
          const folderName = recording.category || 'Uncategorized';
          if (!acc[folderName]) {
            acc[folderName] = [];
          }
          acc[folderName].push(recording);
          return acc;
        }, {} as RecordingsByFolder);

        setRecordingsByFolder(byFolder);
        
        // Expand all folders by default if searching
        if (searchTerm) {
          setExpandedFolders(new Set(Object.keys(byFolder)));
        }
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
      // Update recordings by folder
      const updatedRecordings = recordings.filter(recording => recording.id !== id);
      const byFolder = updatedRecordings.reduce((acc, recording) => {
        const folderName = recording.category || 'Uncategorized';
        if (!acc[folderName]) {
          acc[folderName] = [];
        }
        acc[folderName].push(recording);
        return acc;
      }, {} as RecordingsByFolder);
      setRecordingsByFolder(byFolder);
      toast.success('Recording deleted successfully');
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast.error('Failed to delete recording');
    }
  };
  
  const toggleFolder = (folderName: string) => {
    const newExpandedFolders = new Set(expandedFolders);
    if (expandedFolders.has(folderName)) {
      newExpandedFolders.delete(folderName);
    } else {
      newExpandedFolders.add(folderName);
    }
    setExpandedFolders(newExpandedFolders);
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
  
  const filterRecordingsByFolder = (folderRecordings: Recording[]) => {
    if (!searchTerm) return folderRecordings;
    
    return folderRecordings.filter(recording => {
      const searchLower = searchTerm.toLowerCase();
      const title = recording.title?.toLowerCase() || '';
      const description = recording.description?.toLowerCase() || '';
      const userFullName = recording.user?.full_name?.toLowerCase() || '';
      const userEmail = recording.user?.email?.toLowerCase() || '';

      return (
        title.includes(searchLower) ||
        description.includes(searchLower) ||
        userFullName.includes(searchLower) ||
        userEmail.includes(searchLower)
      );
    });
  };
  
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const email = user.email?.toLowerCase() || '';
    const fullName = user.full_name?.toLowerCase() || '';

    return (
      email.includes(searchLower) ||
      fullName.includes(searchLower)
    );
  });
  
  const sortRecordings = (recordings: Recording[]) => {
    return [...recordings].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title);
        case 'date':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'size':
          return (b.file_size || 0) - (a.file_size || 0);
        default:
          return 0;
      }
    });
  };
  
  const downloadFolderRecordings = async (folderName: string, recordings: Recording[]) => {
    try {
      // Create a new zip file
      const zip = new JSZip();
      const folder = zip.folder(folderName);
      
      if (!folder) {
        throw new Error('Failed to create zip folder');
      }

      // Show loading toast
      const loadingToast = toast.loading(`Preparing ${recordings.length} recordings for download...`);

      // Download each recording and add to zip
      const downloadPromises = recordings.map(async (recording) => {
        try {
          let downloadUrl = recording.file_url;
          
          if (!downloadUrl.includes('?token=')) {
            // Get a new signed URL
            const { data, error } = await supabase
              .storage
              .from('recordings')
              .createSignedUrl(recording.file_url, 300); // 5 minutes expiry
              
            if (error) throw error;
            if (!data?.signedUrl) throw new Error('Failed to get signed URL');
            
            downloadUrl = data.signedUrl;
          }

          // Fetch the file
          const response = await fetch(downloadUrl);
          if (!response.ok) throw new Error('Failed to fetch file');
          
          const blob = await response.blob();
          folder.file(recording.title, blob);
          
        } catch (error) {
          console.error(`Error downloading recording ${recording.title}:`, error);
          throw error;
        }
      });

      // Wait for all downloads to complete
      await Promise.all(downloadPromises);

      // Generate the zip file
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Save the zip file
      saveAs(content, `${folderName}_recordings.zip`);
      
      // Show success message
      toast.dismiss(loadingToast);
      toast.success(`Successfully downloaded ${recordings.length} recordings from ${folderName}`);
      
    } catch (error) {
      console.error('Error downloading folder recordings:', error);
      toast.error('Failed to download recordings');
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col space-y-8">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight animate-fade-in">Admin Dashboard</h1>
              <p className="text-muted-foreground mt-1 animate-fade-in">
                Manage and organize voice recordings
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Button 
                variant="outline"
                onClick={fetchData}
                disabled={loading}
                className="h-9"
              >
                {loading ? (
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
              
              <Button onClick={exportAllData} className="h-9">
                <DownloadIcon className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="recordings" className="animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                <TabsTrigger value="recordings" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <FolderIcon className="h-4 w-4 mr-2" />
                  Recordings
                </TabsTrigger>
                <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <UserIcon className="h-4 w-4 mr-2" />
                  Users
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none md:w-[300px]">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search recordings..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      if (e.target.value) {
                        setExpandedFolders(new Set(Object.keys(recordingsByFolder)));
                      }
                    }}
                    className="pl-9 pr-9"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SlidersHorizontalIcon className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="size">Size</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center rounded-md border bg-background">
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-9 px-2.5"
                    onClick={() => setViewMode('list')}
                  >
                    <LayoutListIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-9 px-2.5"
                    onClick={() => setViewMode('grid')}
                  >
                    <LayoutGridIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <TabsContent value="recordings" className="mt-4 animate-fade-in focus-visible:outline-none">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                  <Loader2Icon className="h-8 w-8 animate-spin mb-4" />
                  <p>Loading recordings...</p>
                </div>
              ) : Object.keys(recordingsByFolder).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(recordingsByFolder).map(([folderName, folderRecordings]) => {
                    const filteredFolderRecordings = filterRecordingsByFolder(sortRecordings(folderRecordings));
                    if (filteredFolderRecordings.length === 0) return null;
                    
                    return (
                      <Card key={folderName} className="overflow-hidden border-l-4 border-l-primary">
                        <div className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors">
                          <button
                            onClick={() => toggleFolder(folderName)}
                            className="flex items-center space-x-3 flex-grow"
                          >
                            {expandedFolders.has(folderName) ? (
                              <ChevronDownIcon className="h-5 w-5 text-primary flex-shrink-0" />
                            ) : (
                              <ChevronRightIcon className="h-5 w-5 text-primary flex-shrink-0" />
                            )}
                            <FolderIcon className="h-5 w-5 text-primary flex-shrink-0" />
                            <h3 className="text-lg font-medium text-left flex-grow">{folderName}</h3>
                            <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded-full">
                              {filteredFolderRecordings.length} recording{filteredFolderRecordings.length !== 1 ? 's' : ''}
                            </span>
                          </button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-4"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFolderRecordings(folderName, filteredFolderRecordings);
                            }}
                          >
                            <DownloadIcon className="h-4 w-4 mr-2" />
                            Download All
                          </Button>
                        </div>
                        
                        {expandedFolders.has(folderName) && (
                          <div className="border-t bg-accent/5">
                            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4' : 'divide-y'}>
                              {filteredFolderRecordings.map((recording) => (
                                <div key={recording.id} className={viewMode === 'grid' ? '' : 'p-4'}>
                                  <UserCard
                                    recording={recording}
                                    onDelete={handleDeleteRecording}
                                    showUser={true}
                                    viewMode={viewMode}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <FolderIcon className="h-6 w-6 text-primary" />
                    </div>
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
            
            <TabsContent value="users" className="mt-4 animate-fade-in focus-visible:outline-none">
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
                          <CardTitle className="text-lg">{user.full_name || user.email}</CardTitle>
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
    </div>
  );
};

export default AdminDashboard;
