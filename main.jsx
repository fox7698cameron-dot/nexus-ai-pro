// File: main.jsx | Date: 2026-06-16 | Nexus AI Pro
import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './src/contexts/AuthContext.jsx';
import { SocketProvider } from './src/contexts/SocketContext.jsx';
import { ThemeProvider } from './src/contexts/ThemeContext.jsx';

// Suppress React DevTools in production
if (process.env.NODE_ENV === 'production' &&
    typeof window.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'object') {
  for (const [k, v] of Object.entries(window.__REACT_DEVTOOLS_GLOBAL_HOOK__)) {
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__[k] = typeof v === 'function' ? () => {} : null;
  }
}

// Fallback for unbuilt dashboard modules
const ComingSoon = ({ name }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
    <div className="text-center">
      <div className="text-6xl mb-4">🚧</div>
      <h2 className="text-2xl font-semibold mb-2">{name}</h2>
      <p className="text-gray-400">Dashboard coming soon</p>
    </div>
  </div>
);

function safeImport(path, displayName) {
  return lazy(() =>
    import(/* @vite-ignore */ path).catch(() => ({
      default: () => <ComingSoon name={displayName} />
    }))
  );
}

// Lazy-loaded pages/dashboards — gracefully fall back if file not yet built
const NexusChat     = lazy(() => import('./app.jsx'));
const LoginForm     = lazy(() => import('./src/components/auth/LoginForm.jsx'));
const RegisterForm  = lazy(() => import('./src/components/auth/RegisterForm.jsx'));
const AnalyticsDash = safeImport('./src/dashboards/AnalyticsDashboard.jsx', 'Analytics Dashboard');
const SecurityDash  = safeImport('./src/dashboards/SecurityDashboard.jsx', 'Security Dashboard');
const ProjectDash   = safeImport('./src/dashboards/ProjectDashboard.jsx', 'Project Dashboard');
const GamingDash    = safeImport('./src/dashboards/GamingDashboard.jsx', 'Gaming Dashboard');
const AdminDash     = safeImport('./src/dashboards/AdminDashboard.jsx', 'Admin Dashboard');
const DevDash       = safeImport('./src/dashboards/DevDashboard.jsx', 'Developer Dashboard');
const ModDash       = safeImport('./src/dashboards/ModeratorDashboard.jsx', 'Moderator Dashboard');

// Role hierarchy
const ROLE_LEVEL = { user: 0, moderator: 1, developer: 2, admin: 3, super_admin: 4 };

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading Nexus AI Pro…</p>
      </div>
    </div>
  );
}

function RequireAuth({ children, minRole = 'user' }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (ROLE_LEVEL[user?.role] < ROLE_LEVEL[minRole]) return <Navigate to="/chat" replace />;
  return children;
}

function RequireGuest({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <Loading />;
  if (isAuthenticated) return <Navigate to="/chat" replace />;
  return children;
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err, info) { console.error('[ErrorBoundary]', err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white p-6 text-center">
          <div className="w-20 h-20 bg-red-500 rounded-2xl flex items-center justify-center text-4xl mb-6">⚠️</div>
          <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-gray-400 mb-6">An unexpected error occurred. Please refresh the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        {/* Public */}
        <Route path="/login"    element={<RequireGuest><LoginForm /></RequireGuest>} />
        <Route path="/register" element={<RequireGuest><RegisterForm /></RequireGuest>} />

        {/* User routes */}
        <Route path="/chat"      element={<RequireAuth><NexusChat /></RequireAuth>} />
        <Route path="/analytics" element={<RequireAuth><AnalyticsDash /></RequireAuth>} />
        <Route path="/security"  element={<RequireAuth><SecurityDash /></RequireAuth>} />
        <Route path="/projects"  element={<RequireAuth><ProjectDash /></RequireAuth>} />
        <Route path="/gaming"    element={<RequireAuth><GamingDash /></RequireAuth>} />

        {/* Role-restricted */}
        <Route path="/admin/*"      element={<RequireAuth minRole="admin"><AdminDash /></RequireAuth>} />
        <Route path="/developer/*"  element={<RequireAuth minRole="developer"><DevDash /></RequireAuth>} />
        <Route path="/moderation/*" element={<RequireAuth minRole="moderator"><ModDash /></RequireAuth>} />

        {/* Default */}
        <Route path="/"  element={<Navigate to="/chat" replace />} />
        <Route path="*"  element={<Navigate to="/chat" replace />} />
      </Routes>
    </Suspense>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <AppRoutes />
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
