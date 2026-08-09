/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 *
 * Entry point — mounts React app with providers
 * Date: 2026-08-09
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './src/contexts/AuthContext.jsx';
import { LanguageProvider } from './src/contexts/LanguageContext.jsx';
import NexusRouter from './app.jsx';

// Security: Disable React DevTools in production
if (import.meta.env.PROD && typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object') {
  for (const [key, value] of Object.entries(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__[key] = typeof value === 'function' ? () => {} : null;
  }
}

// ─── Global Error Boundary ────────────────────────────────────────────────────

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In prod: send to error monitoring service via server-side proxy (no key in client)
    console.error('[NexusAI] Unhandled error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0a0a0c', color: '#fff',
          fontFamily: 'Inter, sans-serif', padding: '20px', textAlign: 'center',
        }}>
          <div style={{
            width: '80px', height: '80px',
            background: 'linear-gradient(135deg, #ef4444, #f87171)',
            borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', marginBottom: '24px',
          }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Something went wrong</h1>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            The application encountered an unexpected error. Please refresh to continue.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', borderRadius: '10px',
              color: '#fff', fontSize: '1rem', fontWeight: 500, cursor: 'pointer',
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

// ─── Mount ────────────────────────────────────────────────────────────────────

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <NexusRouter />
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
