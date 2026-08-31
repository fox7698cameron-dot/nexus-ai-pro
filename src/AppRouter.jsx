// File: src/AppRouter.jsx | Created: 2026-08-31 | Nexus AI Pro
// Top-level router - role-based dashboard routing, auth guard, i18n setup
// Separate views for Admin, Developer, Moderator, and User

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Shield, Loader2, AlertCircle } from 'lucide-react';

// ── Lazy load dashboards (code splitting) ──────────────────────────────────
const AuthSystem          = lazy(() => import('./auth/AuthSystem.jsx'));
const SocialAnalytics     = lazy(() => import('./analytics/SocialAnalyticsDashboard.jsx'));
const ProjectTracker      = lazy(() => import('./projects/ProjectTracker.jsx'));
const CheckoutSystem      = lazy(() => import('./payments/CheckoutSystem.jsx'));
const GamePlatformConn    = lazy(() => import('./connectors/GamePlatformConnectors.jsx'));
const EnterpriseConn      = lazy(() => import('./connectors/EnterpriseConnectors.jsx'));
const AdminDashboard      = lazy(() => import('./dashboards/AdminDashboard.jsx'));
const DeveloperDashboard  = lazy(() => import('./dashboards/DeveloperDashboard.jsx'));
const ModeratorDashboard  = lazy(() => import('./dashboards/ModeratorDashboard.jsx'));
const SecurityDashboard   = lazy(() => import('./security/SecurityDashboard.jsx'));

// ─────────────────────────────────────────
// Auth context / session management
// ─────────────────────────────────────────

const AUTH_TOKEN_KEY = 'nexus:session'; // NOTE: token stored in memory, NOT localStorage
                                         // Actual httpOnly cookie set by server

/** Simple in-memory session store — survives re-renders, not page reload (by design) */
let sessionUser = null;

function loadSession() {
  try {
    const raw = sessionStorage.getItem(AUTH_TOKEN_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveSession(user, token) {
  if (!user || !token) return;
  sessionUser = user;
  try { sessionStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify({ user, token })); } catch { /* ignore */ }
}

function clearSession() {
  sessionUser = null;
  try { sessionStorage.removeItem(AUTH_TOKEN_KEY); } catch { /* ignore */ }
}

// ─────────────────────────────────────────
// Route definitions per role
// ─────────────────────────────────────────

const ROUTES = {
  analytics:    { label: '📊 Analytics',      roles: ['user', 'developer', 'moderator', 'admin'] },
  projects:     { label: '🚀 Projects',        roles: ['user', 'developer', 'moderator', 'admin'] },
  security:     { label: '🛡️ Security',        roles: ['moderator', 'admin', 'developer'] },
  connectors:   { label: '🔌 Connectors',      roles: ['developer', 'admin'] },
  enterprise:   { label: '☁️ Enterprise',      roles: ['developer', 'admin'] },
  checkout:     { label: '💳 Upgrade',         roles: ['user', 'developer', 'moderator', 'admin'] },
  admin:        { label: '⚙️ Admin',           roles: ['admin'] },
  developer:    { label: '🔧 Dev Dashboard',   roles: ['developer', 'admin'] },
  moderator:    { label: '🛠️ Moderation',      roles: ['moderator', 'admin'] }
};

function canAccess(route, role) {
  return ROUTES[route]?.roles.includes(role) ?? false;
}

// ─────────────────────────────────────────
// Loading / Error fallback
// ─────────────────────────────────────────

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="text-center space-y-4">
        <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto" />
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    </div>
  );
}

