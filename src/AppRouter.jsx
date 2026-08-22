// ================================================
// src/AppRouter.jsx
// Main Application Router
// Role-based routing: admin, developer, moderator, user
// Integrates all dashboards and feature modules
// Date: 2026-08-22
// Copyright © 2025-2026 Cameron Fox. All rights reserved.
// ================================================

import { useState, useEffect, Suspense, lazy } from 'react';

// ─── Lazy-loaded route modules ───────────────────────────────────────────────
const AnalyticsDashboard = lazy(() => import('./analytics/AnalyticsDashboard.jsx'));
const GameDevDashboard   = lazy(() => import('./game-dev/GameDevDashboard.jsx'));
const ARVRDashboard      = lazy(() => import('./ar-vr/ARVRDashboard.jsx'));
const AdminDashboard     = lazy(() => import('./admin/AdminDashboard.jsx'));
const ModeratorDashboard = lazy(() => import('./admin/ModeratorDashboard.jsx'));
const DevDashboard       = lazy(() => import('./admin/DevDashboard.jsx'));
const SecurityDashboard  = lazy(() => import('./SecurityDashboard.jsx'));
const AuthSystem         = lazy(() => import('./auth/AuthSystem.jsx').then(m => ({ default: m.LoginForm || m.default })));
const PaymentSystem      = lazy(() => import('./payments/PaymentSystem.jsx').then(m => ({ default: m.PaymentSystemWithProvider || m.default })));

// ─── Route definitions ────────────────────────────────────────────────────────
const ROUTES = {
  // Public routes
  login:     { path: 'login',     label: 'Sign In',        icon: '🔑', public: true },
  register:  { path: 'register',  label: 'Sign Up',        icon: '📝', public: true },

  // User routes
  dashboard: { path: 'dashboard', label: 'Dashboard',      icon: '🏠', roles: ['admin', 'developer', 'moderator', 'user'] },
  analytics: { path: 'analytics', label: 'Analytics',      icon: '📊', roles: ['admin', 'developer', 'moderator', 'user'] },
  gamedev:   { path: 'gamedev',   label: 'Game Dev',       icon: '🎮', roles: ['admin', 'developer', 'user'] },
  arvr:      { path: 'arvr',      label: 'AR/VR',          icon: '🥽', roles: ['admin', 'developer', 'user'] },
  security:  { path: 'security',  label: 'Security',       icon: '🔒', roles: ['admin', 'developer', 'user'] },
  billing:   { path: 'billing',   label: 'Billing',        icon: '💳', roles: ['admin', 'user'] },

  // Admin-only
  admin:     { path: 'admin',     label: 'Admin Panel',    icon: '⚙️', roles: ['admin'] },

  // Moderator+
  moderation: { path: 'moderation', label: 'Moderation',  icon: '🛡️', roles: ['admin', 'moderator'] },

  // Developer+
  devtools:  { path: 'devtools',  label: 'Dev Tools',      icon: '🛠️', roles: ['admin', 'developer'] },
};

// ─── Loading fallback ─────────────────────────────────────────────────────────
function LoadingSpinner({ label = 'Loading…' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 16, color: 'var(--text-muted, #64748b)' }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--border, #2a2d3a)', borderTopColor: 'var(--accent, #60A5FA)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span>{label}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Sidebar Navigation ───────────────────────────────────────────────────────
function Sidebar({ currentRoute, onNavigate, user, onLogout, collapsed, onToggleCollapse }) {
  const accessibleRoutes = Object.entries(ROUTES).filter(([, cfg]) => {
    if (cfg.public) return false;
    if (!cfg.roles) return false;
    return cfg.roles.includes(user?.role || 'user');
  });

  return (
    <nav style={{
      width: collapsed ? 60 : 220,
      transition: 'width 0.2s',
      background: 'var(--sidebar-bg, #12141f)',
      borderRight: '1px solid var(--border, #2a2d3a)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
      flexShrink: 0,
    }}>
      {/* Brand */}
      <div style={{ padding: collapsed ? '16px 10px' : '20px 16px', borderBottom: '1px solid var(--border, #2a2d3a)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed && <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--accent, #60A5FA)' }}>Nexus AI Pro</span>}
        <button onClick={onToggleCollapse} style={{ background: 'none', border: 'none', color: 'var(--text-muted, #64748b)', cursor: 'pointer', fontSize: 16, padding: 4 }}>
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav links */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {accessibleRoutes.map(([id, cfg]) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            title={collapsed ? cfg.label : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : 10,
              width: '100%',
              padding: collapsed ? '12px' : '10px 16px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              border: 'none',
              background: currentRoute === id ? 'var(--accent, #60A5FA)22' : 'transparent',
              color: currentRoute === id ? 'var(--accent, #60A5FA)' : 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: currentRoute === id ? 600 : 400,
              borderLeft: currentRoute === id ? '3px solid var(--accent, #60A5FA)' : '3px solid transparent',
              transition: 'all 0.1s',
            }}
          >
            <span style={{ fontSize: 18 }}>{cfg.icon}</span>
            {!collapsed && <span>{cfg.label}</span>}
          </button>
        ))}
      </div>

      {/* User info & logout */}
      <div style={{ padding: collapsed ? '12px 0' : '12px 16px', borderTop: '1px solid var(--border, #2a2d3a)' }}>
        {!collapsed && user && (
          <div style={{ marginBottom: 8, fontSize: 12, color: 'var(--text-muted, #64748b)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text, #e2e8f0)', fontSize: 13 }}>{user.username || user.email}</div>
            <div style={{ textTransform: 'capitalize', marginTop: 2 }}>{user.role}</div>
          </div>
        )}
        <button onClick={onLogout} title={collapsed ? 'Sign out' : undefined} style={{ width: '100%', padding: '8px', border: '1px solid var(--border, #2a2d3a)', borderRadius: 8, background: 'transparent', color: 'var(--text-muted, #64748b)', cursor: 'pointer', fontSize: collapsed ? 16 : 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          🚪{!collapsed && ' Sign Out'}
        </button>
      </div>
    </nav>
  );
}

