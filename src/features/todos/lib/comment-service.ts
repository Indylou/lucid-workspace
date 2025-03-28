import { supabase } from '../../../lib/supabase';
import { Comment } from '../../../types/todo';
import { handleSupabaseError, AppError, ErrorType } from '../../../lib/error-handling';

export async function getComments(todoId: string): Promise<{ comments: Comment[], error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:created_by (
          name,
          avatar_url
        )
      `)
      .eq('todo_id', todoId)
      .order('created_at', { ascending: true });

    if (error) {
      return { comments: [], error: handleSupabaseError(error) };
    }

    const comments = data.map(comment => ({
      id: comment.id,
      todoId: comment.todo_id,
      content: comment.content,
      createdBy: comment.created_by,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      user: comment.user ? {
        name: comment.user.name,
        avatar: comment.user.avatar_url
      } : undefined
    }));

    return { comments, error: null };
  } catch (err) {
    return {
      comments: [],
      error: {
        type: ErrorType.DATA_FETCH,
        message: 'Failed to fetch comments',
        originalError: err as Error
      }
    };
  }
}

export async function createComment(
  todoId: string,
  content: string,
  userId: string
): Promise<{ comment: Comment | null, error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        todo_id: todoId,
        content,
        created_by: userId
      })
      .select(`
        *,
        user:created_by (
          name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      return { comment: null, error: handleSupabaseError(error) };
    }

    const comment: Comment = {
      id: data.id,
      todoId: data.todo_id,
      content: data.content,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      user: data.user ? {
        name: data.user.name,
        avatar: data.user.avatar_url
      } : undefined
    };

    return { comment, error: null };
  } catch (err) {
    return {
      comment: null,
      error: {
        type: ErrorType.DATA_CREATE,
        message: 'Failed to create comment',
        originalError: err as Error
      }
    };
  }
}

export async function updateComment(
  commentId: string,
  content: string
): Promise<{ comment: Comment | null, error: AppError | null }> {
  try {
    const { data, error } = await supabase
      .from('comments')
      .update({ content })
      .eq('id', commentId)
      .select(`
        *,
        user:created_by (
          name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      return { comment: null, error: handleSupabaseError(error) };
    }

    const comment: Comment = {
      id: data.id,
      todoId: data.todo_id,
      content: data.content,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      user: data.user ? {
        name: data.user.name,
        avatar: data.user.avatar_url
      } : undefined
    };

    return { comment, error: null };
  } catch (err) {
    return {
      comment: null,
      error: {
        type: ErrorType.DATA_UPDATE,
        message: 'Failed to update comment',
        originalError: err as Error
      }
    };
  }
}

export async function deleteComment(commentId: string): Promise<{ error: AppError | null }> {
  try {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      return { error: handleSupabaseError(error) };
    }

    return { error: null };
  } catch (err) {
    return {
      error: {
        type: ErrorType.DATA_DELETE,
        message: 'Failed to delete comment',
        originalError: err as Error
      }
    };
  }
} 