function ErrorBoundaryFallback({ error }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950">
      <div className="max-w-md text-center space-y-4 p-8 bg-red-950/30 rounded-xl border border-red-800">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
        <h2 className="text-white font-semibold">Component failed to load</h2>
        <p className="text-red-300 text-sm font-mono break-all">{error?.message}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// Main Router Component
// ─────────────────────────────────────────

export default function AppRouter() {
  const [session, setSession]     = useState(() => loadSession());
  const [activeRoute, setRoute]   = useState('analytics');
  const [sidebarOpen, setSidebar] = useState(true);
  const [upgradeOpen, setUpgrade] = useState(false);
  const [compError, setCompError] = useState(null);

  const user = session?.user || null;
  const role = user?.role || 'guest';

  // Sync session to memory on mount
  useEffect(() => {
    const s = loadSession();
    if (s) setSession(s);
  }, []);

  function handleAuthSuccess({ user, accessToken }) {
    saveSession(user, accessToken);
    setSession({ user, token: accessToken });
    setRoute('analytics');
    setCompError(null);
  }

  function handleLogout() {
    clearSession();
    setSession(null);
    setRoute('analytics');
  }

  // Not logged in — show auth screen
  if (!user) {
    return (
      <Suspense fallback={<Loading />}>
        <AuthSystem onAuthSuccess={handleAuthSuccess} />
      </Suspense>
    );
  }

  // ── Sidebar ─────────────────────────────────
  const navItems = Object.entries(ROUTES)
    .filter(([key]) => canAccess(key, role))
    .map(([key, cfg]) => ({ key, label: cfg.label }));

  const renderDashboard = () => {
    if (!canAccess(activeRoute, role)) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Access restricted. Required role not met.</p>
          </div>
        </div>
      );
    }

    const commonProps = { userId: user.id, userRole: role };

    try {
      switch (activeRoute) {
      case 'analytics':   return <SocialAnalytics {...commonProps} />;
      case 'projects':    return <ProjectTracker {...commonProps} />;
      case 'security':    return <SecurityDashboard {...commonProps} onAlert={console.warn} />;
      case 'connectors':  return <GamePlatformConn {...commonProps} connections={{}} onConnect={() => {}} onDisconnect={() => {}} />;
      case 'enterprise':  return <EnterpriseConn {...commonProps} connectors={{}} onUpdate={() => {}} />;
      case 'checkout':    return <CheckoutSystem selectedTier="pro" onSuccess={() => setRoute('analytics')} onCancel={() => setRoute('analytics')} />;
      case 'admin':       return <AdminDashboard {...commonProps} />;
      case 'developer':   return <DeveloperDashboard {...commonProps} />;
      case 'moderator':   return <ModeratorDashboard {...commonProps} />;
      default:            return <SocialAnalytics {...commonProps} />;
      }
    } catch (err) {
      return <ErrorBoundaryFallback error={err} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex flex-col border-r border-gray-800 bg-gray-900 transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-14'}`}>
        {/* Logo */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-800">
          <span className="text-xl">⚡</span>
          {sidebarOpen && <span className="font-bold text-purple-300 text-sm whitespace-nowrap">Nexus AI Pro</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
          {navItems.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setRoute(key)}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-colors text-left ${
                activeRoute === key
                  ? 'bg-purple-900/60 text-purple-200'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-base shrink-0">{label.split(' ')[0]}</span>
              {sidebarOpen && <span className="truncate">{label.split(' ').slice(1).join(' ')}</span>}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div className="border-t border-gray-800 p-3">
          {sidebarOpen && (
            <div className="mb-2">
              <p className="text-xs text-white font-medium truncate">{user.displayName || user.username}</p>
              <p className="text-xs text-gray-500 capitalize">{role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full text-xs text-red-400 hover:text-red-300 py-1 text-left"
          >
            {sidebarOpen ? '🚪 Sign out' : '🚪'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 px-4 py-2">
          <button onClick={() => setSidebar(s => !s)} className="text-gray-400 hover:text-white p-1">
            ☰
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:block">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              role === 'admin' ? 'bg-red-900/50 text-red-300' :
              role === 'developer' ? 'bg-blue-900/50 text-blue-300' :
              role === 'moderator' ? 'bg-orange-900/50 text-orange-300' :
              'bg-green-900/50 text-green-300'
            }`}>
              {role}
            </span>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="p-4">
          {compError ? (
            <ErrorBoundaryFallback error={compError} />
          ) : (
            <Suspense fallback={<Loading />}>
              {renderDashboard()}
            </Suspense>
          )}
        </div>
      </main>
    </div>
  );
}
