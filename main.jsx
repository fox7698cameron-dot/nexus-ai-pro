// main.jsx
// 2026-07-12 | Entry point — auth routing, role-based dashboard dispatch

import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import AuthPage from './src/auth/AuthPage.jsx';
import AdminDashboard from './src/dashboards/AdminDashboard.jsx';
import DeveloperDashboard from './src/dashboards/DeveloperDashboard.jsx';
import ModeratorDashboard from './src/dashboards/ModeratorDashboard.jsx';
import UserDashboard from './src/dashboards/UserDashboard.jsx';

// Disable React DevTools in production
if (typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object') {
  for (const [key, value] of Object.entries(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__[key] = typeof value === 'function' ? () => {} : null;
  }
}

// Session key — only stores non-sensitive identity (not tokens)
const SESSION_KEY = 'nexus:session';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('App error:', error, info);
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
          background: '#0a0a0a',
          color: '#fff',
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center',
          padding: 20,
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
          <h2 style={{ marginBottom: 8 }}>Something went wrong</h2>
          <p style={{ color: '#666', marginBottom: 24 }}>Please refresh the page to continue.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '10px 24px', background: '#7c3aed', border: 'none', borderRadius: 8, color: '#fff', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function NexusRouter() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // Restore lightweight session info (no tokens — those live in httpOnly cookies / memory only)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Sanity-check shape before trusting
        if (parsed && typeof parsed.role === 'string' && typeof parsed.email === 'string') {
          setUser(parsed);
        }
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  const handleAuthenticated = useCallback((userData) => {
    const safe = {
      email: userData.email || '',
      username: userData.username || userData.email?.split('@')[0] || 'user',
      role: userData.role || 'user',
      locale: userData.locale || 'en',
    };
    setUser(safe);
    // Store only identity metadata — never tokens
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(safe)); } catch { /* ignore quota errors */ }
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }, []);

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #333', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  const props = { user, onLogout: handleLogout };

  switch (user.role) {
    case 'admin':
      return <AdminDashboard {...props} />;
    case 'developer':
      return <DeveloperDashboard {...props} />;
    case 'moderator':
      return <ModeratorDashboard {...props} />;
    default:
      return <UserDashboard {...props} />;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <NexusRouter />
    </ErrorBoundary>
  </React.StrictMode>
);
