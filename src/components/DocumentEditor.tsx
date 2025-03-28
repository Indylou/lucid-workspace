import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3,
  Quote, 
  Undo, 
  Redo, 
  ArrowLeft,
  Save,
  Loader2,
  ListTodo,
  Star,
  StarOff,
  Trash,
  Clock
} from 'lucide-react';
import { EnhancedRichTextEditor } from './tiptap/enhanced-rich-text-editor';
import '../pages/DocumentEditor.css';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../App';
import { toast } from './ui/use-toast';
import { supabase, Document as SupabaseDocument } from '../lib/supabase';
import { initTodoSync, syncTodosWithDatabase } from '../features/todos/lib/todo-extensions';
import { createDocument, updateDocument } from '../lib/document-service';
import { Badge } from './ui/badge';

// Extend the Document type to include optional properties that may not exist in the database
interface DocumentWithFavorite extends SupabaseDocument {
  // These fields may not exist in the database but are used in the UI
  favorite?: boolean;
  status?: string;
}

interface DocumentEditorProps {
  documentId: string;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({ documentId }) => {
  const navigate = useNavigate();
  const [activeDocument, setActiveDocument] = useState<DocumentWithFavorite | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const { user } = useAuth();
  const [editor, setEditor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle saving the document
  const handleSave = useCallback(async (isAutoSave = false) => {
    if (!activeDocument || !user) return;
    
    setSaving(true);
    try {
      const documentData = {
        title,
        content,
        projectId: activeDocument.project_id
      };

      if (documentId === 'new') {
        const { document: newDoc, error } = await createDocument(documentData);
        
        if (error) throw new Error(error);
        
        if (newDoc) {
          setActiveDocument({
            ...newDoc,
            favorite: false,
            status: 'Draft'
          });
          navigate(`/documents/${newDoc.id}`, { replace: true });
          
          if (!isAutoSave) {
            toast({
              title: 'Success',
              description: 'Document created successfully'
            });
          }
        }
      } else {
        const { document: updatedDoc, error } = await updateDocument(documentId, documentData);
        if (error) throw new Error(error);
        
        if (updatedDoc) {
          setActiveDocument({
            ...activeDocument,
            ...updatedDoc
          });
          
          if (!isAutoSave) {
            toast({
              title: 'Success',
              description: 'Document saved successfully'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error saving document:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save document'
      });
    } finally {
      setSaving(false);
      setPendingChanges(false);
    }
  }, [activeDocument, content, documentId, navigate, title, user]);

  // Auto-save after 5 seconds of inactivity
  useEffect(() => {
    if (pendingChanges && activeDocument) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        handleSave(true);
      }, 5000);
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [pendingChanges, activeDocument, handleSave]);

  // Fetch document data
  useEffect(() => {
    const fetchDocument = async () => {
      setLoading(true);
      
      try {
        if (documentId === 'new') {
          const defaultTitle = 'Untitled Document';
          const defaultContent = '<h1>Untitled Document</h1><p></p>';
          
          setActiveDocument({
            id: 'new',
            title: defaultTitle,
            content: defaultContent,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: user?.id || '',
            favorite: false,
            status: 'Draft'
          });
          
          setTitle(defaultTitle);
          setContent(defaultContent);
          return;
        }
        
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .single();
          
        if (error) throw error;
        
        const documentTitle = data.title || 'Untitled Document';
        
        const documentWithDefaults = {
          ...data,
          title: documentTitle,
          favorite: data.favorite || false,
          status: data.status || 'Draft',
        };
        
        setActiveDocument(documentWithDefaults);
        setTitle(documentTitle);
        setContent(data.content || '');
      } catch (err) {
        console.error('Error fetching document:', err);
        toast({
          title: 'Error',
          description: 'Failed to load document'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocument();
  }, [documentId, user?.id]);

  // Initialize todo sync
  useEffect(() => {
    if (!editor || !user?.id) return;

    const cleanup = initTodoSync(editor, user.id);
    return () => {
      if (cleanup) cleanup();
      syncTodosWithDatabase(editor, user.id);
    };
  }, [editor, user?.id]);

  // Handle content changes
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setPendingChanges(true);
  }, []);

  // Handle title changes
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setPendingChanges(true);
  }, []);

  // Toggle favorite status
  const handleToggleFavorite = useCallback(async () => {
    if (!activeDocument || !user) return;

    try {
      const newFavorite = !activeDocument.favorite;
      const { error } = await supabase
        .from('documents')
        .update({ favorite: newFavorite })
        .eq('id', activeDocument.id);

      if (error) throw error;

      setActiveDocument(prev => prev ? {
        ...prev,
        favorite: newFavorite
      } : null);

      toast({
        title: newFavorite ? 'Added to favorites' : 'Removed from favorites',
        description: `Document ${newFavorite ? 'added to' : 'removed from'} favorites`
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorite status'
      });
    }
  }, [activeDocument, user]);

  // Handle document deletion
  const handleDelete = useCallback(async () => {
    if (!activeDocument || !user) return;

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', activeDocument.id);

      if (error) throw error;

      toast({
        title: 'Document deleted',
        description: 'Document has been permanently deleted'
      });

      navigate('/documents');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document'
      });
    }
  }, [activeDocument, user, navigate]);

  if (loading) {
    return (
      <div className="document-editor flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="document-editor">
      {/* Document header */}
      <div className="document-header">
        <div className="flex items-center gap-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/documents')}
            className="rounded-md"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              className="document-title-input"
              placeholder="Untitled Document"
            />
            <div className="document-header-meta">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {activeDocument?.updated_at && 
                  formatDistanceToNow(new Date(activeDocument.updated_at), { addSuffix: true })}
              </div>
              {activeDocument?.status && (
                <Badge variant="secondary">
                  {activeDocument.status}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="header-actions">
          <Button 
            variant="ghost"
            onClick={handleToggleFavorite}
            className="gap-2"
          >
            {activeDocument?.favorite ? (
              <StarOff className="h-4 w-4" />
            ) : (
              <Star className="h-4 w-4" />
            )}
            {activeDocument?.favorite ? "Unfavorite" : "Favorite"}
          </Button>
          <Button 
            variant={pendingChanges ? "default" : "ghost"}
            onClick={() => handleSave()}
            disabled={saving}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {pendingChanges ? "Save changes" : "Save"}
          </Button>
          <Button 
            variant="ghost"
            onClick={handleDelete}
            className="text-destructive gap-2"
          >
            <Trash className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Formatting toolbar */}
      <div className="format-toolbar-container">
        <div className="format-toolbar">
          <div className="toolbar-button-group">
            <Button 
              variant="ghost" 
              size="icon" 
              className={`format-button ${editor?.isActive('bold') ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`format-button ${editor?.isActive('italic') ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mx-1 h-6 w-px bg-border" />
          
          <div className="toolbar-button-group">
            <Button 
              variant="ghost" 
              size="icon" 
              className={`format-button ${editor?.isActive('heading', { level: 1 }) ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`format-button ${editor?.isActive('heading', { level: 2 }) ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`format-button ${editor?.isActive('heading', { level: 3 }) ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            >
              <Heading3 className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mx-1 h-6 w-px bg-border" />
          
          <div className="toolbar-button-group">
            <Button 
              variant="ghost" 
              size="icon" 
              className={`format-button ${editor?.isActive('bulletList') ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`format-button ${editor?.isActive('orderedList') ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`format-button ${editor?.isActive('taskList') ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleTaskList().run()}
            >
              <ListTodo className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mx-1 h-6 w-px bg-border" />
          
          <div className="toolbar-button-group">
            <Button 
              variant="ghost" 
              size="icon" 
              className={`format-button ${editor?.isActive('blockquote') ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            >
              <Quote className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`format-button ${editor?.isActive('codeBlock') ? 'active' : ''}`}
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            >
              <Code className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mx-1 h-6 w-px bg-border" />
          
          <div className="toolbar-button-group">
            <Button 
              variant="ghost" 
              size="icon" 
              className="format-button"
              onClick={() => editor?.chain().focus().undo().run()}
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="format-button"
              onClick={() => editor?.chain().focus().redo().run()}
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Editor content */}
      <div className="editor-content-container">
        <div className="editor-content">
          <EnhancedRichTextEditor
            key={documentId}
            value={content}
            onChange={handleContentChange}
            onEditorReady={setEditor}
            enableTodos={true}
            showToolbar={false}
            placeholder="Start writing..."
          />
        </div>
      </div>
    </div>
  );
};