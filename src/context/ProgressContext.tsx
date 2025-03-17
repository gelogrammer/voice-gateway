import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface ProgressContextType {
  totalRecordings: number;
  completionPercentage: number;
  updateProgress: () => Promise<void>;
  isLoading: boolean;
}

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [totalRecordings, setTotalRecordings] = useState(0);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const updateProgress = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Run both queries in parallel
      const [recordingsResult, progressResult] = await Promise.all([
        supabase
          .from('user_recordings')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id),
        supabase
          .from('user_progress')
          .select('completed_scripts')
          .eq('user_id', user.id)
          .single()
      ]);

      // Update recordings count
      if (!recordingsResult.error) {
        setTotalRecordings(recordingsResult.count || 0);
      }

      // Update completion percentage
      if (!progressResult.error && progressResult.data) {
        const completedCount = progressResult.data.completed_scripts.length;
        const totalScripts = 24; // Total number of scripts (3 scripts × 8 categories)
        const percentage = Math.round((completedCount / totalScripts) * 100);
        setCompletionPercentage(percentage);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Handle real-time changes
  const handleRealtimeChanges = useCallback(async (payload: RealtimePostgresChangesPayload<any>) => {
    if (!user) return;

    // Immediately update the UI based on the change type
    if (payload.table === 'user_recordings') {
      if (payload.eventType === 'INSERT') {
        setTotalRecordings(prev => prev + 1);
      } else if (payload.eventType === 'DELETE') {
        setTotalRecordings(prev => Math.max(0, prev - 1));
      }
    }

    // Then fetch the latest data to ensure accuracy
    await updateProgress();
  }, [user, updateProgress]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Create a single channel for both tables
    const channel = supabase.channel('progress_and_recordings')
      // Subscribe to user_progress changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_progress',
          filter: `user_id=eq.${user.id}`
        },
        handleRealtimeChanges
      )
      // Subscribe to user_recordings changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_recordings',
          filter: `user_id=eq.${user.id}`
        },
        handleRealtimeChanges
      )
      .subscribe();

    // Initial update
    updateProgress();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, handleRealtimeChanges, updateProgress]);

  // Update progress when user changes
  useEffect(() => {
    if (user) {
      updateProgress();
    } else {
      setTotalRecordings(0);
      setCompletionPercentage(0);
    }
  }, [user, updateProgress]);

  return (
    <ProgressContext.Provider value={{ totalRecordings, completionPercentage, updateProgress, isLoading }}>
      {children}
    </ProgressContext.Provider>
  );
};

export const useProgress = () => {
  const context = useContext(ProgressContext);
  if (context === undefined) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
}; 