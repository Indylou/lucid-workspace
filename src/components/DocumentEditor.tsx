import React, { useState, useEffect, useRef, Component, useCallback } from 'react';
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
  ListTodo
} from 'lucide-react';
import { EnhancedRichTextEditor } from './tiptap/enhanced-rich-text-editor';
import '../pages/DocumentEditor.css';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../App';
import { toast } from './ui/use-toast';
import { supabase, Document as SupabaseDocument } from '../lib/supabase';
import { initTodoSync, syncTodosWithDatabase } from '../features/todos/lib/todo-extensions';
import { createDocument, updateDocument } from '../lib/document-service';

// Extend the Document type to include optional properties that may not exist in the database
interface DocumentWithFavorite extends SupabaseDocument {
  // These fields may not exist in the database but are used in the UI
  favorite?: boolean;
  status?: string;
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

  // Handle saving the document
  const handleSave = useCallback(async (isAutoSave = false) => {
    if (!activeDocument || !user) return;
    
    console.log('Saving document with title:', title);
    console.log('Current document state:', activeDocument);
    
    setSaving(true);
    try {
      const documentData = {
        title,
        content,
        projectId: activeDocument.project_id
      };
      
      console.log('Sending document data to server:', documentData);

      if (documentId === 'new') {
        const { document: newDoc, error } = await createDocument(documentData);
        
        if (error) {
          throw new Error(error);
        }
        
        if (newDoc) {
          console.log('New document created:', newDoc);
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
        if (error) {
          throw new Error(error);
        }
        
        if (updatedDoc) {
          console.log('Document updated:', updatedDoc);
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
    }
  }, [activeDocument, content, documentId, navigate, title, user]);

  // Update document title in browser tab when title changes
  useEffect(() => {
    if (title) {
      document.title = `${title} - Lucid`;
    } else {
      document.title = 'Untitled Document - Lucid';
    }
  }, [title]);

  // Auto-save after 5 seconds of inactivity
  useEffect(() => {
    if (pendingChanges && activeDocument) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        handleSave(true); // Pass true to indicate this is an auto-save
        setPendingChanges(false);
      }, 5000); // 5 seconds delay for auto-save
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [pendingChanges, content, title, activeDocument, handleSave]);

  // Fetch document data when component mounts
  useEffect(() => {
    const fetchDocument = async () => {
      setLoading(true);
      
      try {
        if (documentId === 'new') {
          // Set up new empty document
          console.log('Setting up new document');
          
          // For new documents, use a default title and empty content
          const defaultTitle = 'Untitled Document';
          const defaultContent = '<h1>Untitled Document</h1><p></p>';
          
          setActiveDocument({
            id: 'new',
            title: defaultTitle,
            content: defaultContent,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            created_by: user?.id || ''
          });
          
          setTitle(defaultTitle);
          setContent(defaultContent);
          setLoading(false);
          return;
        }
        
        // Fetch existing document
        console.log('Fetching document with id:', documentId);
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .single();
          
        if (error) {
          throw error;
        }
        
        console.log('Document loaded from server:', data);
        
        // Get the document title from the database, not from content
        const documentTitle = data.title || 'Untitled Document';
        
        // Ensure consistent interface properties even if they don't exist in the database
        const documentWithDefaults = {
          ...data,
          title: documentTitle,
          favorite: data.favorite || false, // Default to false if not in database
          status: data.status || 'Draft',   // Default to 'Draft' if not in database
        };
        
        setActiveDocument(documentWithDefaults);
        setTitle(documentTitle);
        setContent(data.content || '');
        console.log('Document state set with title:', documentTitle);
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

        // No longer monitoring H1 headings for title updates
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

  const handleBlockquote = () => {
    editor?.chain().focus().toggleBlockquote().run();
  };

  const handleCodeBlock = () => {
    editor?.chain().focus().toggleCodeBlock().run();
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
    console.log('Title changed to:', newTitle);
    setTitle(newTitle);
    
    // Update the active document title as well to show the change immediately
    if (activeDocument) {
      console.log('Updating active document title');
      setActiveDocument({
        ...activeDocument,
        title: newTitle
      });
    }
    
    // Force auto-save after title change with a short delay
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      console.log('Saving document after title change:', newTitle);
      // Save with the current title value, not relying on state update
      if (activeDocument) {
        const documentData = {
          title: newTitle,
          content: content,
          projectId: activeDocument.project_id
        };
        if (documentId === 'new') {
          createDocument(documentData)
            .then(({ document, error }) => {
              if (error) console.error('Error creating document:', error);
              else if (document) {
                console.log('Document created with title:', document.title);
                setActiveDocument({
                  ...document,
                  favorite: false,
                  status: 'Draft'
                });
                navigate(`/documents/${document.id}`, { replace: true });
              }
            });
        } else {
          updateDocument(documentId, { title: newTitle })
            .then(({ document, error }) => {
              if (error) console.error('Error updating document title:', error);
              else if (document) {
                console.log('Document title updated to:', document.title);
              }
            });
        }
      }
      setPendingChanges(false);
    }, 1000);
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

  if (loading) return (
    <div className="document-editor flex items-center justify-center h-full">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="document-editor">
      {/* Document formatting toolbar */}
      <div className="format-toolbar-container">
        <div className="format-toolbar">
          <div className="toolbar-button-group">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/documents')}
              className="mr-2 rounded-md"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
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
            <Button 
              variant="ghost" 
              onClick={() => handleSave()}
              disabled={saving}
              className="format-button" 
            >
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            </Button>
          </div>
        </div>
      </div>
      {/* Note header */}
      <div className="document-header">
        <div className="flex items-center">
          <div>
            {/* Synced title display - now editable */}
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              className="text-md font-medium bg-transparent border-none outline-none"
              placeholder="note title..."
            />
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