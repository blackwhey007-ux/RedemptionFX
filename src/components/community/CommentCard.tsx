/**
 * Comment Card Component
 * 
 * Displays an individual comment with actions like like, reply, edit, delete.
 */

'use client';

import { useState, useEffect } from 'react';
import { TradeDiscussion } from '@/types/community';
import { CommentForm } from './CommentForm';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  MessageCircle, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Flag,
  Reply,
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

interface CommentCardProps {
  comment: TradeDiscussion;
  onLike: () => void;
  onReply: () => void;
  onEdit?: (commentId: string, newMessage: string) => void;
  onDelete?: (commentId: string) => void;
  onReport?: (commentId: string, reason: string) => void;
  isLiked: boolean;
  showReplyForm: boolean;
  onAddReply: (message: string, attachments: File[]) => void;
  onCancelReply: () => void;
  replyingTo: boolean;
  currentUser: any;
}

export function CommentCard({
  comment,
  onLike,
  onReply,
  onEdit,
  onDelete,
  onReport,
  isLiked,
  showReplyForm,
  onAddReply,
  onCancelReply,
  replyingTo,
  currentUser
}: CommentCardProps) {
  const [showEditForm, setShowEditForm] = useState(false);
  const [editMessage, setEditMessage] = useState(comment.message);
  const [isEditing, setIsEditing] = useState(false);

  const isOwner = currentUser?.uid === comment.userId;
  const canEdit = isOwner && !comment.isDeleted;
  const canDelete = isOwner && !comment.isDeleted;

  const handleEdit = async () => {
    if (!onEdit || !editMessage.trim()) return;

    try {
      setIsEditing(true);
      await onEdit(comment.id!, editMessage.trim());
      setShowEditForm(false);
    } catch (error) {
      console.error('Error editing comment:', error);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      await onDelete(comment.id!);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleReport = async () => {
    if (!onReport) return;

    const reason = prompt('Please provide a reason for reporting this comment:');
    if (reason && reason.trim()) {
      try {
        await onReport(comment.id!, reason.trim());
      } catch (error) {
        console.error('Error reporting comment:', error);
      }
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

  return (
    <div className="bg-card rounded-lg border p-4 space-y-3">
      {/* Comment Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.userAvatar} alt={comment.userName} />
            <AvatarFallback>{getInitials(comment.userName)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-sm">{comment.userName}</span>
              {comment.isEdited && (
                <Badge variant="secondary" className="text-xs">
                  <Edit className="h-3 w-3 mr-1" />
                  Edited
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{getTimeAgo(comment.createdAt)}</span>
              {comment.isEdited && comment.editedAt && (
                <>
                  <span>•</span>
                  <span>edited {getTimeAgo(comment.editedAt)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Comment Actions Menu */}
        {!comment.isDeleted && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem onClick={() => setShowEditForm(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
              {!isOwner && onReport && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleReport}
                    className="text-destructive"
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Comment Content */}
      {comment.isDeleted ? (
        <div className="text-muted-foreground italic text-sm">
          This comment has been deleted.
        </div>
      ) : showEditForm ? (
        <div className="space-y-2">
          <textarea
            value={editMessage}
            onChange={(e) => setEditMessage(e.target.value)}
            className="w-full p-2 border rounded-md resize-none"
            rows={3}
            placeholder="Edit your comment..."
          />
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={handleEdit}
              disabled={isEditing || !editMessage.trim()}
            >
              {isEditing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowEditForm(false);
                setEditMessage(comment.message);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-sm">
          {comment.message.split('\n').map((line, index) => (
            <p key={index} className={index > 0 ? 'mt-1' : ''}>
              {line}
            </p>
          ))}
        </div>
      )}

      {/* Attachments */}
      {comment.attachments && comment.attachments.length > 0 && (
        <div className="space-y-2">
          {comment.attachments.map((attachment, index) => (
            <div key={index} className="border rounded-md p-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  Attachment {index + 1}
                </span>
                <a
                  href={attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  View
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment Actions */}
      {!comment.isDeleted && (
        <div className="flex items-center space-x-4 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLike}
            className={`flex items-center space-x-1 ${
              isLiked ? 'text-red-600' : 'text-muted-foreground'
            }`}
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
            <span>{comment.likeCount}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onReply}
            className="flex items-center space-x-1 text-muted-foreground"
          >
            <Reply className="h-4 w-4" />
            <span>Reply</span>
          </Button>

          {comment.replyCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
            </span>
          )}
        </div>
      )}

      {/* Reply Form */}
      {showReplyForm && replyingTo && (
        <div className="ml-8 border-l-2 border-muted pl-4">
          <CommentForm
            onSubmit={onAddReply}
            onCancel={onCancelReply}
            placeholder={`Reply to ${comment.userName}...`}
            submitText="Reply"
            cancelText="Cancel"
          />
        </div>
      )}
    </div>
  );
}


