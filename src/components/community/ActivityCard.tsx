/**
 * Activity Card Component
 * 
 * Displays an individual activity item with actions and metadata.
 */

'use client';

import { useState } from 'react';
import { ActivityFeedItem, ActivityType } from '@/types/community';
import { toggleActivityLike } from '@/lib/services/activityService';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  MessageCircle, 
  TrendingUp, 
  TrendingDown,
  Trophy,
  Target,
  DollarSign,
  Star,
  User,
  Activity,
  Clock,
  ExternalLink
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityCardProps {
  activity: ActivityFeedItem;
  currentUser: any;
  onLike?: (activityId: string) => void;
  onComment?: (activityId: string) => void;
  onShare?: (activityId: string) => void;
}

export function ActivityCard({
  activity,
  currentUser,
  onLike,
  onComment,
  onShare
}: ActivityCardProps) {
  const [isLiked, setIsLiked] = useState(
    currentUser ? activity.likes.includes(currentUser.uid) : false
  );
  const [likeCount, setLikeCount] = useState(activity.likeCount);
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    if (!currentUser || isLiking) return;

    try {
      setIsLiking(true);
      const newIsLiked = await toggleActivityLike(activity.id!, currentUser.uid);
      setIsLiked(newIsLiked);
      setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);
      
      if (onLike) {
        onLike(activity.id!);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'trade':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'achievement':
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 'signal':
        return <Target className="h-5 w-5 text-blue-500" />;
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-purple-500" />;
      case 'follow':
        return <User className="h-5 w-5 text-orange-500" />;
      case 'like':
        return <Heart className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'trade':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'achievement':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'signal':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'comment':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'follow':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'like':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTimeAgo = (timestamp: any) => {
    try {
      return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const renderActivityContent = () => {
    switch (activity.type) {
      case 'trade':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Badge className={getActivityColor('trade')}>
                {activity.data.result === 'WIN' ? 'WIN' : activity.data.result === 'LOSS' ? 'LOSS' : 'CLOSE'}
              </Badge>
              <span className="font-medium">{activity.data.pair}</span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4" />
                <span>{activity.data.pips} pips</span>
              </span>
              {activity.data.profit && (
                <span className="flex items-center space-x-1">
                  <DollarSign className="h-4 w-4" />
                  <span>${activity.data.profit}</span>
                </span>
              )}
            </div>
          </div>
        );

      case 'achievement':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span className="font-medium">{activity.data.achievementName}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              Achievement Unlocked
            </Badge>
          </div>
        );

      case 'signal':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Badge className={getActivityColor('signal')}>
                {activity.data.type}
              </Badge>
              <span className="font-medium">{activity.data.pair}</span>
            </div>
            {activity.data.category && (
              <Badge variant="outline" className="text-xs">
                {activity.data.category}
              </Badge>
            )}
          </div>
        );

      case 'comment':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm">Commented on signal</span>
            </div>
            <div className="text-sm bg-muted p-2 rounded-md">
              "{activity.data.commentText?.substring(0, 100)}..."
            </div>
          </div>
        );

      case 'follow':
        return (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span className="text-sm">
                {activity.data.action === 'followed' ? 'Started following' : 'Unfollowed'} a trader
              </span>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-muted-foreground">
            {activity.description}
          </div>
        );
    }
  };

  return (
    <div className="bg-card rounded-lg border p-4 space-y-3">
      {/* Activity Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={activity.userAvatar} alt={activity.userName} />
            <AvatarFallback>{getInitials(activity.userName)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium">{activity.userName}</span>
              <Badge variant="outline" className={`text-xs ${getActivityColor(activity.type)}`}>
                {activity.type}
              </Badge>
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{getTimeAgo(activity.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {getActivityIcon(activity.type)}
        </div>
      </div>

      {/* Activity Content */}
      <div className="ml-13">
        {renderActivityContent()}
      </div>

      {/* Activity Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center space-x-1 ${
              isLiked ? 'text-red-600' : 'text-muted-foreground'
            }`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            <span>{likeCount}</span>
          </Button>

          {onComment && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onComment(activity.id!)}
              className="flex items-center space-x-1 text-muted-foreground"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Comment</span>
            </Button>
          )}

          {onShare && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onShare(activity.id!)}
              className="flex items-center space-x-1 text-muted-foreground"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Share</span>
            </Button>
          )}
        </div>

        {/* Activity Metadata */}
        <div className="text-xs text-muted-foreground">
          {activity.commentCount > 0 && (
            <span>{activity.commentCount} comments</span>
          )}
        </div>
      </div>
    </div>
  );
}


