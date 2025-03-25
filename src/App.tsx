import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LoginForm } from './components/auth/LoginForm';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import TiptapPage from './pages/tiptap';
import TiptapEnhancedPage from './pages/tiptap-enhanced';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const location = useLocation();

  // We wrap LoginForm to handle the login state
  const LoginFormWithState = () => {
    const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoggedIn(true);
    };

    return (
      <div onClick={handleLogin} className="cursor-pointer">
        <LoginForm />
      </div>
    );
  };

  // A wrapper component that checks if the user is authenticated
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isLoggedIn) {
      // Redirect to login page with the return url
      return <Navigate to="/" state={{ from: location }} replace />;
    }
    return <>{children}</>;
  };

  // If the user is logged in and tries to access the root path, redirect to the dashboard
  if (isLoggedIn && location.pathname === '/') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Routes>
        <Route path="/" element={!isLoggedIn ? <LoginFormWithState /> : <Navigate to="/dashboard" replace />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/tiptap" 
          element={
            <ProtectedRoute>
              <TiptapPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/tiptap-enhanced" 
          element={
            <ProtectedRoute>
              <TiptapEnhancedPage />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </div>
  );
}

export default App;
