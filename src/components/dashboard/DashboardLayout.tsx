import React, { useState, useEffect } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { EnhancedHeader } from "./EnhancedHeader";
import { 
  FileText, 
  Home, 
  Settings, 
  Users, 
  Edit, 
  FileEdit, 
  Plus, 
  Star, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  MoreHorizontal,
  PlusCircle,
  Search,
  Calendar,
  Clock,
  BarChart,
  LogOut,
  Bookmark,
  Activity,
  Layout,
  Loader2
} from "lucide-react";
import { 
  Breadcrumb, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbList, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from "../ui/breadcrumb";
import { Input } from "../ui/input";
import { DocumentEditor } from "../DocumentEditor";
import { Sidebar, SidebarNav, SidebarGroup, SidebarFooter } from "../../components/ui/sidebar";
import { formatDistanceToNow } from 'date-fns';
import { logout } from "../../lib/auth-service";
import TasksPage from '../../pages/TasksPage';
import { CalendarModule } from './CalendarModule';
import { AnalyticsModule } from './AnalyticsModule';
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../App";
import { toast } from "../ui/use-toast";

// Document type to match Supabase schema
interface Document {
  id: string;
  title: string;
  content?: string;
  status?: string;
  favorite?: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  project_id?: string | null;
}

export function DashboardLayout() {
  const location = useLocation();
  const { documentId } = useParams<{ documentId?: string }>();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [totalNotes, setTotalNotes] = useState(0);
  const [recentEdits, setRecentEdits] = useState(0);
  const [sharedWithMe, setSharedWithMe] = useState(0);
  const [favorites, setFavorites] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch document data from Supabase
  useEffect(() => {
    const fetchDocuments = async () => {
      setIsLoading(true);
      
      try {
        if (!user) return;
        
        // Fetch documents created by the user or shared with the user
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('created_by', user.id)
          .order('updated_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching documents:', error);
          throw new Error(error.message);
        }
        
        // Transform document data and handle any missing properties
        const transformedDocs = data.map(doc => ({
          ...doc,
          status: 'Draft',
          favorite: false
        }));
        
        setDocuments(transformedDocs);
        
        // Set dashboard metrics
        setTotalNotes(transformedDocs.length);
        
        // Count recent edits (in the last 7 days)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        setRecentEdits(
          transformedDocs.filter(doc => 
            new Date(doc.updated_at) >= oneWeekAgo
          ).length
        );
        
        // Count documents shared with the user (not created by them)
        setSharedWithMe(0);
        
        // Count favorite documents
        setFavorites(0);
        
      } catch (error) {
        console.error('Error in fetchDocuments:', error);
        toast({
          title: 'Error',
          description: 'Failed to load documents. Please try again.'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocuments();
    
    // Refresh documents every minute
    const intervalId = setInterval(fetchDocuments, 60000);
    
    return () => clearInterval(intervalId);
  }, [user]);
  
  // Determine if we're on the notes route
  const isNotesRoute = location.pathname.includes('/documents');
  
  // Function to render workflow-style note list
  const renderWorkflowList = () => {
    return (
      <div className="p-6 max-w-full mx-auto">
        <div className="page-header">
          <h1 className="page-title">Notes</h1>
          <Button 
            onClick={() => navigate('/documents/new')}
            className="action-button"
            size="lg"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> New Note
          </Button>
        </div>
        
        <div className="search-container">
          <Search className="search-icon h-4 w-4" />
          <Input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        ) : (
          <div className="workflow-list-container">
            <table className="workflow-list w-full">
              <thead>
                <tr>
                  <th>Note</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground">
                      No documents found. Create a new document to get started.
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map(doc => (
                    <tr key={doc.id} onClick={() => navigate(`/documents/${doc.id}`)} style={{ cursor: 'pointer' }}>
                      <td className="font-medium flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                        {doc.title}
                        {doc.favorite && <Bookmark className="h-4 w-4 ml-2 text-primary fill-primary" />}
                      </td>
                      <td>
                        <span className={`status-badge ${doc.status?.toLowerCase()}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td>{formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}</td>
                      <td>
                        <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0" onClick={(e) => {
                          e.stopPropagation(); // Prevent row click
                          // Handle actions
                        }}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Recent Activity Section */}
        <div className="mt-12">
          <h2 className="section-title">Recent Activity</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredDocuments.slice(0, 3).map(doc => (
              <div 
                key={`recent-${doc.id}`} 
                className="document-card"
                onClick={() => navigate(`/documents/${doc.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`status-badge ${doc.status?.toLowerCase()}`}>
                    {doc.status}
                  </span>
                  {doc.favorite && <Bookmark className="h-4 w-4 text-primary fill-primary" />}
                </div>
                <h3 className="text-lg font-medium mb-2">{doc.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Last updated {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
                </p>
                <div className="flex justify-between items-center">
                  <div className="flex space-x-1">
                    <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium ring-1 ring-background shadow-sm">
                      {user?.name?.substring(0, 2) || 'U'}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {doc.created_by === user?.id ? 'Owner' : 'Shared with you'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  // Function to render the main content based on route
  const renderMainContent = () => {
    if (isNotesRoute && documentId) {
      return <DocumentEditor documentId={documentId} />;
    } else if (isNotesRoute) {
      return renderWorkflowList();
    } else if (location.pathname === '/tasks') {
      return <TasksPage />;
    } else if (location.pathname === '/calendar') {
      return <CalendarModule />;
    } else if (location.pathname === '/analytics') {
      return <AnalyticsModule />;
    }
    
    // Default dashboard view
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <Button 
            onClick={() => navigate('/documents/new')}
            className="action-button"
            size="lg"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> New Note
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className="overflow-hidden rounded-xl border border-border/40 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Layout className="mr-2 h-4 w-4 text-primary" />
                    Total Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalNotes}</div>
                  <p className="text-xs text-muted-foreground">{documents.length > 0 ? 'All your documents' : 'No documents yet'}</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden rounded-xl border border-border/40 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Edit className="mr-2 h-4 w-4 text-primary" />
                    Recent Edits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{recentEdits}</div>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden rounded-xl border border-border/40 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Users className="mr-2 h-4 w-4 text-primary" />
                    Shared With Me
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sharedWithMe}</div>
                  <p className="text-xs text-muted-foreground">From collaborators</p>
                </CardContent>
              </Card>
              <Card className="overflow-hidden rounded-xl border border-border/40 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Star className="mr-2 h-4 w-4 text-primary" />
                    Favorites
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{favorites}</div>
                  <p className="text-xs text-muted-foreground">Quick access</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Recent Notes Section */}
            <div className="mt-10">
              <div className="flex justify-between items-center mb-4">
                <h2 className="section-title">Recent Notes</h2>
                <Button variant="ghost" size="sm" onClick={() => navigate('/documents')} className="text-primary hover:text-primary/80">
                  View all
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {documents.length === 0 ? (
                  <div className="col-span-3 py-12 text-center">
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground opacity-20 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No documents yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first document to get started</p>
                    <Button onClick={() => navigate('/documents/new')}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Create Document
                    </Button>
                  </div>
                ) : (
                  documents.slice(0, 3).map(doc => (
                    <div 
                      key={`recent-${doc.id}`} 
                      className="document-card"
                      onClick={() => navigate(`/documents/${doc.id}`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span className={`status-badge ${doc.status?.toLowerCase()}`}>
                          {doc.status}
                        </span>
                        {doc.favorite && <Bookmark className="h-4 w-4 text-primary fill-primary" />}
                      </div>
                      <h3 className="text-lg font-medium mb-2">{doc.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Last updated {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
                      </p>
                      <div className="flex justify-between items-center">
                        <div className="flex space-x-1">
                          <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium ring-1 ring-background shadow-sm">
                            {user?.name?.substring(0, 2) || 'U'}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {doc.created_by === user?.id ? 'Owner' : 'Shared with you'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            {/* Activity Timeline */}
            <div className="mt-10">
              <h2 className="section-title">Recent Activity</h2>
              {documents.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">No recent activity to display</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.slice(0, 4).map((doc, index) => (
                    <div key={`activity-${index}`} className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border/40 hover:shadow-sm transition-all activity-card">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Activity className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">
                          <span className="text-primary">{doc.title}</span> was {index % 2 === 0 ? 'edited' : 'created'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(doc.updated_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };
  
  // Search state for documents
  const [searchQuery, setSearchQuery] = useState("");
  
  // Filtered documents based on search term
  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle creating a new document
  const handleNewDocument = () => {
    navigate('/documents/new');
  };

  // Toggle sidebar collapsed state
  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Render breadcrumb for document navigation
  const renderBreadcrumb = () => {
    if (!isNotesRoute || !documentId) return null;
    
    const currentDoc = documentId 
      ? documents.find(doc => doc.id === documentId) 
      : undefined;
    
    return (
      <div className="px-6 py-2 border-t bg-background/50 backdrop-blur-sm">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/documents">Notes</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {currentDoc && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{currentDoc.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <EnhancedHeader />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Sidebar using our component */}
        <Sidebar
          collapsed={sidebarCollapsed}
          collapsible={true}
          onToggleCollapse={handleToggleSidebar}
          className="border-r shadow-sm"
        >
          <div className="p-3 flex justify-center items-center">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <img src="/logo.svg" alt="Logo" className="h-6 w-6 text-primary" />
            </div>
          </div>
          
          <SidebarNav className="px-2">
            <SidebarGroup>
              <Link to="/dashboard" className={`flex items-center p-2 rounded-lg my-1 ${location.pathname === '/dashboard' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                <Home className={`h-5 w-5 ${location.pathname === '/dashboard' ? 'text-primary' : ''}`} />
                {!sidebarCollapsed && <span className="ml-3 font-medium">Dashboard</span>}
              </Link>
              <Link to="/documents" className={`flex items-center p-2 rounded-lg my-1 ${isNotesRoute ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                <FileText className={`h-5 w-5 ${isNotesRoute ? 'text-primary' : ''}`} />
                {!sidebarCollapsed && <span className="ml-3 font-medium">Notes</span>}
              </Link>
              <Link to="/calendar" className={`flex items-center p-2 rounded-lg my-1 ${location.pathname === '/calendar' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                <Calendar className={`h-5 w-5 ${location.pathname === '/calendar' ? 'text-primary' : ''}`} />
                {!sidebarCollapsed && <span className="ml-3 font-medium">Calendar</span>}
              </Link>
              <Link to="/tasks" className={`flex items-center p-2 rounded-lg my-1 ${location.pathname === '/tasks' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                <Clock className={`h-5 w-5 ${location.pathname === '/tasks' ? 'text-primary' : ''}`} />
                {!sidebarCollapsed && <span className="ml-3 font-medium">Tasks</span>}
              </Link>
              <Link to="/analytics" className={`flex items-center p-2 rounded-lg my-1 ${location.pathname === '/analytics' ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}>
                <BarChart className={`h-5 w-5 ${location.pathname === '/analytics' ? 'text-primary' : ''}`} />
                {!sidebarCollapsed && <span className="ml-3 font-medium">Analytics</span>}
              </Link>
            </SidebarGroup>
          </SidebarNav>
          
          <SidebarFooter className="px-2 pb-4">
            <SidebarGroup>
              <Link to="/settings" className="flex items-center p-2 rounded-lg my-1 hover:bg-muted">
                <Settings className="h-5 w-5" />
                {!sidebarCollapsed && <span className="ml-3 font-medium">Settings</span>}
              </Link>
              <Link to="/test-supabase" className="flex items-center p-2 rounded-lg my-1 hover:bg-muted text-amber-500">
                <Activity className="h-5 w-5" />
                {!sidebarCollapsed && <span className="ml-3 font-medium">Test Supabase</span>}
              </Link>
              <button 
                className="flex items-center p-2 rounded-lg my-1 hover:bg-muted w-full text-left"
                onClick={logout}
              >
                <LogOut className="h-5 w-5" />
                {!sidebarCollapsed && <span className="ml-3 font-medium">Logout</span>}
              </button>
            </SidebarGroup>
          </SidebarFooter>
        </Sidebar>
        
        <main className="flex-1 flex flex-col overflow-hidden bg-background/90">
          <div className="flex-1 overflow-auto">
            {renderMainContent()}
          </div>
          {renderBreadcrumb()}
        </main>
      </div>
    </div>
  );
} 