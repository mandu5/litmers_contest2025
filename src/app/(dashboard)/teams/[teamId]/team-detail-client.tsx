/**
 * Team Detail Client Component
 * 
 * Client component for displaying team activity log with pagination.
 */
'use client';

import { useState, useEffect } from 'react';
import { formatRelativeTime } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getInitials } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  profileImage: string | null;
}

interface Activity {
  id: string;
  description: string;
  user: User;
  createdAt: string;
}

export default function TeamDetailClient({
  teamId,
  initialActivities,
}: {
  teamId: string;
  initialActivities: Activity[];
}) {
  const [activities, setActivities] = useState(initialActivities);
  const [isLoading, setIsLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (initialActivities.length > 0) {
      setCursor(initialActivities[initialActivities.length - 1].id);
      setHasMore(initialActivities.length >= 50);
    }
  }, [initialActivities]);

  const loadMore = async () => {
    if (isLoading || !hasMore || !cursor) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/activity?cursor=${cursor}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        setActivities((prev) => [...prev, ...data.activities]);
        setCursor(data.nextCursor || null);
        setHasMore(data.hasMore || false);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-center text-sm text-slate-500">No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={activity.user.profileImage || undefined} />
                  <AvatarFallback>{getInitials(activity.user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-medium">{activity.user.name}</span>{' '}
                    {activity.description}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatRelativeTime(activity.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            {hasMore && (
              <Button
                variant="outline"
                className="w-full"
                onClick={loadMore}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

