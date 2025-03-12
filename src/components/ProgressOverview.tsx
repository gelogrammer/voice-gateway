import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart2Icon, MicIcon } from 'lucide-react';
import { useProgress } from '@/context/ProgressContext';

const ProgressOverview = () => {
  const { totalRecordings, completionPercentage, isLoading } = useProgress();

  return (
    <Card className="mb-4 sm:mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart2Icon className="h-5 w-5 text-primary" />
          Progress Overview
        </CardTitle>
        <CardDescription>
          Track your recording progress and completion status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MicIcon className="h-4 w-4 text-primary" />
              <span className="font-medium">Recordings</span>
            </div>
            <div className="text-3xl font-bold text-primary">
              {isLoading ? '...' : totalRecordings}
            </div>
          </div>
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2Icon className="h-4 w-4 text-primary" />
              <span className="font-medium">Complete</span>
            </div>
            <div className="text-3xl font-bold text-primary">
              {isLoading ? '...' : `${completionPercentage}%`}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgressOverview; 