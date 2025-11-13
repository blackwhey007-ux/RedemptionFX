/**
 * Comment Form Component
 * 
 * Form for creating new comments and replies.
 */

'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Paperclip, X, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CommentFormProps {
  onSubmit: (message: string, attachments: File[]) => void;
  onCancel?: () => void;
  placeholder?: string;
  submitText?: string;
  cancelText?: string;
  className?: string;
}

export function CommentForm({
  onSubmit,
  onCancel,
  placeholder = "Share your thoughts...",
  submitText = "Post",
  cancelText = "Cancel",
  className = ""
}: CommentFormProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSubmit(message.trim(), attachments);
      
      // Reset form
      setMessage('');
      setAttachments([]);
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 5MB.`);
        return false;
      }
      
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert(`File ${file.name} is not supported. Please upload an image.`);
        return false;
      }
      
      return true;
    });
    
    setAttachments(prev => [...prev, ...validFiles]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) {
    return (
      <div className={`text-center py-8 text-muted-foreground ${className}`}>
        <p>Please sign in to post comments.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-3 ${className}`}>
      {/* User Info */}
      <div className="flex items-center space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />
          <AvatarFallback>{getInitials(user.displayName || 'User')}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{user.displayName || 'Anonymous'}</span>
      </div>

      {/* Message Input */}
      <div className="space-y-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={placeholder}
          className="min-h-[80px] resize-none"
          maxLength={1000}
        />
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{message.length}/1000 characters</span>
          <span>Press Ctrl+Enter to submit</span>
        </div>
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Attachments:</div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 bg-muted rounded-md px-3 py-2 text-sm"
              >
                <Paperclip className="h-4 w-4" />
                <span className="truncate max-w-[200px]">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAttachment(index)}
                  className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2"
          >
            <Paperclip className="h-4 w-4" />
            <span>Attach</span>
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
            >
              {cancelText}
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={!message.trim() || isSubmitting}
            className="flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Posting...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>{submitText}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}


