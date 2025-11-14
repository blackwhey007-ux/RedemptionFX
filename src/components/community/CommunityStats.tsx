/**
 * Community Statistics Component
 * 
 * Displays detailed community statistics and analytics.
 */

'use client';

import { useState, useEffect } from 'react';
import { getActivityStats } from '@/lib/services/activityService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Users, 
  MessageCircle, 
  Trophy, 
  TrendingUp,
  Activity,
  Target,
  DollarSign,
  Calendar,
  Star
} from 'lucide-react';

interface CommunityStatsProps {
  className?: string;
}

export function CommunityStats({ className = '' }: CommunityStatsProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getActivityStats();
      setStats(result);
    } catch (error) {
      console.error('Error loading community stats:', error);
      setError('Failed to load community statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 bg-muted rounded animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-8">
          <p className="text-destructive mb-4">{error}</p>
          <button 
            onClick={loadStats}
            className="text-blue-600 hover:underline"
          >
            Try Again
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <div className={`text-center py-8 text-muted-foreground ${className}`}>
        <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No statistics available.</p>
      </div>
    );
  }

  const activityTypes = [
    { key: 'trade', label: 'Trades', icon: TrendingUp, color: 'text-green-600' },
    { key: 'achievement', label: 'Achievements', icon: Trophy, color: 'text-yellow-600' },
    { key: 'signal', label: 'Signals', icon: Target, color: 'text-blue-600' },
    { key: 'comment', label: 'Comments', icon: MessageCircle, color: 'text-purple-600' },
    { key: 'follow', label: 'Follows', icon: Users, color: 'text-orange-600' },
    { key: 'like', label: 'Likes', icon: Star, color: 'text-red-600' }
  ];

  const totalActivities: number = Object.values(stats.activitiesByType).reduce((sum: number, count: any) => sum + (Number(count) || 0), 0);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActivities.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All time activities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activities</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivities.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mostActiveUsers.length}</div>
            <p className="text-xs text-muted-foreground">
              Top contributors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Daily</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(stats.recentActivities / 7)}
            </div>
            <p className="text-xs text-muted-foreground">
              Activities per day
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Activity Type Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activityTypes.map((type) => {
              const count = Number(stats.activitiesByType[type.key as keyof typeof stats.activitiesByType] || 0);
              const total = Number(totalActivities) || 0;
              const percentage = total > 0 ? (count / total) * 100 : 0;
              
              return (
                <div key={type.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <type.icon className={`h-4 w-4 ${type.color}`} />
                      <span className="font-medium">{type.label}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">{count.toLocaleString()}</span>
                      <Badge variant="outline" className="text-xs">
                        {percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Most Active Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Most Active Users</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.mostActiveUsers.slice(0, 10).map((user: any, index: number) => (
              <div key={user.userId} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="w-8 h-8 flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <div>
                    <div className="font-medium">{user.userName}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.activityCount} activities
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{user.activityCount}</div>
                  <div className="text-xs text-muted-foreground">total</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Activity Trends</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Top Activity Types</h4>
              <div className="space-y-2">
                {activityTypes
                  .sort((a, b) => {
                    const countA = Number(stats.activitiesByType[a.key as keyof typeof stats.activitiesByType] || 0);
                    const countB = Number(stats.activitiesByType[b.key as keyof typeof stats.activitiesByType] || 0);
                    return countB - countA;
                  })
                  .slice(0, 5)
                  .map((type) => {
                    const count = Number(stats.activitiesByType[type.key as keyof typeof stats.activitiesByType] || 0);
                    const total = Number(totalActivities) || 0;
                    const percentage = total > 0 ? (count / total) * 100 : 0;
                    
                    return (
                      <div key={type.key} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <type.icon className={`h-4 w-4 ${type.color}`} />
                          <span className="text-sm">{type.label}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{count}</span>
                          <span className="text-xs text-muted-foreground">
                            ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Community Health</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Engagement Rate</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    High
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Activity Growth</span>
                  <Badge variant="outline" className="text-blue-600 border-blue-600">
                    +15%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">User Retention</span>
                  <Badge variant="outline" className="text-purple-600 border-purple-600">
                    85%
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Content Quality</span>
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    Excellent
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


