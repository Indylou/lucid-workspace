import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EnhancedRichTextEditor } from '../components/tiptap/enhanced-rich-text-editor';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { Input } from '../components/ui/input';
import { toast } from '../components/ui/use-toast';
import AppLayout from '../components/layout/AppLayout';
import './DocumentEditor.css';
import { 
  FileText,
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Star, 
  StarOff,
  Save,
  Trash,
  Bold,
  Italic,
  Underline,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  CodeSquare,
  Link,
  Image,
  Minus,
  AtSign,
  Type,
  Undo,
  Redo
} from 'lucide-react';

// Mock document data structure
interface Document {
  id: string;
  title: string;
  content: string;
  favorite: boolean;
  lastEdited: Date;
}

export default function DocumentEditorPage() {
  const navigate = useNavigate();
  const { documentId } = useParams<{ documentId: string }>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      title: 'Welcome to Lucid Team',
      content: '<h1>Welcome to Lucid Team</h1><p>This is your first document. You can edit it or create a new one.</p><p>The editor supports rich text formatting like <strong>bold</strong>, <em>italic</em>, and <u>underline</u>.</p>',
      favorite: true,
      lastEdited: new Date(),
    },
    {
      id: '2',
      title: 'Meeting Notes',
      content: '<h1>Team Meeting Notes</h1><p>Date: 2023-05-15</p><h2>Agenda</h2><ul><li>Project updates</li><li>Timeline review</li><li>Open questions</li></ul>',
      favorite: false,
      lastEdited: new Date(Date.now() - 86400000),
    },
    {
      id: '3',
      title: 'Project Ideas',
      content: '<h1>Project Ideas</h1><h2>New Features</h2><ul><li>Document collaboration</li><li>Version history</li><li>Export to PDF</li></ul>',
      favorite: false,
      lastEdited: new Date(Date.now() - 172800000),
    },
  ]);
  
  const [activeDocument, setActiveDocument] = useState<Document | null>(null);
  const [editableContent, setEditableContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [pendingChanges, setPendingChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update document title in browser tab when title changes
  useEffect(() => {
    if (documentTitle) {
      // Update the document title in the browser tab
      document.title = `${documentTitle} - Lucid`;
    } else {
      document.title = 'Untitled Document - Lucid';
    }
  }, [documentTitle]);

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
  }, [pendingChanges, editableContent, documentTitle]);

  // Handle content change
  const handleContentChange = (newContent: string) => {
    setEditableContent(newContent);
    setPendingChanges(true);
  };

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setDocumentTitle(newTitle);
    
    // Mark as having pending changes that need to be saved
    setPendingChanges(true);
  };

  // Find and set the active document based on the URL parameter
  useEffect(() => {
    if (documentId) {
      const doc = documents.find(d => d.id === documentId);
      if (doc) {
        setActiveDocument(doc);
        setEditableContent(doc.content);
        setDocumentTitle(doc.title);
      } else {
        // If no document is found, redirect to the first document
        if (documents.length > 0) {
          navigate(`/documents/${documents[0].id}`);
        }
      }
    } else {
      // If no documentId is provided, show the first document
      if (documents.length > 0) {
        navigate(`/documents/${documents[0].id}`);
      }
    }
  }, [documentId, documents, navigate]);

  // Filter documents based on search term
  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Save the current document
  const handleSave = () => {
    if (activeDocument) {
      const updatedDocuments = documents.map(doc => 
        doc.id === activeDocument.id 
          ? { ...doc, content: editableContent, title: documentTitle, lastEdited: new Date() } 
          : doc
      );
      setDocuments(updatedDocuments);
      // Update the active document
      setActiveDocument({
        ...activeDocument,
        content: editableContent,
        title: documentTitle,
        lastEdited: new Date()
      });

      // Show a subtle saving notification
      toast({
        title: "Document Saved",
        description: "Your changes have been saved",
        duration: 2000,
      });
    }
  };

  // Create a new document
  const handleNewDocument = () => {
    const newId = (documents.length + 1).toString();
    const newDoc: Document = {
      id: newId,
      title: 'Untitled Document',
      content: '<h1>Untitled Document</h1><p>Start writing here...</p>',
      favorite: false,
      lastEdited: new Date(),
    };
    
    setDocuments([...documents, newDoc]);
    navigate(`/documents/${newId}`);
  };

  // Delete the current document
  const handleDeleteDocument = () => {
    if (activeDocument) {
      const updatedDocuments = documents.filter(doc => doc.id !== activeDocument.id);
      setDocuments(updatedDocuments);
      
      // Navigate to another document if available
      if (updatedDocuments.length > 0) {
        navigate(`/documents/${updatedDocuments[0].id}`);
      } else {
        // Create a new empty document if no documents remain
        handleNewDocument();
      }
    }
  };

  // Toggle favorite status
  const handleToggleFavorite = () => {
    if (activeDocument) {
      const updatedDocuments = documents.map(doc => 
        doc.id === activeDocument.id 
          ? { ...doc, favorite: !doc.favorite } 
          : doc
      );
      setDocuments(updatedDocuments);
      // Update the active document
      setActiveDocument({
        ...activeDocument,
        favorite: !activeDocument.favorite
      });
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', '');
  };

  return (
    <AppLayout hideHeader className="p-0">
      <div className="flex h-full">
        <div className="min-h-screen bg-background flex flex-col document-editor">      
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <aside className={`sidebar border-r transition-all duration-300 flex flex-col ${sidebarCollapsed ? 'w-10' : 'w-64'}`}>
              <div className="p-3 border-b flex justify-between items-center">
                {!sidebarCollapsed && (
                  <div className="relative w-full">
                    <Input
                      type="text"
                      placeholder="Search documents..."
                      className="w-full h-8 pl-3 pr-2 py-1 text-sm rounded-md border border-input bg-background"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className={`h-8 w-8 p-0 ${sidebarCollapsed ? 'mx-auto' : 'ml-1'}`}
                >
                  {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto document-list">
                {!sidebarCollapsed ? (
                  <>
                    <div className="p-2">
                      <Button 
                        variant="outline" 
                        className="w-full flex items-center justify-start gap-2 h-8 text-xs"
                        onClick={handleNewDocument}
                      >
                        <Plus size={14} /> New Document
                      </Button>
                    </div>
                    
                    <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                      All Documents
                    </div>
                    
                    <div className="space-y-0.5 px-2">
                      {filteredDocuments.map((doc) => (
                        <Button
                          key={doc.id}
                          variant={activeDocument?.id === doc.id ? "secondary" : "ghost"}
                          className={`sidebar-item w-full justify-start group h-8 px-2 text-left ${activeDocument?.id === doc.id ? 'active' : ''}`}
                          onClick={() => navigate(`/documents/${doc.id}`)}
                        >
                          <div className="flex items-center gap-2 w-full truncate">
                            <FileText size={14} className="shrink-0" />
                            <span className="truncate text-sm">{doc.title}</span>
                            {doc.favorite && <Star size={14} className="star-icon ml-auto shrink-0" />}
                          </div>
                        </Button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center py-4 space-y-4">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNewDocument}>
                      <Plus size={16} />
                    </Button>
                  </div>
                )}
              </div>
            </aside>
            
            {/* Main content */}
            <main className="flex-1 flex flex-col overflow-hidden bg-background">
              {activeDocument ? (
                <>
                  {/* Document header with actions */}
                  <div className="border-b p-4 flex items-center justify-between bg-background">
                    <div className="flex-1">
                      <Input
                        type="text"
                        value={documentTitle}
                        onChange={handleTitleChange}
                        className="document-title-input text-xl font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto py-0 bg-transparent"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        Last edited: {formatDate(activeDocument.lastEdited)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleToggleFavorite}
                        className="h-8 px-3"
                      >
                        {activeDocument.favorite ? (
                          <StarOff size={16} className="mr-2" />
                        ) : (
                          <Star size={16} className="mr-2" />
                        )}
                        {activeDocument.favorite ? "Unfavorite" : "Favorite"}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleSave}
                        className="h-8 px-3"
                      >
                        <Save size={16} className="mr-2" />
                        Save
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleDeleteDocument}
                        className="text-destructive h-8 px-3"
                      >
                        <Trash size={16} className="mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  
                  {/* Formatting toolbar */}
                  <div className="format-toolbar border-b p-2 flex items-center space-x-1 bg-background/90 backdrop-blur-sm">
                    <Button variant="ghost" size="icon" className="format-button h-8 w-8"><Bold size={16} /></Button>
                    <Button variant="ghost" size="icon" className="format-button h-8 w-8"><Italic size={16} /></Button>
                    <Button variant="ghost" size="icon" className="format-button h-8 w-8"><Underline size={16} /></Button>
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    <Button variant="ghost" size="icon" className="format-button h-8 w-8"><Heading1 size={16} /></Button>
                    <Button variant="ghost" size="icon" className="format-button h-8 w-8"><Heading2 size={16} /></Button>
                    <Button variant="ghost" size="icon" className="format-button h-8 w-8"><Heading3 size={16} /></Button>
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    <Button variant="ghost" size="icon" className="format-button h-8 w-8"><List size={16} /></Button>
                    <Button variant="ghost" size="icon" className="format-button h-8 w-8"><ListOrdered size={16} /></Button>
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    <Button variant="ghost" size="icon" className="format-button h-8 w-8"><Code size={16} /></Button>
                    <Button variant="ghost" size="icon" className="format-button h-8 w-8"><CodeSquare size={16} /></Button>
                    <Button variant="ghost" size="icon" className="format-button h-8 w-8"><Link size={16} /></Button>
                    <Button variant="ghost" size="icon" className="format-button h-8 w-8"><Image size={16} /></Button>
                    <Separator orientation="vertical" className="h-6 mx-1" />
                    <Button variant="ghost" size="icon" className="format-button h-8 w-8"><Minus size={16} /></Button>
                    <Button variant="ghost" size="icon" className="format-button h-8 w-8"><AtSign size={16} /></Button>
                    <div className="flex-1"></div>
                    <div className="flex items-center space-x-1">
                      <div className="flex items-center border rounded-md px-2 h-8">
                        <Type size={14} className="mr-2" />
                        <span className="text-sm">Font</span>
                      </div>
                      <Button variant="ghost" size="icon" className="format-button h-8 w-8"><Undo size={16} /></Button>
                      <Button variant="ghost" size="icon" className="format-button h-8 w-8"><Redo size={16} /></Button>
                    </div>
                  </div>
                  
                  {/* Document content editor */}
                  <div className="flex-1 overflow-auto">
                    <div className="tiptap-editor">
                      <EnhancedRichTextEditor
                        value={editableContent}
                        onChange={handleContentChange}
                        showToolbar={false} // Hide default toolbar since we have our custom one
                        previewMode={false}
                        placeholder="Start writing..."
                        className="min-h-full"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <h2 className="text-2xl font-bold mb-4">no note selected</h2>
                  <p className="text-muted-foreground mb-4">Select note from the sidebar or create a new one.</p>
                  <Button onClick={handleNewDocument}>
                    <Plus size={16} className="mr-2" />
                    create new note...
                  </Button>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </AppLayout>
  );
} 