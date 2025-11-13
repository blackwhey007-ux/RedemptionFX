/**
 * Discussion Service
 * 
 * Handles all trade discussion operations including comments, replies, likes, and moderation.
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  Timestamp,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { TradeDiscussion, DiscussionFormData, CommentStatus } from '@/types/community';

// Collection reference
const DISCUSSIONS_COLLECTION = 'trade_discussions';

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Create a new comment
 */
export async function createComment(
  signalId: string, 
  userId: string, 
  userName: string,
  userAvatar: string | undefined,
  formData: DiscussionFormData
): Promise<string> {
  try {
    const commentData: Omit<TradeDiscussion, 'id'> = {
      signalId,
      userId,
      userName,
      userAvatar,
      message: formData.message,
      attachments: [], // Will be populated after file upload
      parentCommentId: formData.parentCommentId,
      replyCount: 0,
      likes: [],
      likeCount: 0,
      status: 'active',
      isEdited: false,
      isDeleted: false,
      reportCount: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, DISCUSSIONS_COLLECTION), commentData);
    
    // Update reply count if this is a reply
    if (formData.parentCommentId) {
      await updateReplyCount(formData.parentCommentId, 1);
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating comment:', error);
    throw new Error('Failed to create comment');
  }
}

/**
 * Get comments for a signal
 */
