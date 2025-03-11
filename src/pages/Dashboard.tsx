import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getRecordings } from '../lib/supabase';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Recording {
  id: string;
  created_at: string;
  file_path: string;
  status: string;
  transcription?: string;
  analysis?: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

const Dashboard = () => {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecordings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await getRecordings(user.id);
      setRecordings(data || []);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">User Dashboard</h1>
          <p className="text-gray-600">Record and manage your voice samples for analysis</p>
        </div>
        <Button onClick={fetchRecordings} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex space-x-4">
        <Button variant="secondary" className="flex-1">
          My Recordings
        </Button>
        <Button variant="outline" className="flex-1">
          Record New
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Your Voice Recordings</h2>
          
          {recordings.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-lg font-medium">No recordings yet</h3>
              <p className="text-gray-600 mt-2">Record your first voice sample to get started</p>
              <Button className="mt-4">Record Now</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recordings.map((recording) => (
                <div
                  key={recording.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{new Date(recording.created_at).toLocaleString()}</p>
                      <p className="text-sm text-gray-600">Status: {recording.status}</p>
                    </div>
                    <div className="space-x-2">
                      <Button variant="outline" size="sm">
                        Play
                      </Button>
                      <Button variant="outline" size="sm">
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
