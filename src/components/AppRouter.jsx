// src/components/AppRouter.jsx
// Created: 2026-10-18
// Top-level router: auth gate, role-based dashboard routing

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import AuthSystem from './AuthSystem.jsx';
import AnalyticsDashboard from './dashboards/AnalyticsDashboard.jsx';
import SecurityDashboardV2 from './dashboards/SecurityDashboardV2.jsx';
import GameDevDashboard from './dashboards/GameDevDashboard.jsx';
import SubscriptionManager from './SubscriptionManager.jsx';
import AdminDashboard from './dashboards/AdminDashboard.jsx';

// ── Auth context ──────────────────────────────────────────────────────────────
const AuthCtx = createContext(null);
export function useAuth() { return useContext(AuthCtx); }

const TOKEN_KEY = 'nexus:accessToken';
const REFRESH_KEY = 'nexus:refreshToken';
const USER_KEY = 'nexus:user';

// ── Navigation items by role ──────────────────────────────────────────────────
const NAV_ITEMS = {
  admin: [
    { id: 'admin',        label: 'Admin',       icon: '⚙️' },
    { id: 'analytics',    label: 'Analytics',   icon: '📊' },
    { id: 'security',     label: 'Security',    icon: '🛡️' },
    { id: 'gamedev',      label: 'Game Dev',    icon: '🎮' },
    { id: 'subscription', label: 'Billing',     icon: '💳' },
  ],
  dev: [
    { id: 'analytics',    label: 'Analytics',   icon: '📊' },
    { id: 'security',     label: 'Security',    icon: '🛡️' },
    { id: 'gamedev',      label: 'Game Dev',    icon: '🎮' },
    { id: 'subscription', label: 'Billing',     icon: '💳' },
  ],
  moderator: [
    { id: 'analytics',    label: 'Analytics',   icon: '📊' },
    { id: 'security',     label: 'Security',    icon: '🛡️' },
  ],
  user: [
    { id: 'analytics',    label: 'Analytics',   icon: '📊' },
    { id: 'gamedev',      label: 'Projects',    icon: '🎮' },
    { id: 'subscription', label: 'Billing',     icon: '💳' },
  ],
};

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ user, activeView, onNav, onLogout }) {
  const items = NAV_ITEMS[user?.role] || NAV_ITEMS.user;
  return (
    <aside style={sidebarStyles.sidebar}>
      <div style={sidebarStyles.logo}>⚡ Nexus AI Pro</div>
      <div style={sidebarStyles.userCard}>
        <div style={sidebarStyles.avatar}>{(user?.username || 'U')[0].toUpperCase()}</div>
        <div>
          <div style={sidebarStyles.userName}>{user?.username || 'User'}</div>
          <div style={sidebarStyles.userRole}>{user?.role?.toUpperCase()}</div>
        </div>
      </div>
      <nav style={sidebarStyles.nav}>
        {items.map(item => (
          <button
            key={item.id}
            style={{ ...sidebarStyles.navBtn, ...(activeView === item.id ? sidebarStyles.navBtnActive : {}) }}
            onClick={() => onNav(item.id)}
          >
            <span style={sidebarStyles.navIcon}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <button style={sidebarStyles.logoutBtn} onClick={onLogout}>⬅ Sign Out</button>
    </aside>
  );
}

// ── Main app shell ─────────────────────────────────────────────────────────────
function AppShell({ auth }) {
  const [activeView, setActiveView] = useState(() => {
    const role = auth.user?.role;
    return role === 'admin' ? 'admin' : 'analytics';
  });

  const viewMap = {
    admin:        <AdminDashboard token={auth.token} />,
    analytics:    <AnalyticsDashboard token={auth.token} />,
    security:     <SecurityDashboardV2 token={auth.token} />,
    gamedev:      <GameDevDashboard token={auth.token} />,
    subscription: <SubscriptionManager token={auth.token} />,
  };

  return (
    <div style={appStyles.shell}>
      <Sidebar user={auth.user} activeView={activeView} onNav={setActiveView} onLogout={auth.logout} />
      <main style={appStyles.main}>
        {viewMap[activeView] || <div style={{ color: '#94a3b8', padding: 40 }}>View not found</div>}
      </main>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function AppRouter() {
  const [auth, setAuth] = useState(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
      return token && user ? { token, user } : null;
    } catch {
      return null;
    }
  });

  const handleAuthenticated = useCallback((data) => {
    try {
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      if (data.refreshToken) localStorage.setItem(REFRESH_KEY, data.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch {
      // ignore storage errors (private browsing)
    }
    setAuth({ token: data.accessToken, user: data.user });
  }, []);

  const logout = useCallback(() => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {});
      }
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // ignore
    }
    setAuth(null);
  }, []);

  const authCtxValue = auth ? { ...auth, logout } : null;

  return (
    <AuthCtx.Provider value={authCtxValue}>
      {auth ? (
        <AppShell auth={{ ...auth, logout }} />
      ) : (
        <AuthSystem onAuthenticated={handleAuthenticated} />
      )}
    </AuthCtx.Provider>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const sidebarStyles = {
  sidebar: { width: 240, minWidth: 240, background: '#0a1628', borderRight: '1px solid #1e293b', display: 'flex', flexDirection: 'column', padding: '20px 0', minHeight: '100vh' },
  logo: { fontWeight: 800, fontSize: 18, color: '#f8fafc', padding: '0 20px 20px', borderBottom: '1px solid #1e293b' },
  userCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid #1e293b' },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 },
  userName: { fontWeight: 600, color: '#f1f5f9', fontSize: 14 },
  userRole: { fontSize: 11, color: '#6366f1', fontWeight: 700, letterSpacing: 0.5 },
  nav: { flex: 1, padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 4 },
  navBtn: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 500, fontSize: 14, textAlign: 'left', transition: 'background 0.15s, color 0.15s' },
  navBtnActive: { background: '#6366f120', color: '#a5b4fc' },
  navIcon: { fontSize: 16, minWidth: 20 },
  logoutBtn: { margin: '16px 12px 0', padding: '10px 14px', borderRadius: 8, border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontWeight: 500, fontSize: 14, textAlign: 'left' },
};

const appStyles = {
  shell: { display: 'flex', minHeight: '100vh', background: '#0f172a' },
  main: { flex: 1, overflowY: 'auto', overflowX: 'hidden' },
};
