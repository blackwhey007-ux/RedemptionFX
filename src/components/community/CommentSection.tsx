/**
 * Comment Section Component
 * 
 * Displays comments for a signal with ability to add new comments and replies.
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { TradeDiscussion } from '@/types/community';
import { getComments, getReplies, createComment, toggleCommentLike } from '@/lib/services/discussionService';
import { CommentCard } from './CommentCard';
import { CommentForm } from './CommentForm';
import { Button } from '@/components/ui/button';
import { Loader2, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface CommentSectionProps {
  signalId: string;
  className?: string;
}

export function CommentSection({ signalId, className = '' }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<TradeDiscussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [showReplyForms, setShowReplyForms] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Load initial comments
  useEffect(() => {
    loadComments();
  }, [signalId]);

  const loadComments = async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const { comments: newComments, lastDoc: newLastDoc } = await getComments(
        signalId,
        10,
        loadMore ? lastDoc : undefined
      );

      if (loadMore) {
        setComments(prev => [...prev, ...newComments]);
      } else {
        setComments(newComments);
      }

      setLastDoc(newLastDoc);
      setHasMore(newComments.length === 10);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleAddComment = async (message: string, attachments: File[]) => {
    if (!user) return;

    try {
      const commentId = await createComment(
        signalId,
        user.uid,
        user.displayName || 'Unknown User',
        user.photoURL,
        {
          message,
          attachments,
          parentCommentId: replyingTo || undefined
        }
      );

      // Refresh comments
      await loadComments();
      
      // Clear reply form
      if (replyingTo) {
        setReplyingTo(null);
        setShowReplyForms(prev => {
          const newSet = new Set(prev);
          newSet.delete(replyingTo);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!user) return;

    try {
      const isLiked = await toggleCommentLike(commentId, user.uid);
      
      // Update local state
      setComments(prev => prev.map(comment => {
        if (comment.id === commentId) {
          const newLikes = isLiked 
            ? [...comment.likes, user.uid]
            : comment.likes.filter(id => id !== user.uid);
          
          return {
            ...comment,
            likes: newLikes,
            likeCount: isLiked ? comment.likeCount + 1 : comment.likeCount - 1
          };
        }
        return comment;
      }));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleReply = (commentId: string) => {
    setReplyingTo(commentId);
    setShowReplyForms(prev => new Set(prev).add(commentId));
  };

  const handleCancelReply = () => {
    if (replyingTo) {
      setShowReplyForms(prev => {
        const newSet = new Set(prev);
        newSet.delete(replyingTo);
        return newSet;
      });
    }
    setReplyingTo(null);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading comments...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Comment Form */}
      {user && (
        <div className="bg-card rounded-lg border p-4">
          <CommentForm
            onSubmit={handleAddComment}
            placeholder="Share your thoughts on this signal..."
            submitText="Post Comment"
          />
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="space-y-2">
              <CommentCard
                comment={comment}
                onLike={() => handleLike(comment.id!)}
                onReply={() => handleReply(comment.id!)}
                isLiked={user ? comment.likes.includes(user.uid) : false}
                showReplyForm={showReplyForms.has(comment.id!)}
                onAddReply={handleAddComment}
                onCancelReply={handleCancelReply}
                replyingTo={replyingTo === comment.id!}
                currentUser={user}
              />
            </div>
          ))
        )}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => loadComments(true)}
            disabled={loadingMore}
            className="w-full"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading more...
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Load More Comments
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}


