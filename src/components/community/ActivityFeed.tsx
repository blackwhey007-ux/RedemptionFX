/**
 * Activity Feed Component
 * 
 * Displays a feed of community activities with filtering and pagination.
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityFeedItem, ActivityType } from '@/types/community';
import { getActivityFeed, getFollowingActivityFeed } from '@/lib/services/activityService';
import { ActivityCard } from './ActivityCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Filter, 
  RefreshCw, 
  Loader2,
  Users,
  User
} from 'lucide-react';

interface ActivityFeedProps {
  limit?: number;
  showFilters?: boolean;
  className?: string;
}

export function ActivityFeed({ 
  limit = 20, 
  showFilters = true,
  className = '' 
}: ActivityFeedProps) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [feedType, setFeedType] = useState<'all' | 'following'>('all');
  const [filterTypes, setFilterTypes] = useState<ActivityType[]>([]);
  const [error, setError] = useState<string | null>(null);

  const activityTypes: { value: ActivityType; label: string; icon: any }[] = [
    { value: 'trade', label: 'Trades', icon: Activity },
    { value: 'achievement', label: 'Achievements', icon: Users },
    { value: 'signal', label: 'Signals', icon: Activity },
    { value: 'comment', label: 'Comments', icon: Activity },
    { value: 'follow', label: 'Follows', icon: User },
    { value: 'like', label: 'Likes', icon: Activity }
  ];

  useEffect(() => {
    loadActivities();
  }, [feedType, filterTypes]);

  const loadActivities = async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      let result;
      
      if (feedType === 'following' && user) {
        // Get following IDs (this would come from your follow service)
        const followingIds: string[] = []; // TODO: Get from follow service
        result = await getFollowingActivityFeed(user.uid, followingIds, limit, loadMore ? lastDoc : undefined);
      } else {
        result = await getActivityFeed(user?.uid || '', {
          type: filterTypes.length > 0 ? filterTypes : undefined,
          visibility: 'public'
        }, limit, loadMore ? lastDoc : undefined);
      }

      if (loadMore) {
        setActivities(prev => [...prev, ...result.activities]);
      } else {
        setActivities(result.activities);
      }

      setLastDoc(result.lastDoc);
      setHasMore(result.activities.length === limit);
    } catch (error) {
      console.error('Error loading activities:', error);
      setError('Failed to load activities');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    setLastDoc(null);
    loadActivities();
  };

  const toggleFilterType = (type: ActivityType) => {
    setFilterTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const clearFilters = () => {
    setFilterTypes([]);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading activities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={handleRefresh} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Feed Controls */}
      {showFilters && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center space-x-4">
            {/* Feed Type Toggle */}
            <div className="flex items-center space-x-2">
              <Button
                variant={feedType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFeedType('all')}
              >
                All Activity
              </Button>
              <Button
                variant={feedType === 'following' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFeedType('following')}
                disabled={!user}
              >
                Following
              </Button>
            </div>

            {/* Filter Types */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-1">
                {activityTypes.map((type) => (
                  <Badge
                    key={type.value}
                    variant={filterTypes.includes(type.value) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleFilterType(type.value)}
                  >
                    <type.icon className="h-3 w-3 mr-1" />
                    {type.label}
                  </Badge>
                ))}
              </div>
              {filterTypes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      )}

      {/* Activities List */}
      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No activities found.</p>
            <p className="text-sm">
              {feedType === 'following' 
                ? 'Follow some traders to see their activities here.'
                : 'Start trading to see activities here.'
              }
            </p>
          </div>
        ) : (
          activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              currentUser={user}
            />
          ))
        )}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => loadActivities(true)}
            disabled={loadingMore}
            className="w-full"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading more...
              </>
            ) : (
              'Load More Activities'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}


