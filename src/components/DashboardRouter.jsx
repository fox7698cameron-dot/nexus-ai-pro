/**
 * DashboardRouter.jsx
 * Nexus AI Pro — Role-Based Dashboard Router
 * Date: 2026-08-27
 * Routes users to the correct dashboard based on their role:
 *   admin     → AdminDashboard
 *   developer → DevDashboard (ProjectTracker + AnalyticsDashboard)
 *   moderator → ModeratorDashboard (AnalyticsDashboard + Security)
 *   user      → UserDashboard (AnalyticsDashboard + ProjectTracker)
 * All routes protected — unauthorized access redirects to AuthSystem
 */

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { LocaleSelector, useI18n } from '../i18n/index.js';

// ── Lazy-loaded dashboard components ─────────────────────────────────────────
const AdminDashboard          = lazy(() => import('./AdminDashboard.jsx'));
const AnalyticsDashboard      = lazy(() => import('./AnalyticsDashboard.jsx'));
const SecurityDashboardEnhanced = lazy(() => import('./SecurityDashboardEnhanced.jsx'));
const ProjectTracker          = lazy(() => import('./ProjectTracker.jsx'));
const SubscriptionCheckout    = lazy(() => import('./SubscriptionCheckout.jsx'));
const AuthSystem              = lazy(() => import('./AuthSystem.jsx'));

// ── Navigation items by role ──────────────────────────────────────────────────
const NAV_BY_ROLE = {
  admin: [
    { key: 'admin',    label: 'Admin',       emoji: '👑' },
    { key: 'analytics',label: 'Analytics',   emoji: '📊' },
    { key: 'security', label: 'Security',    emoji: '🛡' },
    { key: 'projects', label: 'Projects',    emoji: '🚀' },
    { key: 'sub',      label: 'Subscription',emoji: '📦' },
  ],
  developer: [
    { key: 'projects', label: 'Projects',    emoji: '🚀' },
    { key: 'analytics',label: 'Analytics',   emoji: '📊' },
    { key: 'security', label: 'Security',    emoji: '🛡' },
    { key: 'sub',      label: 'Subscription',emoji: '📦' },
  ],
  moderator: [
    { key: 'analytics',label: 'Analytics',   emoji: '📊' },
    { key: 'security', label: 'Security',    emoji: '🛡' },
    { key: 'projects', label: 'Projects',    emoji: '🚀' },
    { key: 'sub',      label: 'Subscription',emoji: '📦' },
  ],
  user: [
    { key: 'analytics',label: 'Analytics',   emoji: '📊' },
    { key: 'projects', label: 'Projects',    emoji: '🚀' },
    { key: 'sub',      label: 'Subscription',emoji: '📦' },
  ],
};

// ── Loading fallback ──────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={styles.loading}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
      <div style={{ color: '#94a3b8' }}>Loading…</div>
    </div>
  );
}

// ── Navigation Sidebar ────────────────────────────────────────────────────────
function Sidebar({ user, navItems, activeKey, onNavigate, onSignOut }) {
  const { t } = useI18n();
  return (
    <div style={styles.sidebar}>
      <div style={styles.logoArea}>
        <span style={{ fontSize: 28 }}>🔮</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#f1f5f9' }}>Nexus AI Pro</span>
      </div>

      <nav style={styles.nav}>
        {navItems.map(item => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            style={{
              ...styles.navItem,
              ...(activeKey === item.key ? styles.navItemActive : {}),
            }}
          >
            <span style={{ fontSize: 18 }}>{item.emoji}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div style={styles.userArea}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Signed in as</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', wordBreak: 'break-all' }}>
          {user?.username || 'User'}
        </div>
        <div style={{ fontSize: 11, color: '#6366f1', marginTop: 2 }}>{user?.role || 'user'}</div>
        <LocaleSelector compact style={{ marginTop: 10 }} />
        <button onClick={onSignOut} style={styles.signOutBtn}>Sign Out</button>
      </div>
    </div>
  );
}

// ── Main Router ───────────────────────────────────────────────────────────────
export default function DashboardRouter() {
  const [user,        setUser]        = useState(null);
  const [activeKey,   setActiveKey]   = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { t } = useI18n();

  // Check for existing session on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('nexus:user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
  }, []);

  const handleAuth = useCallback(data => {
    const role = data?.user?.role || data?.role || 'user';
    const userObj = {
      id:       data?.user?.id || data?.sub || 'anon',
      username: data?.user?.username || data?.username || 'User',
      role,
      email:    data?.user?.email || '',
      token:    data?.token || '',
    };
    setUser(userObj);
    sessionStorage.setItem('nexus:user', JSON.stringify(userObj));
    const nav = NAV_BY_ROLE[role] || NAV_BY_ROLE.user;
    setActiveKey(nav[0]?.key || 'analytics');
  }, []);

  const handleSignOut = useCallback(() => {
    setUser(null);
    setActiveKey(null);
    sessionStorage.removeItem('nexus:user');
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
  }, []);

  // Not authenticated
  if (!user) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <AuthSystem onAuthenticated={handleAuth} />
      </Suspense>
    );
  }

  const role     = user.role || 'user';
  const navItems = NAV_BY_ROLE[role] || NAV_BY_ROLE.user;
  const key      = activeKey || navItems[0]?.key;

  return (
    <div style={styles.appShell}>
      {/* Mobile hamburger */}
      <button
        style={styles.hamburger}
        onClick={() => setSidebarOpen(s => !s)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {sidebarOpen && (
        <Sidebar
          user={user}
          navItems={navItems}
          activeKey={key}
          onNavigate={k => setActiveKey(k)}
          onSignOut={handleSignOut}
        />
      )}

      <main style={{ ...styles.main, marginLeft: sidebarOpen ? 220 : 0 }}>
        <Suspense fallback={<LoadingScreen />}>
          {key === 'admin'    && role === 'admin' && <AdminDashboard />}
          {key === 'analytics'&& <AnalyticsDashboard />}
          {key === 'security' && <SecurityDashboardEnhanced />}
          {key === 'projects' && <ProjectTracker />}
          {key === 'sub'      && <SubscriptionCheckout currentTier={user.tier || 'free'} />}
        </Suspense>
      </main>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#0f172a',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  appShell: {
    display: 'flex',
    minHeight: '100vh',
    background: '#0f172a',
    fontFamily: 'Inter, system-ui, sans-serif',
    position: 'relative',
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: 220,
    background: '#111827',
    borderRight: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    overflowY: 'auto',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 16px',
    borderBottom: '1px solid #1e293b',
  },
  nav: {
    flex: 1,
    padding: '12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.15s',
  },
  navItemActive: {
    background: '#6366f122',
    color: '#818cf8',
    fontWeight: 600,
  },
  userArea: {
    padding: '16px',
    borderTop: '1px solid #1e293b',
  },
  signOutBtn: {
    display: 'block',
    width: '100%',
    marginTop: 10,
    padding: '8px 0',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 13,
  },
  hamburger: {
    position: 'fixed',
    top: 12,
    left: 12,
    zIndex: 200,
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#94a3b8',
    borderRadius: 6,
    padding: '6px 10px',
    cursor: 'pointer',
    fontSize: 16,
    display: 'none', // shown via media query — pure JS for now
  },
  main: {
    flex: 1,
    overflowY: 'auto',
    transition: 'margin-left 0.2s',
  },
};
