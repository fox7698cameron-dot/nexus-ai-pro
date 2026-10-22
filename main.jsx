// Nexus AI Pro - Application Entry Point | Date: 2026-10-22
import React, { useState, Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import NexusAI from './app.jsx';

// Lazy-load AuthSystem to keep initial bundle small
const AuthSystem = lazy(() => import('./src/auth/AuthSystem.jsx'));

// Security: Disable React DevTools in production
if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object') {
  for (const [key, value] of Object.entries(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__[key] = typeof value === 'function' ? () => {} : null;
  }
}

const LoadingScreen = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0f1e',
    color: '#fff',
    fontFamily: 'Inter, sans-serif',
    flexDirection: 'column',
    gap: '16px',
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      border: '3px solid rgba(139,92,246,0.3)',
      borderTopColor: '#8b5cf6',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading Nexus AI Pro...</p>
  </div>
);

// Error boundary for production
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0c',
          color: '#ffffff',
          fontFamily: 'Inter, sans-serif',
          padding: '20px',
          textAlign: 'center',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            marginBottom: '24px',
          }}>
            ⚠️
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Something went wrong</h1>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            The application encountered an error. Please refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * AppWrapper handles top-level auth gating.
 * Unauthenticated → shows AuthSystem.
 * Authenticated   → shows NexusAI with authUser prop.
 */
function AppWrapper() {
  const [authUser, setAuthUser] = useState(() => {
    try {
      const stored = sessionStorage.getItem('nexus_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  const handleAuthSuccess = (user) => {
    setAuthUser(user);
    try { sessionStorage.setItem('nexus_user', JSON.stringify(user)); } catch { /* noop */ }
  };

  const handleLogout = async () => {
    try {
      const token = sessionStorage.getItem('nexus_token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch { /* noop */ }
    sessionStorage.removeItem('nexus_token');
    sessionStorage.removeItem('nexus_user');
    setAuthUser(null);
  };

  if (!authUser) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <AuthSystem onAuthSuccess={handleAuthSuccess} onAuthFailure={() => {}} />
      </Suspense>
    );
  }

  return <NexusAI authUser={authUser} onLogout={handleLogout} />;
}

// Mount application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppWrapper />
    </ErrorBoundary>
  </React.StrictMode>
);
