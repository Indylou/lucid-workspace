import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { formatDistanceToNow } from 'date-fns';
import { Comment } from '../types/todo';
import { useUser } from '../lib/user-context';
import { getComments, createComment, updateComment, deleteComment } from '../features/todos/lib/comment-service';
import { Loader2, ArrowUpRight, MoreVertical, Pencil, Trash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "./ui/use-toast";

interface CommentsDialogProps {
  todoId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentsDialog({ todoId, isOpen, onClose }: CommentsDialogProps) {
  const { user } = useUser();
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [newComment, setNewComment] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [editingComment, setEditingComment] = React.useState<string | null>(null);
  const [editContent, setEditContent] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const fetchComments = React.useCallback(async () => {
    if (!todoId) return;
    
    setLoading(true);
    try {
      const { comments, error } = await getComments(todoId);
      if (error) throw error;
      setComments(comments);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [todoId]);

  React.useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, fetchComments]);

  React.useEffect(() => {
    // Scroll to bottom when new comments are added
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !newComment.trim()) return;

    try {
      const { comment, error } = await createComment(todoId, newComment.trim(), user.id);
      if (error) throw error;
      
      if (comment) {
        setComments(prev => [...prev, comment]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Error creating comment:', error);
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const { comment, error } = await updateComment(commentId, editContent.trim());
      if (error) throw error;
      
      if (comment) {
        setComments(prev => prev.map(c => c.id === commentId ? comment : c));
        setEditingComment(null);
        setEditContent('');
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      toast({
        title: "Error",
        description: "Failed to update comment",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      const { error } = await deleteComment(commentId);
      if (error) throw error;
      
      setComments(prev => prev.filter(c => c.id !== commentId));
      toast({
        title: "Success",
        description: "Comment deleted",
      });
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>
        
        <ScrollArea ref={scrollRef} className="flex-1 pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3 group">
                  <Avatar className="h-8 w-8">
                    {comment.user?.avatar ? (
                      <AvatarImage src={comment.user.avatar} alt={comment.user.name} />
                    ) : (
                      <AvatarFallback>
                        {comment.user?.name?.[0] || '?'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-medium text-sm">
                          {comment.user?.name || 'Unknown User'}
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {comment.createdBy === user?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => startEdit(comment)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(comment.id)}
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    {editingComment === comment.id ? (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[60px]"
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingComment(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleEdit(comment.id)}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm mt-1">{comment.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="min-h-[60px]"
          />
          <Button type="submit" size="icon" disabled={!newComment.trim()}>
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
} 