import React, { useState, useEffect, useRef, Component } from 'react';
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
  Image,
  Link,
  Table,
  CheckSquare,
  Loader2,
  ListTodo
} from 'lucide-react';
import { EnhancedRichTextEditor } from './tiptap/enhanced-rich-text-editor';
import '../pages/DocumentEditor.css';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../App';
import { toast } from './ui/use-toast';
import { supabase, Document as SupabaseDocument } from '../lib/supabase';
import { initTodoSync, findTodos, syncTodosWithDatabase } from '../features/todos/lib/todo-extensions';
import { checkTablePermissions } from '../lib/rls-test';
import { getCurrentSession } from '../lib/auth-service';
import { createDocument, updateDocument } from '../lib/document-service';
import { useUser } from '../lib/user-context';

// Extend the Document type to include optional properties that may not exist in the database
interface DocumentWithFavorite extends SupabaseDocument {
  // These fields may not exist in the database but are used in the UI
  favorite?: boolean;
  status?: string;
  created_by?: string;
}

interface DocumentEditorProps {
  documentId: string;
}

// Add ErrorBoundary component
class EditorErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Editor error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-500">
          <h3>Something went wrong with the editor.</h3>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded"
          >
            Reload page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
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
  const cleanupRef = useRef<(() => void) | null>(null);

  // Update document title in browser tab when title changes
  useEffect(() => {
    if (title) {
      // Update the document title in the browser tab
      document.title = `${title} - Lucid`;
    } else {
      document.title = 'Untitled Document - Lucid';
    }
  }, [title]);

  // Auto-save after 5 seconds of inactivity
  useEffect(() => {
    if (pendingChanges && activeDocument) {
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set a new timeout for auto-save
      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
        setPendingChanges(false);
      }, 5000); // 5 seconds delay
    }
    
    return () => {
      // Clean up the timeout when the component unmounts
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [pendingChanges, content, title]);

  // Fetch document data when component mounts
  useEffect(() => {
    const fetchDocument = async () => {
      setLoading(true);
      
      try {
        if (documentId === 'new') {
          // Set up new empty document
          setActiveDocument({
            id: 'new',
            title: 'Untitled Document',
            content: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: user?.id || ''
            // These fields don't exist in the database schema
          });
          
          setTitle('Untitled Document');
          setContent('');
          setLoading(false);
          return;
        }
        
        // Fetch existing document
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .single();
          
        if (error) {
          throw error;
        }
        
        // Ensure consistent interface properties even if they don't exist in the database
        const documentWithDefaults = {
          ...data,
          favorite: data.favorite || false, // Default to false if not in database
          status: data.status || 'Draft',   // Default to 'Draft' if not in database
        };
        
        setActiveDocument(documentWithDefaults);
        setTitle(data.title);
        setContent(data.content);
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

  // Handle editor ready
  const handleEditorReady = (editorInstance: any) => {
    setEditor(editorInstance);
  };

  // Initialize todo sync when editor and user are available
  useEffect(() => {
    let isMounted = true;

    const setupTodoSync = async () => {
      if (!editor || !user?.id || !isMounted) return;

      try {
        console.log('[DocumentEditor] Setting up todo sync with user ID:', user.id);
        
        // Clean up previous sync if it exists
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }

        // Initialize new sync
        const cleanup = initTodoSync(editor, user.id);
        if (isMounted) {
          cleanupRef.current = cleanup || null;
        }
      } catch (error) {
        console.error('[DocumentEditor] Error setting up todo sync:', error);
        if (isMounted) {
          toast({
            title: 'Warning',
            description: 'There was an issue setting up todo synchronization.'
          });
        }
      }
    };

    void setupTodoSync();

    return () => {
      isMounted = false;
      if (cleanupRef.current) {
        try {
          console.log('[DocumentEditor] Cleaning up todo sync');
          cleanupRef.current();
          cleanupRef.current = null;
        } catch (error) {
          console.error('[DocumentEditor] Error during cleanup:', error);
        }
      }
    };
  }, [editor, user?.id]);

  // Force sync todos before unloading
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (editor && user?.id) {
        console.log('[DocumentEditor] Force syncing todos before unload');
        syncTodosWithDatabase(editor, user.id);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [editor, user?.id]);

  // Handle saving the document
  const handleSave = async () => {
    if (!activeDocument) return;

    if (!activeDocument.title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your document."
      });
      return;
    }

    // Make sure content is not an empty string and doesn't contain empty text nodes
    if (!content.trim()) {
      toast({
        title: "Content Required",
        description: "Please add some content to your document."
      });
      return;
    }

    setSaving(true);

    try {
      // Force sync todos before saving
      if (editor && user?.id) {
        await syncTodosWithDatabase(editor, user.id);
      }
      
      // Prepare the content - ensure no empty text nodes
      let safeContent = content;
      
      // If the editor is available, get sanitized content
      if (editor) {
        try {
          // Force a re-parse of content to validate it
          const validContent = editor.getHTML();
          safeContent = validContent;
        } catch (err) {
          console.error('Error sanitizing content:', err);
          toast({
            title: "Content Error",
            description: "There was an issue with the document content. Please try again."
          });
          setSaving(false);
          return;
        }
      }

      if (documentId === 'new') {
        // Create new document
        const { document: createdDocument, error } = await createDocument({
          title: activeDocument.title,
          content: safeContent,
          projectId: activeDocument.project_id
        });

        if (error) {
          console.error('Error creating document:', error);
          toast({
            title: "Failed to create document",
            description: error
          });
          return;
        }

        if (createdDocument) {
          // Update active document with the new document data
          setActiveDocument({
            ...activeDocument,
            id: createdDocument.id,
            created_at: createdDocument.created_at,
            updated_at: createdDocument.updated_at
          });
          
          // Navigate to the created document URL
          navigate(`/documents/${createdDocument.id}`, { replace: true });
          
          toast({
            title: "Document Created",
            description: "Your document has been created successfully."
          });
        }
      } else {
        // Update existing document
        const { document: updatedDocument, error } = await updateDocument(documentId, {
          title: activeDocument.title,
          content: safeContent,
          projectId: activeDocument.project_id
        });

        if (error) {
          console.error('Error updating document:', error);
          toast({
            title: "Failed to update document",
            description: error
          });
          return;
        }

        if (updatedDocument) {
          // Update active document with the latest data
          setActiveDocument({
            ...activeDocument,
            ...updatedDocument
          });
          
          toast({
            title: "Document Updated",
            description: "Your document has been saved successfully."
          });
        }
      }
    } catch (err) {
      console.error('Error saving document:', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred while saving the document."
      });
    } finally {
      setSaving(false);
    }
  };

  // Toggle favorite status
  const toggleFavorite = () => {
    if (activeDocument) {
      setActiveDocument({
        ...activeDocument,
        favorite: !activeDocument.favorite
      });
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true });
  };

  // Format toolbar handlers
  const handleBold = () => {
    editor?.chain().focus().toggleBold().run();
  };

  const handleItalic = () => {
    editor?.chain().focus().toggleItalic().run();
  };

  const handleHeading1 = () => {
    editor?.chain().focus().toggleHeading({ level: 1 }).run();
  };

  const handleHeading2 = () => {
    editor?.chain().focus().toggleHeading({ level: 2 }).run();
  };

  const handleHeading3 = () => {
    editor?.chain().focus().toggleHeading({ level: 3 }).run();
  };

  const handleBulletList = () => {
    editor?.chain().focus().toggleBulletList().run();
  };

  const handleOrderedList = () => {
    editor?.chain().focus().toggleOrderedList().run();
  };

  const handleTodoList = () => {
    editor?.chain().focus().addTodo().run();
  };

  const handleBlockquote = () => {
    editor?.chain().focus().toggleBlockquote().run();
  };

  const handleCodeBlock = () => {
    editor?.chain().focus().toggleCodeBlock().run();
  };

  const handleInsertTodo = () => {
    if (editor) {
      editor.chain()
        .focus()
        .addTodo()
        .run();
      
      // After creating the todo, ensure focus remains in the editor
      editor.commands.focus();
    }
  };

  const handleUndo = () => {
    editor?.chain().focus().undo().run();
  };

  const handleRedo = () => {
    editor?.chain().focus().redo().run();
  };

  // Function to handle content changes
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setPendingChanges(true);
  };

  // Function to handle title changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    // Mark as having pending changes that need to be saved
    setPendingChanges(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      editor?.chain().focus().addTodo().run();
    }
  };

  const handleTodoClick = () => {
    editor?.chain().focus().addTodo().run();
  };

  const handleAddTodo = () => {
    editor?.chain().focus().addTodo().run();
  };

  const handleToggleTodo = () => {
    editor?.chain().focus().toggleTodo().run();
  };

  if (loading) return (
    <div className="document-editor flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="document-editor">
      {/* Note header */}
      <div className="document-header">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/documents')}
            className="mr-2 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              className="outline-none text-lg font-medium bg-transparent border-none focus:ring-0 document-title"
              placeholder="Untitled Document"
            />
            <div className="text-sm text-muted-foreground flex gap-2">
              {activeDocument ? (
                <>
                  {activeDocument.updated_at && (
                    <span>
                      Last edited {formatDate(new Date(activeDocument.updated_at))}
                    </span>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleSave}
            disabled={saving}
            className="text-sm"
          >
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>
      
      {/* Document formatting toolbar */}
      <div className="format-toolbar-container">
        <div className="format-toolbar">
          <div className="toolbar-button-group">
            <Button 
              variant="ghost" 
              size="icon" 
              className={`format-button ${editor?.isActive('bold') ? 'active' : ''}`}
              onClick={handleBold}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`format-button ${editor?.isActive('italic') ? 'active' : ''}`}
              onClick={handleItalic}
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
              onClick={handleHeading1}
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`format-button ${editor?.isActive('heading', { level: 2 }) ? 'active' : ''}`}
              onClick={handleHeading2}
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`format-button ${editor?.isActive('heading', { level: 3 }) ? 'active' : ''}`}
              onClick={handleHeading3}
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
              onClick={handleBulletList}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`format-button ${editor?.isActive('orderedList') ? 'active' : ''}`} 
              onClick={handleOrderedList}
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`format-button ${editor?.isActive('todo') ? 'active' : ''}`}
              onClick={handleTodoClick}
              title="Add Todo"
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
              onClick={handleBlockquote}
            >
              <Quote className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`format-button ${editor?.isActive('code') ? 'active' : ''}`} 
              onClick={handleCodeBlock}
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
              onClick={handleUndo}
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="format-button" 
              onClick={handleRedo}
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Editor content area */}
      <div className="editor-content-container h-[calc(100vh-120px)]">
        <div className="editor-content">
          <EditorErrorBoundary>
            <EnhancedRichTextEditor
              key={documentId} // Add key to force remount when document changes
              value={content}
              onChange={handleContentChange}
              onEditorReady={handleEditorReady}
              enableTodos={true}
              showToolbar={false}
              onKeyDown={handleKeyDown}
            />
          </EditorErrorBoundary>
        </div>
      </div>
    </div>
  );
};