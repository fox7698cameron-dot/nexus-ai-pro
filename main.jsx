// main.jsx
// Nexus AI Pro — Application Entry Point
// Updated: 2026-05-03

import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';

// Bootstrap i18n before rendering
import './src/i18n/i18n.js';

import AuthGate from './src/auth/AuthSystem.jsx';

const DashboardRouter = React.lazy(() => import('./src/DashboardRouter.jsx'));
const NexusAI         = React.lazy(() => import('./app.jsx'));

// Disable React DevTools in production to prevent state inspection
if (
  process.env.NODE_ENV === 'production' &&
  typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object'
) {
  for (const [key, value] of Object.entries(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__[key] = typeof value === 'function' ? () => {} : null;
  }
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Log to server — no console in production
    if (process.env.NODE_ENV !== 'production') {
      console.error('Unhandled React error:', error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0a0a0c', color: '#fff',
          fontFamily: 'system-ui, sans-serif', padding: '20px', textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
          <h1 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Something went wrong</h1>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>Please refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 22px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              border: 'none', borderRadius: '10px', color: '#fff', fontSize: '0.95rem', cursor: 'pointer'
            }}
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppShell() {
  return (
    <AuthGate>
      <Suspense fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0c' }}>
          <div style={{ width: 40, height: 40, border: '4px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      }>
        <DashboardRouter />
      </Suspense>
    </AuthGate>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  </React.StrictMode>
);