export async function getComments(
  signalId: string, 
  limitCount: number = 20, 
  lastDoc?: any
): Promise<{ comments: TradeDiscussion[], lastDoc: any }> {
  try {
    let q = query(
      collection(db, DISCUSSIONS_COLLECTION),
      where('signalId', '==', signalId),
      where('status', '==', 'active'),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const comments: TradeDiscussion[] = [];
    let newLastDoc = null;

    snapshot.forEach((doc) => {
      comments.push({
        id: doc.id,
        ...doc.data()
      } as TradeDiscussion);
      newLastDoc = doc;
    });

    return { comments, lastDoc: newLastDoc };
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw new Error('Failed to fetch comments');
  }
}

/**
 * Get replies for a comment
 */
export async function getReplies(
  parentCommentId: string, 
  limitCount: number = 10, 
  lastDoc?: any
): Promise<{ replies: TradeDiscussion[], lastDoc: any }> {
  try {
    let q = query(
      collection(db, DISCUSSIONS_COLLECTION),
      where('parentCommentId', '==', parentCommentId),
      where('status', '==', 'active'),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'asc'),
      limit(limitCount)
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const replies: TradeDiscussion[] = [];
    let newLastDoc = null;

    snapshot.forEach((doc) => {
      replies.push({
        id: doc.id,
        ...doc.data()
      } as TradeDiscussion);
      newLastDoc = doc;
    });

    return { replies, lastDoc: newLastDoc };
  } catch (error) {
    console.error('Error fetching replies:', error);
    throw new Error('Failed to fetch replies');
  }
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string, 
  userId: string, 
  message: string
): Promise<void> {
  try {
    const commentRef = doc(db, DISCUSSIONS_COLLECTION, commentId);
    const commentSnap = await getDoc(commentRef);
    
    if (!commentSnap.exists()) {
      throw new Error('Comment not found');
    }

    const commentData = commentSnap.data();
    if (commentData.userId !== userId) {
      throw new Error('Unauthorized to edit this comment');
    }

    await updateDoc(commentRef, {
      message,
      isEdited: true,
      editedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    throw new Error('Failed to update comment');
  }
}

/**
 * Delete a comment (soft delete)
 */
export async function deleteComment(commentId: string, userId: string): Promise<void> {
  try {
    const commentRef = doc(db, DISCUSSIONS_COLLECTION, commentId);
    const commentSnap = await getDoc(commentRef);
    
    if (!commentSnap.exists()) {
      throw new Error('Comment not found');
    }

    const commentData = commentSnap.data();
    if (commentData.userId !== userId) {
      throw new Error('Unauthorized to delete this comment');
    }

    // Soft delete
    await updateDoc(commentRef, {
      isDeleted: true,
      deletedAt: Timestamp.now(),
      status: 'deleted' as CommentStatus,
      updatedAt: Timestamp.now()
    });

    // Update reply count if this is a reply
    if (commentData.parentCommentId) {
      await updateReplyCount(commentData.parentCommentId, -1);
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw new Error('Failed to delete comment');
  }
}

// ============================================================================
// ENGAGEMENT OPERATIONS
// ============================================================================

/**
 * Like/unlike a comment
 */
export async function toggleCommentLike(commentId: string, userId: string): Promise<boolean> {
  try {
    const commentRef = doc(db, DISCUSSIONS_COLLECTION, commentId);
    const commentSnap = await getDoc(commentRef);
    
    if (!commentSnap.exists()) {
      throw new Error('Comment not found');
    }

    const commentData = commentSnap.data();
    const isLiked = commentData.likes?.includes(userId) || false;

    if (isLiked) {
      // Unlike
      await updateDoc(commentRef, {
        likes: arrayRemove(userId),
        likeCount: increment(-1),
        updatedAt: Timestamp.now()
      });
      return false;
    } else {
      // Like
      await updateDoc(commentRef, {
        likes: arrayUnion(userId),
        likeCount: increment(1),
        updatedAt: Timestamp.now()
      });
      return true;
    }
  } catch (error) {
    console.error('Error toggling comment like:', error);
    throw new Error('Failed to toggle like');
  }
}

/**
 * Report a comment
 */
export async function reportComment(commentId: string, userId: string, reason: string): Promise<void> {
  try {
    const commentRef = doc(db, DISCUSSIONS_COLLECTION, commentId);
    
    await updateDoc(commentRef, {
      reportCount: increment(1),
      updatedAt: Timestamp.now()
    });

    // Create report record (you might want to create a separate reports collection)
    await addDoc(collection(db, 'content_reports'), {
      reporterId: userId,
      targetId: commentId,
      targetType: 'comment',
      reason,
      description: reason,
      status: 'pending',
      createdAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error reporting comment:', error);
    throw new Error('Failed to report comment');
  }
}

// ============================================================================
// MODERATION OPERATIONS
// ============================================================================

/**
 * Moderate a comment (admin only)
 */
export async function moderateComment(
  commentId: string, 
  action: 'hide' | 'delete' | 'restore', 
  moderatorId: string,
  reason?: string
): Promise<void> {
  try {
    const commentRef = doc(db, DISCUSSIONS_COLLECTION, commentId);
    
    const updateData: any = {
      updatedAt: Timestamp.now()
    };

    switch (action) {
      case 'hide':
        updateData.status = 'flagged';
        break;
      case 'delete':
        updateData.status = 'deleted';
        updateData.isDeleted = true;
        updateData.deletedAt = Timestamp.now();
        break;
      case 'restore':
        updateData.status = 'active';
        updateData.isDeleted = false;
        updateData.deletedAt = null;
        break;
    }

    await updateDoc(commentRef, updateData);

    // Log moderation action
    await addDoc(collection(db, 'moderation_actions'), {
      moderatorId,
      targetId: commentId,
      targetType: 'comment',
      action,
      reason,
      createdAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error moderating comment:', error);
    throw new Error('Failed to moderate comment');
  }
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get comment statistics for a signal
 */
export async function getCommentStats(signalId: string): Promise<{
  totalComments: number;
  totalReplies: number;
  totalLikes: number;
  uniqueCommenters: number;
}> {
  try {
    const q = query(
      collection(db, DISCUSSIONS_COLLECTION),
      where('signalId', '==', signalId),
      where('status', '==', 'active'),
      where('isDeleted', '==', false)
    );

    const snapshot = await getDocs(q);
    
    let totalComments = 0;
    let totalReplies = 0;
    let totalLikes = 0;
    const uniqueCommenters = new Set<string>();

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.parentCommentId) {
        totalReplies++;
      } else {
        totalComments++;
      }
      totalLikes += data.likeCount || 0;
      uniqueCommenters.add(data.userId);
    });

    return {
      totalComments,
      totalReplies,
      totalLikes,
      uniqueCommenters: uniqueCommenters.size
    };
  } catch (error) {
    console.error('Error getting comment stats:', error);
    throw new Error('Failed to get comment statistics');
  }
}

/**
 * Get user's comment statistics
 */
export async function getUserCommentStats(userId: string): Promise<{
  totalComments: number;
  totalReplies: number;
  totalLikes: number;
  averageLikesPerComment: number;
}> {
  try {
    const q = query(
      collection(db, DISCUSSIONS_COLLECTION),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      where('isDeleted', '==', false)
    );

    const snapshot = await getDocs(q);
    
    let totalComments = 0;
    let totalReplies = 0;
    let totalLikes = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.parentCommentId) {
        totalReplies++;
      } else {
        totalComments++;
      }
      totalLikes += data.likeCount || 0;
    });

    const totalCommentsAndReplies = totalComments + totalReplies;
    const averageLikesPerComment = totalCommentsAndReplies > 0 ? totalLikes / totalCommentsAndReplies : 0;

    return {
      totalComments,
      totalReplies,
      totalLikes,
      averageLikesPerComment
    };
  } catch (error) {
    console.error('Error getting user comment stats:', error);
    throw new Error('Failed to get user comment statistics');
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Update reply count for a parent comment
 */
async function updateReplyCount(parentCommentId: string, change: number): Promise<void> {
  try {
    const parentRef = doc(db, DISCUSSIONS_COLLECTION, parentCommentId);
    await updateDoc(parentRef, {
      replyCount: increment(change),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating reply count:', error);
    // Don't throw here as it's not critical
  }
}

/**
 * Get recent comments by a user
 */
export async function getUserRecentComments(
  userId: string, 
  limitCount: number = 10
): Promise<TradeDiscussion[]> {
  try {
    const q = query(
      collection(db, DISCUSSIONS_COLLECTION),
      where('userId', '==', userId),
      where('status', '==', 'active'),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const comments: TradeDiscussion[] = [];

    snapshot.forEach((doc) => {
      comments.push({
        id: doc.id,
        ...doc.data()
      } as TradeDiscussion);
    });

    return comments;
  } catch (error) {
    console.error('Error fetching user recent comments:', error);
    throw new Error('Failed to fetch recent comments');
  }
}

/**
 * Search comments by content
 */
export async function searchComments(
  searchTerm: string, 
  signalId?: string, 
  limitCount: number = 20
): Promise<TradeDiscussion[]> {
  try {
    let q = query(
      collection(db, DISCUSSIONS_COLLECTION),
      where('status', '==', 'active'),
      where('isDeleted', '==', false),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    if (signalId) {
      q = query(q, where('signalId', '==', signalId));
    }

    const snapshot = await getDocs(q);
    const comments: TradeDiscussion[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      // Client-side filtering for search (Firestore doesn't support full-text search)
      if (data.message.toLowerCase().includes(searchTerm.toLowerCase())) {
        comments.push({
          id: doc.id,
          ...data
        } as TradeDiscussion);
      }
    });

    return comments;
  } catch (error) {
    console.error('Error searching comments:', error);
    throw new Error('Failed to search comments');
  }
}