// ─── Role-based dashboard landing pages ──────────────────────────────────────
function DashboardHome({ user }) {
  const roleGreetings = {
    admin: { title: 'Admin Dashboard', subtitle: 'System overview and user management', color: '#F87171' },
    developer: { title: 'Developer Console', subtitle: 'API metrics, webhooks, and integrations', color: '#FBBF24' },
    moderator: { title: 'Moderation Center', subtitle: 'Content queue and user reports', color: '#34D399' },
    user: { title: 'Your Dashboard', subtitle: 'Projects, analytics, and tools', color: '#60A5FA' },
  };

  const { title, subtitle, color } = roleGreetings[user?.role] || roleGreetings.user;

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color, marginBottom: 4 }}>{title}</h1>
      <p style={{ color: 'var(--text-muted, #64748b)', marginBottom: 32 }}>{subtitle}</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {[
          { icon: '📊', label: 'Analytics', desc: 'Social media metrics', path: 'analytics', color: '#60A5FA' },
          { icon: '🎮', label: 'Game Dev', desc: 'Project tracking', path: 'gamedev', color: '#A78BFA' },
          { icon: '🥽', label: 'AR/VR', desc: 'XR performance', path: 'arvr', color: '#34D399' },
          { icon: '🔒', label: 'Security', desc: 'Threat monitoring', path: 'security', color: '#F87171' },
          { icon: '💳', label: 'Billing', desc: 'Plans & payments', path: 'billing', color: '#FBBF24' },
        ].map(card => (
          <div key={card.path} style={{ background: 'var(--card-bg, #1a1d27)', border: '1px solid var(--border, #2a2d3a)', borderRadius: 12, padding: 20, cursor: 'pointer' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: card.color }}>{card.label}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted, #64748b)', marginTop: 4 }}>{card.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main App Router ─────────────────────────────────────────────────────────
export default function AppRouter() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nexus_user')); } catch { return null; }
  });
  const [route, setRoute] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Apply global CSS vars
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      :root {
        --bg: #0f1117;
        --card-bg: #1a1d27;
        --sidebar-bg: #12141f;
        --border: #2a2d3a;
        --text: #e2e8f0;
        --text-muted: #64748b;
        --accent: #60A5FA;
      }
      @media (prefers-color-scheme: light) {
        :root:not([data-theme="dark"]) {
          --bg: #f1f5f9;
          --card-bg: #ffffff;
          --sidebar-bg: #f8fafc;
          --border: #e2e8f0;
          --text: #1e293b;
          --text-muted: #64748b;
          --accent: #3b82f6;
        }
      }
      [data-theme="light"] {
        --bg: #f1f5f9; --card-bg: #ffffff; --sidebar-bg: #f8fafc;
        --border: #e2e8f0; --text: #1e293b; --text-muted: #64748b; --accent: #3b82f6;
      }
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg); color: var(--text); font-family: system-ui, -apple-system, sans-serif; }
      button { font-family: inherit; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const handleLogin = (userData, token) => {
    setUser(userData);
    try { localStorage.setItem('nexus_user', JSON.stringify(userData)); } catch {}
    setRoute('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    try { localStorage.removeItem('nexus_user'); } catch {}
    setRoute('login');
  };

  // If not authenticated, show auth screen
  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Suspense fallback={<LoadingSpinner label="Loading auth…" />}>
          <AuthSystem onLogin={handleLogin} />
        </Suspense>
      </div>
    );
  }

  // Render route content
  function renderRoute() {
    switch (route) {
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'gamedev':
        return <GameDevDashboard />;
      case 'arvr':
        return <ARVRDashboard />;
      case 'security':
        return <SecurityDashboard />;
      case 'billing':
        return <PaymentSystem />;
      case 'admin':
        if (!['admin'].includes(user.role)) return <div style={{ padding: 32, color: '#F87171' }}>Access denied. Admin role required.</div>;
        return <AdminDashboard user={user} />;
      case 'moderation':
        if (!['admin', 'moderator'].includes(user.role)) return <div style={{ padding: 32, color: '#F87171' }}>Access denied. Moderator role required.</div>;
        return <ModeratorDashboard user={user} />;
      case 'devtools':
        if (!['admin', 'developer'].includes(user.role)) return <div style={{ padding: 32, color: '#F87171' }}>Access denied. Developer role required.</div>;
        return <DevDashboard user={user} />;
      default:
        return <DashboardHome user={user} />;
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        currentRoute={route}
        onNavigate={setRoute}
        user={user}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(v => !v)}
      />
      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        <Suspense fallback={<LoadingSpinner />}>
          {renderRoute()}
        </Suspense>
      </main>
    </div>
  );
}
