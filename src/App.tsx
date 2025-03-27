import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import TodoEditorPage from './pages/TodoEditorPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { checkAuth, AuthState } from './lib/auth-service';
import { User } from './lib/supabase';
import { AppError, handleAuthError } from './lib/error-handling';
import { ToastProvider } from './components/ui/use-toast';
import { UserProvider } from './components/UserProvider';
import { useUser } from './lib/user-context';
import { TodoProvider } from './features/todos/hooks';
import './App.css';

// Create auth context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: AppError | null;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  error: null,
  refreshAuth: async () => {},
});

// Auth provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });
  const { setUser } = useUser();

  const refreshAuth = useCallback(async () => {
    try {
      const { user, error } = await checkAuth();
      
      // Update auth state first
      setAuthState({ user, loading: false, error });
      
      // Then sync with UserContext
      setUser(user);
    } catch (error) {
      console.error('[AuthProvider] Auth error:', error);
      setAuthState({ 
        user: null, 
        loading: false, 
        error: handleAuthError('Failed to authenticate') 
      });
      setUser(null);
    }
  }, [setUser]);

  // Check auth on mount only
  useEffect(() => {
    console.log('[AuthProvider] Initial auth check');
    refreshAuth();
  }, []); // Remove refreshAuth from dependencies to prevent loops

  return (
    <AuthContext.Provider value={{ ...authState, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => useContext(AuthContext);

function App() {
  const location = useLocation();

  return (
    <ToastProvider>
      <UserProvider>
        <AuthProvider>
          <TodoProvider>
            <AppRoutes location={location} />
          </TodoProvider>
        </AuthProvider>
      </UserProvider>
    </ToastProvider>
  );
}

// Separate component for routes to access auth context
function AppRoutes({ location }: { location: ReturnType<typeof useLocation> }) {
  const { user: authUser, loading } = useAuth();
  const { user: activeUser } = useUser();
  const user = activeUser || authUser; // Prefer active user from context

  // A wrapper component that checks if the user is authenticated
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Loading...</span>
        </div>
      );
    }
    
    if (!user) {
      // Redirect to login page with the return url
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    return <>{children}</>;
  };

  // If the user is logged in and tries to access login/register pages, redirect to dashboard
  if (user && (location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/')) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Todo page for testing the structured content */}
        <Route 
          path="/todos" 
          element={
            <ProtectedRoute>
              <TodoEditorPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Dashboard and Documents routes all use the same DashboardLayout component */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/documents" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/documents/:documentId" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          } 
        />
        
        {/* Tasks route */}
        <Route 
          path="/tasks" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          } 
        />
        
        {/* Calendar route */}
        <Route 
          path="/calendar" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          } 
        />
        
        {/* Analytics route */}
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </div>
  );
}

export default App;
