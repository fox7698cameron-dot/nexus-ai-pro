/**
 * @file main.jsx
 * @description Application entry point — mounts React root with AuthProvider,
 *   error boundary, CSP enforcement, and DevTools lockout.
 * @author Cameron Fox <contact@nexusai.pro>
 * @version 2.0.0
 * @date 2026-08-19
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import NexusAI from './app.jsx';
import AuthProvider from './src/auth/AuthSystem.jsx';

// ─── Security: Disable React DevTools in production ────────────────────────────

if (process.env.NODE_ENV === 'production' && typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object') {
  for (const [key, value] of Object.entries(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__[key] = typeof value === 'function' ? () => {} : null;
  }
}

// ─── Security: Block frame embedding ──────────────────────────────────────────

if (typeof window !== 'undefined' && window.top !== window.self) {
  // Escape frame embedding (defense-in-depth alongside X-Frame-Options header)
  window.top.location = window.location;
}

// ─── Error Boundary ────────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // In production, send to error monitoring (e.g. Sentry via process.env.SENTRY_DSN)
    if (process.env.NODE_ENV !== 'production') {
      console.error('Application error:', error, errorInfo);
    }
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
          background: '#020817',
          color: '#f1f5f9',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{
            width: 80, height: 80,
            background: 'linear-gradient(135deg, #ef4444, #f87171)',
            borderRadius: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', marginBottom: 24
          }}>
            ⚠️
          </div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#64748b', marginBottom: 24 }}>
            The application encountered an error. Please refresh the page.
          </p>
          {process.env.NODE_ENV !== 'production' && this.state.error && (
            <pre style={{
              background: '#0f172a', padding: 16, borderRadius: 8,
              fontSize: 11, color: '#ef4444', maxWidth: 600, overflowX: 'auto', textAlign: 'left', marginBottom: 24
            }}>
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', borderRadius: 10,
              color: '#fff', fontSize: '1rem', fontWeight: 600, cursor: 'pointer'
            }}
          >
            🔄 Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── Mount Application ─────────────────────────────────────────────────────────

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found in DOM');

const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <NexusAI />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
